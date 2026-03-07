import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RoleName } from 'src/common/enums/roles-enums';

export type ConversationDocument = Conversation & Document;

@Schema({ _id: false })
export class Participant {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(RoleName), required: true })
  role: RoleName;

  @Prop({ type: Date, default: null })
  lastReadAt?: Date;
}

@Schema({ _id: false })
export class LastMessage {
  @Prop({ type: Types.ObjectId, ref: 'Message' })
  messageId: Types.ObjectId;

  @Prop()
  text: string;

  @Prop()
  sentAt: Date;
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: [Participant], required: true })
  participants: Participant[];

  @Prop({ type: Types.ObjectId, ref: 'Job', default: null })
  jobId?: Types.ObjectId;

  @Prop({ type: LastMessage })
  lastMessage?: LastMessage;

  @Prop({ type: Map, of: Number, default: {} })
  unread: Map<string, number>;

  @Prop({ type: Map, of: Boolean, default: {} })
  archived: Map<string, boolean>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes
ConversationSchema.index({ 'participants.userId': 1 });
ConversationSchema.index({ jobId: 1 });

ConversationSchema.index(
  { 'participants.userId': 1 },
  {
    unique: true,
    partialFilterExpression: { jobId: null }, // Only for direct messages
  },
);
