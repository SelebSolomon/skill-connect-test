import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export enum TransactionStatus {
  Pending = 'pending',
  Paid = 'paid',
  Waived = 'waived',
}

export const COMMISSION_RATE = 0.05; // 5%

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'Job', required: true, index: true })
  jobId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  providerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId;

  /** The final price agreed between client and provider */
  @Prop({ type: Number, required: true, min: 0 })
  agreedPrice: number;

  /** Stored for audit trail — e.g. 0.05 */
  @Prop({ type: Number, required: true, default: COMMISSION_RATE })
  commissionRate: number;

  /** agreedPrice * commissionRate (pre-calculated for query performance) */
  @Prop({ type: Number, required: true, min: 0 })
  commissionAmount: number;

  @Prop({
    type: String,
    enum: TransactionStatus,
    default: TransactionStatus.Pending,
    index: true,
  })
  status: TransactionStatus;

  @Prop({ type: Date, default: null })
  paidAt: Date | null;

  /** Who marked it as paid: admin userId, or null for Paystack auto-payment */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  paidBy: Types.ObjectId | null;

  /** Bank transfer reference or Paystack reference */
  @Prop({ type: String, default: null, trim: true })
  paymentReference: string | null;

  /**
   * Paystack reference set when payment is initialized.
   * Cleared once the payment is confirmed or abandoned.
   * Used to prevent double-initialization (idempotency guard).
   */
  @Prop({ type: String, default: null, trim: true })
  pendingReference: string | null;

  @Prop({ type: Date, default: null })
  waivedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  waivedBy: Types.ObjectId | null;

  @Prop({ type: String, default: null, trim: true })
  waivedReason: string | null;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Ensure one transaction per job (can't double-bill)
TransactionSchema.index({ jobId: 1 }, { unique: true });
TransactionSchema.index({ providerId: 1, status: 1 });

TransactionSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.__v;
    return obj;
  },
});
