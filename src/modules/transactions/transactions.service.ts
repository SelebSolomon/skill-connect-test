import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ClientSession, Model, Types } from 'mongoose';
import * as https from 'https';
import * as crypto from 'crypto';
import {
  Transaction,
  TransactionDocument,
  TransactionStatus,
  COMMISSION_RATE,
} from './schema/transaction.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import {
  WalletTransaction,
  WalletTransactionDocument,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../wallet/schema/wallet-transaction.schema';
import { User, UserDocument } from '../users/schema/user.schema';

@Injectable()
export class TransactionsService implements OnModuleInit {
  private readonly paystackSecret: string;
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly txModel: Model<TransactionDocument>,
    @InjectModel(WalletTransaction.name)
    private readonly walletTxModel: Model<WalletTransactionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {
    this.paystackSecret = this.configService.get<string>('PAYSTACK_SECRET_KEY') ?? '';
  }

  /** Fail fast on startup if the Paystack key is missing */
  onModuleInit() {
    if (!this.paystackSecret) {
      throw new InternalServerErrorException(
        'PAYSTACK_SECRET_KEY is not set. Add it to your .env file.',
      );
    }
  }

  // ─── Paystack helpers ────────────────────────────────────────────────────────

  private paystackRequest<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
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
            try {
              resolve(JSON.parse(raw) as T);
            } catch {
              reject(new Error('Paystack: invalid JSON response'));
            }
          });
        },
      );
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  /**
   * Verify Paystack webhook signature using HMAC-SHA512.
   * Throws UnauthorizedException if the signature doesn't match.
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string): void {
    const hash = crypto
      .createHmac('sha512', this.paystackSecret)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      throw new UnauthorizedException('Invalid Paystack webhook signature');
    }
  }

  /**
   * Handle an incoming Paystack webhook event.
   * Only processes charge.success events.
   */
  async handlePaystackWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    this.verifyWebhookSignature(rawBody, signature);

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    if (event.event !== 'charge.success') {
      return { received: true }; // Acknowledge other events without processing
    }

    const data = event.data as Record<string, unknown> | undefined;
    const reference = data?.reference as string | undefined;
    const status = data?.status as string | undefined;
    const metadata = data?.metadata as Record<string, unknown> | undefined;
    const transactionId = metadata?.transactionId as string | undefined;

    if (!reference || status !== 'success' || !transactionId) {
      this.logger.warn('Paystack webhook: charge.success with missing fields', { reference, status, transactionId });
      return { received: true };
    }

    try {
      await this.markAsPaid(transactionId, null, reference);
    } catch (err) {
      // Already paid is fine — idempotent; other errors are logged
      if (err instanceof BadRequestException && (err.message as string).includes('already')) {
        this.logger.log(`Webhook: commission ${transactionId} already processed`);
      } else {
        this.logger.error(`Webhook: failed to mark ${transactionId} as paid`, err);
      }
    }

    return { received: true };
  }

  async initializePaystackPayment(
    txId: string,
    providerEmail: string,
    callbackUrl: string,
  ): Promise<{ paymentUrl: string; reference: string }> {
    if (!Types.ObjectId.isValid(txId)) throw new BadRequestException('Invalid ID');

    const tx = await this.txModel.findById(txId);
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== TransactionStatus.Pending) {
      throw new BadRequestException(`Commission is already ${tx.status}`);
    }

    // ── Idempotency guard: block double-initialization ────────────────────────
    if (tx.pendingReference) {
      throw new BadRequestException(
        'A payment is already in progress for this commission. Please wait for it to complete or contact support.',
      );
    }

    const reference = `skilllink_${txId}_${Date.now()}`;

    // Atomically claim the reference so concurrent requests can't race
    const claimed = await this.txModel.findOneAndUpdate(
      { _id: txId, status: TransactionStatus.Pending, pendingReference: null },
      { pendingReference: reference },
      { new: true },
    );
    if (!claimed) {
      throw new BadRequestException('A payment is already being initialized. Please try again.');
    }

    try {
      const result = await this.paystackRequest<Record<string, unknown>>('POST', '/transaction/initialize', {
        email: providerEmail,
        amount: Math.round(tx.commissionAmount * 100), // kobo
        reference,
        callback_url: callbackUrl,
        metadata: { transactionId: txId, jobId: tx.jobId?.toString() },
      });

      if (!result.status) {
        // Roll back the pending reference so the user can retry
        await this.txModel.findByIdAndUpdate(txId, { pendingReference: null });
        throw new BadRequestException(
          (result.message as string) ?? 'Paystack: failed to initialize payment',
        );
      }

      const data = result.data as Record<string, unknown>;
      return {
        paymentUrl: data.authorization_url as string,
        reference: data.reference as string,
      };
    } catch (err) {
      // On any unexpected error, clear the pending reference
      await this.txModel.findByIdAndUpdate(txId, { pendingReference: null }).catch(() => null);
      throw err;
    }
  }

  async verifyPaystackPayment(reference: string): Promise<Transaction> {
    const result = await this.paystackRequest<Record<string, unknown>>(
      'GET',
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );

    const data = result.data as Record<string, unknown> | undefined;

    if (!result.status || data?.status !== 'success') {
      throw new BadRequestException('Payment verification failed or not yet successful');
    }

    const metadata = data.metadata as Record<string, unknown> | undefined;
    const txId = metadata?.transactionId as string | undefined;
    if (!txId) throw new BadRequestException('Missing transaction metadata');

    return this.markAsPaid(txId, null, reference);
  }

  // ─── Called internally when a job is marked complete ────────────────────────

  async recordCommission(dto: CreateTransactionDto, session?: ClientSession): Promise<Transaction> {
    const commissionAmount = parseFloat(
      (dto.agreedPrice * COMMISSION_RATE).toFixed(2),
    );
    const [doc] = await this.txModel.create(
      [
        {
          jobId: new Types.ObjectId(dto.jobId),
          providerId: new Types.ObjectId(dto.providerId),
          clientId: new Types.ObjectId(dto.clientId),
          agreedPrice: dto.agreedPrice,
          commissionRate: COMMISSION_RATE,
          commissionAmount,
          status: TransactionStatus.Pending,
        },
      ],
      { session },
    );
    return doc;
  }

  // ─── Provider: their own ledger ─────────────────────────────────────────────

  async getMyTransactions(
    providerId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    totalPages: number;
    balance: { pending: number; paid: number; waived: number };
  }> {
    const filter = { providerId: new Types.ObjectId(providerId) };
    const skip = (page - 1) * limit;

    const [transactions, total, agg] = await Promise.all([
      this.txModel
        .find(filter)
        .populate('jobId', 'title status agreedPrice')
        .populate('clientId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.txModel.countDocuments(filter),
      this.txModel.aggregate([
        { $match: filter },
        { $group: { _id: '$status', total: { $sum: '$commissionAmount' } } },
      ]),
    ]);

    const balance = { pending: 0, paid: 0, waived: 0 };
    for (const row of agg) {
      if (row._id === TransactionStatus.Pending) balance.pending = row.total;
      else if (row._id === TransactionStatus.Paid) balance.paid = row.total;
      else if (row._id === TransactionStatus.Waived) balance.waived = row.total;
    }

    return { transactions, total, page, totalPages: Math.ceil(total / limit), balance };
  }

  // ─── Admin: all transactions ─────────────────────────────────────────────────

  async getAll(
    page = 1,
    limit = 20,
    status?: TransactionStatus,
  ): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.txModel
        .find(filter)
        .populate('jobId', 'title agreedPrice status')
        .populate('providerId', 'name email')
        .populate('clientId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.txModel.countDocuments(filter),
    ]);

    return { transactions, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ─── Admin: platform revenue summary ────────────────────────────────────────

  async getPlatformSummary(): Promise<{
    totalGMV: number;
    totalCommission: number;
    pendingCommission: number;
    paidCommission: number;
    waivedCommission: number;
    jobCount: number;
  }> {
    const [base, byStatus] = await Promise.all([
      this.txModel.aggregate([
        {
          $group: {
            _id: null,
            totalGMV: { $sum: '$agreedPrice' },
            totalCommission: { $sum: '$commissionAmount' },
            jobCount: { $sum: 1 },
          },
        },
      ]),
      this.txModel.aggregate([
        { $group: { _id: '$status', amount: { $sum: '$commissionAmount' } } },
      ]),
    ]);

    const statusMap: Record<string, number> = {};
    for (const row of byStatus) statusMap[row._id as string] = row.amount as number;

    const summary = base[0] ?? { totalGMV: 0, totalCommission: 0, jobCount: 0 };
    return {
      totalGMV: summary.totalGMV as number,
      totalCommission: summary.totalCommission as number,
      pendingCommission: statusMap[TransactionStatus.Pending] ?? 0,
      paidCommission: statusMap[TransactionStatus.Paid] ?? 0,
      waivedCommission: statusMap[TransactionStatus.Waived] ?? 0,
      jobCount: summary.jobCount as number,
    };
  }

  // ─── Mark a transaction as paid ──────────────────────────────────────────────

  async markAsPaid(
    id: string,
    adminId: string | null,
    paymentReference?: string,
  ): Promise<Transaction> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');

    const tx = await this.txModel.findById(id);
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== TransactionStatus.Pending) {
      throw new BadRequestException(`Transaction is already ${tx.status}`);
    }

    tx.status = TransactionStatus.Paid;
    tx.paidAt = new Date();
    tx.paymentReference = paymentReference ?? null;
    tx.pendingReference = null;
    tx.paidBy = adminId && Types.ObjectId.isValid(adminId)
      ? new Types.ObjectId(adminId)
      : null;
    await tx.save();

    // Deduct commission from provider's wallet balance
    await Promise.all([
      this.userModel.findByIdAndUpdate(tx.providerId, {
        $inc: { walletBalance: -tx.commissionAmount },
      }),
      this.walletTxModel.create({
        userId: tx.providerId,
        type: WalletTransactionType.Deduction,
        amount: tx.commissionAmount,
        status: WalletTransactionStatus.Approved,
        note: `Commission deducted for job #${tx.jobId}`,
        reviewedAt: new Date(),
        ...(adminId && Types.ObjectId.isValid(adminId)
          ? { reviewedBy: new Types.ObjectId(adminId) }
          : {}),
      }),
    ]);

    return tx;
  }

  // ─── Admin: waive commission ─────────────────────────────────────────────────

  async waive(
    id: string,
    adminId: string,
    reason?: string,
  ): Promise<Transaction> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');

    const tx = await this.txModel.findById(id);
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== TransactionStatus.Pending) {
      throw new BadRequestException(`Transaction is already ${tx.status}`);
    }

    tx.status = TransactionStatus.Waived;
    tx.waivedAt = new Date();
    tx.waivedBy = new Types.ObjectId(adminId);
    tx.waivedReason = reason ?? null;
    tx.pendingReference = null;
    await tx.save();

    // Log a waived entry in wallet history so the provider sees the debt was forgiven
    await this.walletTxModel.create({
      userId: tx.providerId,
      type: WalletTransactionType.Deduction,
      amount: 0,
      status: WalletTransactionStatus.Approved,
      note: `Commission waived for job #${tx.jobId}${reason ? `: ${reason}` : ''}`,
      reviewedBy: new Types.ObjectId(adminId),
      reviewedAt: new Date(),
    });

    return tx;
  }
}
