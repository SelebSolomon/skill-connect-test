import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, UserSchema } from '../users/schema/user.schema';
import { Job, JobSchema } from '../jobs/schema/job.schema';
import { Transaction, TransactionSchema } from '../transactions/schema/transaction.schema';
import { Report, ReportSchema } from '../reports/schema/report.schema';
import { Profile, ProfileSchema } from '../profile/schema/profile.schema';
import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Job.name, schema: JobSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Report.name, schema: ReportSchema },
      { name: Profile.name, schema: ProfileSchema },
    ]),
    WalletModule,   // provides WalletService for deposit approval
    UsersModule,    // provides UsersService for RolesGuard
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
