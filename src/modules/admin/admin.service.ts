import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schema/user.schema';
import { Job, JobDocument } from '../jobs/schema/job.schema';
import { Transaction, TransactionDocument } from '../transactions/schema/transaction.schema';
import { TransactionStatus } from '../transactions/schema/transaction.schema';
import { Report, ReportDocument, ReportStatus } from '../reports/schema/report.schema';
import { Profile, ProfileDocument } from '../profile/schema/profile.schema';
import { RoleName } from 'src/common/enums/roles-enums';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Report.name) private readonly reportModel: Model<ReportDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
  ) {}

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  /** Platform-wide statistics shown on the admin dashboard */
  async getDashboardStats() {
    const [
      totalUsers,
      totalJobs,
      activeProviders,
      revenueResult,
      pendingReports,
    ] = await Promise.all([
      this.userModel.countDocuments({ isActive: true }),
      this.jobModel.countDocuments(),
      this.userModel.countDocuments({ roleName: RoleName.Provider, isActive: true }),
      this.transactionModel.aggregate([
        { $match: { status: TransactionStatus.Paid } },
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
      ]),
      this.reportModel.countDocuments({ status: ReportStatus.Pending }),
    ]);

    return {
      totalUsers,
      totalJobs,
      activeProviders,
      totalRevenue: (revenueResult[0]?.total as number | undefined) ?? 0,
      pendingReports,
    };
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  /** Paginated user list with optional filters */
  async getUsers(filters: {
    roleName?: RoleName;
    banned?: boolean;
    emailVerified?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { roleName, banned, emailVerified, search, page = 1, limit = 20 } = filters;

    const query: Record<string, unknown> = {};
    if (roleName) query.roleName = roleName;
    if (banned !== undefined) query.banned = banned;
    if (emailVerified !== undefined) query.emailVerified = emailVerified;
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-password -refreshToken -passwordResetToken -emailVerificationToken')
        .populate({ path: 'profile', select: 'verified' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.userModel.countDocuments(query),
    ]);

    // Flatten profile.verified → isVerified for a clean API response
    const usersWithVerified = users.map((u) => {
      const obj = u.toObject() as Record<string, any>;
      obj.isVerified = obj.profile?.verified ?? false;
      return obj;
    });

    return { users: usersWithVerified, total, page, totalPages: Math.ceil(total / limit) };
  }

  /** Get one user's full details */
  async getUserById(userId: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel
      .findById(userId)
      .select('-password -refreshToken -passwordResetToken -emailVerificationToken')
      .populate('profile');

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Ban or unban a user */
  async setBanStatus(
    userId: string,
    banned: boolean,
    reason?: string,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { banned, ...(banned && reason ? { banReason: reason } : { banReason: null }) },
      { new: true },
    );

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Verify or unverify a provider's profile */
  async setProviderVerified(
    userId: string,
    verified: boolean,
    verificationNotes?: string,
  ): Promise<ProfileDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const profile = await this.profileModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        verified,
        verifiedAt: verified ? new Date() : null,
        verificationType: 'admin',
        ...(verificationNotes ? { verificationNotes } : {}),
      },
      { new: true },
    );

    if (!profile) throw new NotFoundException('Provider profile not found');
    return profile;
  }

  // ─── Jobs ──────────────────────────────────────────────────────────────────

  /** Paginated list of all jobs with optional status filter */
  async getJobs(filters: {
    status?: string;
    flagged?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { status, flagged, page = 1, limit = 20 } = filters;
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (flagged !== undefined) query.flagged = flagged;

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(query)
        .populate('clientId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.jobModel.countDocuments(query),
    ]);

    return { jobs, total, page, totalPages: Math.ceil(total / limit) };
  }

  /** Flag or unflag a job listing */
  async setJobFlagged(jobId: string, flagged: boolean): Promise<JobDocument> {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException('Invalid job ID');
    }

    const job = await this.jobModel.findByIdAndUpdate(
      jobId,
      { flagged },
      { new: true },
    );

    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  /** Permanently remove a job (e.g. policy violation) */
  async deleteJob(jobId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException('Invalid job ID');
    }

    const job = await this.jobModel.findByIdAndDelete(jobId);
    if (!job) throw new NotFoundException('Job not found');
    return { message: 'Job removed successfully' };
  }

  // ─── Transactions ──────────────────────────────────────────────────────────

  /** All transactions with optional status filter */
  async getTransactions(filters: {
    status?: TransactionStatus;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = filters;
    const query = status ? { status } : {};

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(query)
        .populate('providerId', 'name email')
        .populate('clientId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.transactionModel.countDocuments(query),
    ]);

    return { transactions, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  /** All reports with optional status filter */
  async getReports(status?: ReportStatus, page = 1, limit = 20) {
    const query = status ? { status } : {};

    const [reports, total] = await Promise.all([
      this.reportModel
        .find(query)
        .populate('reporterId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.reportModel.countDocuments(query),
    ]);

    return { reports, total, page, totalPages: Math.ceil(total / limit) };
  }

  /** Resolve a report: reviewed | dismissed | actioned */
  async resolveReport(
    reportId: string,
    adminId: string,
    status: ReportStatus.Reviewed | ReportStatus.Dismissed | ReportStatus.Actioned,
    adminNotes?: string,
  ): Promise<ReportDocument> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new BadRequestException('Invalid report ID');
    }

    const report = await this.reportModel.findByIdAndUpdate(
      reportId,
      {
        status,
        adminNotes: adminNotes ?? null,
        resolvedBy: new Types.ObjectId(adminId),
        resolvedAt: new Date(),
      },
      { new: true },
    );

    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}
