import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Types } from 'mongoose';
import { UserDocument } from 'src/modules/users/schema/user.schema';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'Job', required: true })
  jobId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  revieweeId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ maxlength: 1000 })
  comment?: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Static method for calculating ratings
ReviewSchema.statics.calculateRatings = async function (
  revieweeId: string,
  userModel: Model<UserDocument>,
) {
  const stats = await this.aggregate([
    {
      $match: {
        revieweeId: new Types.ObjectId(revieweeId),
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$revieweeId',
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length === 0) {
    await userModel.findByIdAndUpdate(revieweeId, {
      averageRating: 0,
      totalReviews: 0,
    });
    return;
  }

  await userModel.findByIdAndUpdate(revieweeId, {
    averageRating: stats[0].averageRating,
    totalReviews: stats[0].totalReviews,
  });
};

// Index for faster queries
ReviewSchema.index({ jobId: 1 });
ReviewSchema.index({ revieweeId: 1 });
ReviewSchema.index({ reviewerId: 1 });