import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import * as https from 'https';
import {
  WalletTransaction,
  WalletTransactionDocument,
  WalletTransactionStatus,
  WalletTransactionType,
} from './schema/wallet-transaction.schema';
import { User, UserDocument } from '../users/schema/user.schema';
import { DepositRequestDto } from './dto/deposit-request.dto';

@Injectable()
export class WalletService {
  private readonly paystackSecret: string;

  constructor(
    @InjectModel(WalletTransaction.name)
    private readonly walletTxModel: Model<WalletTransactionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {
    this.paystackSecret = this.configService.get<string>('PAYSTACK_SECRET_KEY') ?? '';
  }

  private paystackRequest<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : undefined;
      const req = https.request(
        {
          hostname: 'api.paystack.co',
          port: 443,
          path,
          method,
          headers: {
            Authorization: `Bearer ${this.paystackSecret}`,
            'Content-Type': 'application/json',
            ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (chunk) => (raw += chunk));
          res.on('end', () => {
            try { resolve(JSON.parse(raw) as T); } catch { reject(new Error('Paystack: invalid JSON')); }
          });
        },
      );
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  /** Get current wallet balance + summary totals */
  async getWallet(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('walletBalance commissionOwed name email');

    if (!user) throw new NotFoundException('User not found');

    const [totalDeposited, totalDeducted] = await Promise.all([
      this.walletTxModel.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(userId),
            type: WalletTransactionType.Deposit,
            status: WalletTransactionStatus.Approved,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.walletTxModel.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(userId),
            type: WalletTransactionType.Deduction,
            status: WalletTransactionStatus.Approved,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      balance: user.walletBalance ?? 0,
      commissionOwed: user.commissionOwed ?? 0,
      totalDeposited: (totalDeposited[0]?.total as number | undefined) ?? 0,
      totalDeducted: (totalDeducted[0]?.total as number | undefined) ?? 0,
    };
  }

  /** Provider submits a deposit request with proof image */
  async requestDeposit(
    userId: string,
    dto: DepositRequestDto,
    proofImageUrl?: string,
    proofImagePublicId?: string,
  ): Promise<WalletTransactionDocument> {
    return this.walletTxModel.create({
      userId: new Types.ObjectId(userId),
      type: WalletTransactionType.Deposit,
      amount: dto.amount,
      note: dto.note ?? null,
      proofImageUrl: proofImageUrl ?? null,
      proofImagePublicId: proofImagePublicId ?? null,
    });
  }

  /** Paginated wallet transaction history for the current user */
  async getHistory(
    userId: string,
    type?: WalletTransactionType,
    page = 1,
    limit = 20,
  ) {
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (type) filter.type = type;

    const [transactions, total] = await Promise.all([
      this.walletTxModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.walletTxModel.countDocuments(filter),
    ]);

    return { transactions, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ─── Paystack deposit ────────────────────────────────────────────────────────

  async initializeDeposit(userId: string, amount: number, callbackUrl: string) {
    if (amount < 100) throw new BadRequestException('Minimum deposit is ₦100');

    const user = await this.userModel.findById(userId).select('email');
    if (!user) throw new NotFoundException('User not found');

    const reference = `deposit_${userId}_${Date.now()}`;

    // Create a pending deposit record first
    const tx = await this.walletTxModel.create({
      userId: new Types.ObjectId(userId),
      type: WalletTransactionType.Deposit,
      amount,
      pendingReference: reference,
      note: 'Paystack deposit',
    });

    const result = await this.paystackRequest<Record<string, unknown>>('POST', '/transaction/initialize', {
      email: user.email,
      amount: Math.round(amount * 100), // kobo
      reference,
      callback_url: callbackUrl,
      metadata: { depositId: (tx as any)._id.toString(), userId },
    });

    if (!result.status) {
      await this.walletTxModel.findByIdAndDelete((tx as any)._id);
      throw new BadRequestException((result.message as string) ?? 'Paystack initialization failed');
    }

    const data = result.data as Record<string, unknown>;
    return { paymentUrl: data.authorization_url as string, reference };
  }

  async verifyDeposit(reference: string) {
    const result = await this.paystackRequest<Record<string, unknown>>(
      'GET',
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );

    const data = result.data as Record<string, unknown> | undefined;
    if (!result.status || data?.status !== 'success') {
      throw new BadRequestException('Payment not successful or not found');
    }

    // Find the pending deposit by reference
    const tx = await this.walletTxModel.findOne({ pendingReference: reference });
    if (!tx) throw new NotFoundException('Deposit record not found');
    if (tx.status === WalletTransactionStatus.Approved) {
      return tx; // Already verified (idempotent)
    }

    tx.status = WalletTransactionStatus.Approved;
    tx.paystackReference = reference;
    tx.pendingReference = null;
    tx.reviewedAt = new Date();
    await tx.save();

    // Credit the wallet
    await this.userModel.findByIdAndUpdate(tx.userId, {
      $inc: { walletBalance: tx.amount },
    });

    return tx;
  }

  // ─── Admin helpers ──────────────────────────────────────────────────────────

  /** Admin approves a pending deposit → credits user's wallet */
  async approveDeposit(depositId: string, adminId: string): Promise<WalletTransactionDocument> {
    const tx = await this.walletTxModel.findOne({
      _id: depositId,
      status: WalletTransactionStatus.Pending,
      type: WalletTransactionType.Deposit,
    });

    if (!tx) throw new NotFoundException('Pending deposit not found');

    tx.status = WalletTransactionStatus.Approved;
    tx.reviewedBy = new Types.ObjectId(adminId);
    tx.reviewedAt = new Date();
    await tx.save();

    await this.userModel.findByIdAndUpdate(tx.userId, {
      $inc: { walletBalance: tx.amount },
    });

    return tx;
  }

  /** Admin rejects a pending deposit */
  async rejectDeposit(
    depositId: string,
    adminId: string,
    note?: string,
  ): Promise<WalletTransactionDocument> {
    if (!Types.ObjectId.isValid(depositId)) {
      throw new BadRequestException('Invalid deposit ID');
    }

    const tx = await this.walletTxModel.findOneAndUpdate(
      { _id: depositId, status: WalletTransactionStatus.Pending },
      {
        status: WalletTransactionStatus.Rejected,
        reviewedBy: new Types.ObjectId(adminId),
        reviewedAt: new Date(),
        note: note ?? null,
      },
      { new: true },
    );

    if (!tx) throw new NotFoundException('Pending deposit not found');
    return tx;
  }

  /** Admin: list all pending deposits */
  async getPendingDeposits(page = 1, limit = 20) {
    const filter = { status: WalletTransactionStatus.Pending, type: WalletTransactionType.Deposit };
    const [deposits, total] = await Promise.all([
      this.walletTxModel
        .find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: 1 })   // oldest first so nothing is missed
        .skip((page - 1) * limit)
        .limit(limit),
      this.walletTxModel.countDocuments(filter),
    ]);
    return { deposits, total, page, totalPages: Math.ceil(total / limit) };
  }
}
