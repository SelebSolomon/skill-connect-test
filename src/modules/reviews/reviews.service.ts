import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schema/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JobsService } from '../jobs/jobs.service';
import { UsersService } from '../users/users.service';
import { ProfileService } from '../profile/profile.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/create-notification.dto';
import { Status } from '../jobs/enums/status.enum';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    private readonly jobsService: JobsService,
    private readonly usersService: UsersService,
    private readonly profileService: ProfileService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async postReview(dto: CreateReviewDto, reviewerId: string) {
    const { jobId, revieweeId, rating, comment } = dto;

    // 1. Load job via JobsService — no direct DB query here
    const job = await this.jobsService.findById(jobId);

    // 2. Only the client of that job can write a review
    if (job.clientId.toString() !== reviewerId) {
      throw new ForbiddenException('Only the client of this job can leave a review');
    }

    // 3. The reviewee must be the assigned provider
    if (!job.providerId || job.providerId.toString() !== revieweeId) {
      throw new ForbiddenException('You can only review the provider assigned to this job');
    }

    // 4. Job must be completed
    if (job.status !== Status.completed) {
      throw new BadRequestException('You can only review a completed job');
    }

    // 5. Prevent duplicate review for the same job by the same reviewer
    const exists = await this.reviewModel.findOne({ jobId, reviewerId });
    if (exists) {
      throw new ConflictException('You have already reviewed this job');
    }

    // 6. Create review
    const review = await this.reviewModel.create({
      jobId: new Types.ObjectId(jobId),
      reviewerId: new Types.ObjectId(reviewerId),
      revieweeId: new Types.ObjectId(revieweeId),
      rating,
      comment,
    });

    // 7. Recalculate provider's profile rating (fire-and-forget, never blocks the response)
    this.recalculateProfileRating(revieweeId).catch(() => null);

    // 8. Notify the reviewee via NotificationsService — no direct DB query
    const reviewer = await this.usersService.findOneById(reviewerId);
    await this.notificationsService.send({
      userId: revieweeId,
      type: NotificationType.Review,
      title: 'New Review Received',
      message: `${reviewer?.name ?? 'A client'} left you a ${rating}-star review`,
      link: `/reviews/${review._id}`,
    });

    return review;
  }

  async getReviewsByUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Use UsersService — no direct User model query
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const reviews = await this.reviewModel
      .find({ revieweeId: new Types.ObjectId(userId), isDeleted: false })
      .populate({
        path: 'reviewerId',
        select: 'name',
        populate: { path: 'profile', select: 'photoUrl' },
      })
      .sort({ createdAt: -1 })
      .select('-__v -isDeleted -deletedAt');

    const { total, count } = reviews.reduce(
      (acc, r) => ({ total: acc.total + r.rating, count: acc.count + 1 }),
      { total: 0, count: 0 },
    );

    return {
      user,
      numberOfReviews: count,
      averageRating: count > 0 ? parseFloat((total / count).toFixed(1)) : 0,
      reviews,
    };
  }

  async updateReview(id: string, dto: UpdateReviewDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid review ID');
    }

    const review = await this.reviewModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true, runValidators: true },
    );

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Recalculate rating after admin edit
    this.recalculateProfileRating(review.revieweeId.toString()).catch(() => null);

    return { message: 'Review updated successfully', data: review };
  }

  async deleteReview(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid review ID');
    }

    const review = await this.reviewModel.findById(id);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.isDeleted = true;
    review.deletedAt = new Date();
    await review.save();

    // Recalculate rating after soft-delete
    this.recalculateProfileRating(review.revieweeId.toString()).catch(() => null);

    return { message: 'Review deleted' };
  }

  /**
   * Aggregates non-deleted reviews for a provider and updates their profile rating.
   * Uses ProfileService — no direct Profile model access here.
   */
  private async recalculateProfileRating(revieweeId: string): Promise<void> {
    const stats = await this.reviewModel.aggregate([
      {
        $match: {
          revieweeId: new Types.ObjectId(revieweeId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$revieweeId',
          ratingAvg: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
        },
      },
    ]);

    const ratingAvg =
      stats.length > 0 ? parseFloat(stats[0].ratingAvg.toFixed(1)) : 0;
    const ratingCount = stats.length > 0 ? stats[0].ratingCount : 0;

    await this.profileService.updateProviderRating(revieweeId, ratingAvg, ratingCount);
  }
}
