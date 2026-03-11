import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

export enum ReportTargetType {
  User = 'user',
  Job = 'job',
}

export enum ReportReason {
  Spam = 'spam',
  Fraud = 'fraud',
  Harassment = 'harassment',
  Inappropriate = 'inappropriate',
  Other = 'other',
}

export enum ReportStatus {
  Pending = 'pending',
  Reviewed = 'reviewed',
  Dismissed = 'dismissed',
  Actioned = 'actioned',
}

@Schema({ timestamps: true })
export class Report {
  /** The user who submitted the report */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  reporterId: Types.ObjectId;

  /** Whether the report is against a user or a job */
  @Prop({ type: String, enum: ReportTargetType, required: true })
  targetType: ReportTargetType;

  /** The ID of the reported user or job */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  targetId: Types.ObjectId;

  @Prop({ type: String, enum: ReportReason, required: true })
  reason: ReportReason;

  @Prop({ type: String, trim: true, maxlength: 500, default: null })
  description: string | null;

  @Prop({ type: String, enum: ReportStatus, default: ReportStatus.Pending, index: true })
  status: ReportStatus;

  /** Admin notes when resolving the report */
  @Prop({ type: String, trim: true, default: null })
  adminNotes: string | null;

  /** Admin who resolved the report */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  resolvedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  resolvedAt: Date | null;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

/** One user can only report the same target once */
ReportSchema.index({ reporterId: 1, targetId: 1 }, { unique: true });
