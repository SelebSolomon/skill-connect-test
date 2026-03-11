import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Job, JobSchema } from '../jobs/schema/job.schema';
import { Profile, ProfileSchema } from '../profile/schema/profile.schema';
import { Transaction, TransactionSchema } from '../transactions/schema/transaction.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: Profile.name, schema: ProfileSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    UsersModule,  // needed by RolesGuard
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
