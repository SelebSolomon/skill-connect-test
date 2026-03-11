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

    const job = await this.jobsService.findById(jobId);

    if (job.clientId.toString() !== reviewerId) {
      throw new ForbiddenException('Only the client of this job can leave a review');
    }

    if (!job.providerId || job.providerId.toString() !== revieweeId) {
      throw new ForbiddenException('You can only review the provider assigned to this job');
    }

    if (job.status !== Status.completed) {
      throw new BadRequestException('You can only review a completed job');
    }

    const exists = await this.reviewModel.findOne({ jobId, reviewerId });
    if (exists) {
      throw new ConflictException('You have already reviewed this job');
    }

    const review = await this.reviewModel.create({
      jobId: new Types.ObjectId(jobId),
      reviewerId: new Types.ObjectId(reviewerId),
      revieweeId: new Types.ObjectId(revieweeId),
      rating,
      comment,
    });

    this.recalculateProfileRating(revieweeId).catch(() => null);

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

  async getReviewsByUser(userId: string, page = 1, limit = 20) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const filter = { revieweeId: new Types.ObjectId(userId), isDeleted: false };
    const skip = (page - 1) * limit;

    // Paginated reviews + total count in parallel
    const [reviews, totalReviews] = await Promise.all([
      this.reviewModel
        .find(filter)
        .populate({
          path: 'reviewerId',
          select: 'name',
          populate: { path: 'profile', select: 'photoUrl' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v -isDeleted -deletedAt'),
      this.reviewModel.countDocuments(filter),
    ]);

    // Aggregate rating stats over ALL reviews (not just current page)
    const stats = await this.reviewModel.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$rating' }, count: { $sum: 1 } } },
    ]);

    const ratingStats = stats[0] ?? { total: 0, count: 0 };

    return {
      user,
      numberOfReviews: totalReviews,
      averageRating: ratingStats.count > 0
        ? parseFloat((ratingStats.total / ratingStats.count).toFixed(1))
        : 0,
      reviews,
      page,
      totalPages: Math.ceil(totalReviews / limit),
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

    this.recalculateProfileRating(review.revieweeId.toString()).catch(() => null);

    return { message: 'Review deleted' };
  }

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
