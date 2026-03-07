import { forwardRef, Module } from '@nestjs/common';
import { BidsService } from './bids.service';
import { BidsController } from './bids.controller';
import { UsersModule } from '../users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Bid, BidSchema } from './schema/bid.schema';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  
  imports: [
    MongooseModule.forFeature([{ name: Bid.name, schema: BidSchema }]),
   forwardRef(() => JobsModule), 
    UsersModule,
  ],
  controllers: [BidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
