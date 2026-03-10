import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Review, ReviewSchema } from './schema/review.schema';
import { JobsModule } from '../jobs/jobs.module';
import { UsersModule } from '../users/users.module';
import { ProfileModule } from '../profile/profile.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
    JobsModule,
    UsersModule,
    ProfileModule,
    NotificationsModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
