import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job, JobDocument } from '../jobs/schema/job.schema';
import { Status } from '../jobs/enums/status.enum';
import { Profile, ProfileDocument } from '../profile/schema/profile.schema';
import { Transaction, TransactionDocument } from '../transactions/schema/transaction.schema';
import { TransactionStatus } from '../transactions/schema/transaction.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  /** Provider performance dashboard */
  async getProviderStats(providerId: string) {
    const providerObjectId = new Types.ObjectId(providerId);

    const [jobStats, profile, earningsResult] = await Promise.all([
      this.jobModel.aggregate([
        { $match: { providerId: providerObjectId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      this.profileModel
        .findOne({ userId: providerObjectId })
        .select('ratingAvg ratingCount verified'),
      this.transactionModel.aggregate([
        {
          $match: {
            providerId: providerObjectId,
            status: TransactionStatus.Paid,
          },
        },
        { $group: { _id: null, totalEarnings: { $sum: '$agreedPrice' } } },
      ]),
    ]);

    /** Map the aggregation array into a readable object */
    const countByStatus = Object.fromEntries(
      jobStats.map(({ _id, count }: { _id: string; count: number }) => [_id, count]),
    ) as Record<string, number>;

    const totalJobs = Object.values(countByStatus).reduce((a, b) => a + b, 0);
    const completedJobs = countByStatus[Status.completed] ?? 0;
    const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

    return {
      totalJobs,
      completedJobs,
      completionRate,                            // percentage
      activeJobs: countByStatus[Status.open] ?? 0,
      averageRating: profile?.ratingAvg ?? 0,
      totalReviews: profile?.ratingCount ?? 0,
      isVerified: profile?.verified ?? false,
      totalEarnings: (earningsResult[0]?.totalEarnings as number | undefined) ?? 0,
    };
  }

  /** Client activity dashboard */
  async getClientStats(clientId: string) {
    const clientObjectId = new Types.ObjectId(clientId);

    const [jobStats, spendResult] = await Promise.all([
      this.jobModel.aggregate([
        { $match: { clientId: clientObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.transactionModel.aggregate([
        {
          $match: {
            clientId: clientObjectId,
            status: TransactionStatus.Paid,
          },
        },
        { $group: { _id: null, totalSpent: { $sum: '$agreedPrice' } } },
      ]),
    ]);

    const countByStatus = Object.fromEntries(
      jobStats.map(({ _id, count }: { _id: string; count: number }) => [_id, count]),
    ) as Record<string, number>;

    const totalJobsPosted = Object.values(countByStatus).reduce((a, b) => a + b, 0);

    return {
      totalJobsPosted,
      activeJobs: countByStatus[Status.open] ?? 0,
      completedJobs: countByStatus[Status.completed] ?? 0,
      totalSpent: (spendResult[0]?.totalSpent as number | undefined) ?? 0,
    };
  }
}
