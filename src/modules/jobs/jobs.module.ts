import { forwardRef, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from './schema/job.schema';
import { UsersModule } from '../users/users.module';
import { CloudinaryService } from 'src/shared/cloudinary/cloudinary.service';
import { ServicesModule } from '../services/services.module';
import { BidsModule } from '../bids/bids.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    UsersModule,
    ServicesModule,
    forwardRef(() => BidsModule),
    NotificationsModule,
    ProfileModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, CloudinaryService],
  exports: [JobsService],
})
export class JobsModule {}
