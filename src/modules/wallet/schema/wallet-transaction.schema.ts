import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletTransactionDocument = WalletTransaction & Document;

export enum WalletTransactionType {
  Deposit = 'deposit',
  Deduction = 'deduction',
  Refund = 'refund',
}

export enum WalletTransactionStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

@Schema({ timestamps: true })
export class WalletTransaction {
  /** Owner of this wallet transaction */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: WalletTransactionType, required: true })
  type: WalletTransactionType;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String, enum: WalletTransactionStatus, default: WalletTransactionStatus.Pending, index: true })
  status: WalletTransactionStatus;

  /** Cloudinary URL of the payment proof screenshot (for deposits) */
  @Prop({ type: String, default: null })
  proofImageUrl: string | null;

  /** Cloudinary public_id for deletion if deposit is rejected */
  @Prop({ type: String, default: null })
  proofImagePublicId: string | null;

  /** Human-readable note e.g. "Commission for job #xyz" */
  @Prop({ type: String, trim: true, default: null })
  note: string | null;

  /** Admin who approved or rejected this deposit */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt: Date | null;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);

WalletTransactionSchema.index({ userId: 1, status: 1 });
WalletTransactionSchema.index({ userId: 1, type: 1 });
