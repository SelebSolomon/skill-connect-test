import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { WalletTransaction, WalletTransactionSchema } from './schema/wallet-transaction.schema';
import { User, UserSchema } from '../users/schema/user.schema';
import { UsersModule } from '../users/users.module';
import { CloudinaryModule } from 'src/shared/cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,       // needed by RolesGuard
    CloudinaryModule,  // for proof image uploads
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],  // exported so AdminModule can inject it
})
export class WalletModule {}
