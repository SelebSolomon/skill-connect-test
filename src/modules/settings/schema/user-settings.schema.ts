import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserSettingsDocument = UserSettings & Document;

@Schema({ timestamps: true })
export class UserSettings {
  /** One settings document per user */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  // ─── Notification preferences ─────────────────────────────────────────────

  @Prop({ type: Boolean, default: true })
  emailNotifications: boolean;

  @Prop({ type: Boolean, default: true })
  pushNotifications: boolean;

  @Prop({ type: Boolean, default: false })
  smsNotifications: boolean;

  // ─── Location preferences ──────────────────────────────────────────────────

  /** Whether the user allows their location to be shown to others */
  @Prop({ type: Boolean, default: false })
  shareLocation: boolean;

  /** Search radius in kilometres for nearby jobs/providers */
  @Prop({ type: Number, default: 50, min: 1, max: 500 })
  locationRadius: number;
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
