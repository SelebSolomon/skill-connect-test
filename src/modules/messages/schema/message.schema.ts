import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Attachment } from './attachment.schema';

export type MessageDocument = Message & Document;

export enum MessageType {
  Text = 'text',
  Offer = 'offer',
}

export enum OfferStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Declined = 'declined',
}

@Schema({ _id: false })
export class OfferDetails {
  @Prop({ type: Number, required: true, min: 1 })
  price: number;

  @Prop({ type: String, required: true, trim: true })
  description: string;

  @Prop({ type: Number, required: true, min: 1 })
  deliveryDays: number;

  @Prop({ type: String, required: true })
  serviceId: string;

  @Prop({ type: String, enum: Object.values(OfferStatus), default: OfferStatus.Pending })
  status: OfferStatus;

  @Prop({ type: Types.ObjectId, ref: 'Job', default: null })
  jobId?: Types.ObjectId;
}

export const OfferDetailsSchema = SchemaFactory.createForClass(OfferDetails);

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(MessageType), default: MessageType.Text })
  type: MessageType;

  @Prop({ trim: true, default: null })
  content?: string;

  @Prop({ type: OfferDetailsSchema, default: null })
  offer?: OfferDetails;

  @Prop({ type: [Attachment], default: [] })
  attachments: Attachment[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  readBy: Types.ObjectId[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1, createdAt: 1 });