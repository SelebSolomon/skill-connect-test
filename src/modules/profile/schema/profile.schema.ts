import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Location, LocationSchema } from './location.schema';
import { PortfolioItem, PortfolioItemSchema } from './portfolio.schema';

@Schema({ timestamps: true })
export class Profile {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId: Types.ObjectId;

  @Prop({ trim: true })
  title?: string;

  @Prop({ maxlength: 2000 })
  bio?: string;

  @Prop({ type: LocationSchema })
  location?: Location;

  @Prop({ min: 0 })
  rate?: number;

  @Prop({ type: [String], trim: true })
  skills?: string[];

  @Prop({
    type: [Types.ObjectId],
    ref: 'Service',
  })
  services?: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop()
  photoUrl?: string;

  @Prop()
  photoPublicId?: string;

  @Prop({ type: [PortfolioItemSchema], default: [] })
  portfolio?: PortfolioItem[];

  @Prop({ default: false })
  verified: boolean;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  verificationExpiresAt?: Date;

  @Prop({
    enum: ['manual', 'admin'],
    default: 'admin',
  })
  verificationType: string;

  @Prop({ default: 0 })
  ratingAvg: number;

  @Prop({ default: 0 })
  ratingCount: number;
}

export type ProfileDocument = Profile & Document;

export const ProfileSchema = SchemaFactory.createForClass(Profile);

ProfileSchema.index({ categories: 1, 'location.city': 1 });
ProfileSchema.index({ services: 1 });
ProfileSchema.index({ 'location.coordinates': '2dsphere' });
