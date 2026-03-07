import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BidStatus } from '../enums/bid-status-enum';

export type BidDocument = Bid & Document;
@Schema({ timestamps: true })
export class Bid {
  @Prop({
    type: Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true,
  })
  jobId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  providerId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  clientId: Types.ObjectId;

  @Prop({
    required: true,
    min: 0,
  })
  proposedPrice: number;

  @Prop({
    required: true,
    min: 1,
  })
  estimatedDuration: number; // e.g. days

  @Prop({
    trim: true,
    maxlength: 1000,
  })
  message?: string;

  @Prop({
    enum: BidStatus,
    default: BidStatus.PENDING,
    index: true,
  })
  status: BidStatus;

  // 🔐 Audit & protection fields
  @Prop()
  acceptedAt?: Date;

  @Prop({
    type: Boolean,
    default: false,
  })
  withdrawn: boolean;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  withdrawnAt?: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  actionedBy?: Types.ObjectId; // who accepted/rejected
}

export const BidSchema = SchemaFactory.createForClass(Bid);

BidSchema.index({ jobId: 1, providerId: 1 }, { unique: true });
BidSchema.index({ clientId: 1, status: 1 });
BidSchema.index({ providerId: 1, status: 1 });
