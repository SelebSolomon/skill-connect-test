// service.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ServiceDocument = Service & Document;

@Schema({ timestamps: true })
export class Service {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    index: true,
  })
  name: string;

  @Prop({
    required: true,
    index: true,
  })
  category: string;

  @Prop({ unique: true, lowercase: true })
  slug: string;

  @Prop()
  iconUrl?: string;

  @Prop()
  iconPublicId?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  description?: string;

  @Prop({ default: 0 })
  popularityCount: number; // Track how many providers offer this

  @Prop({ type: [String], default: [] })
  tags: string[]; // For search: ['home', 'repair', 'electrical']
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

ServiceSchema.pre('save', function () {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }
});

ServiceSchema.index({ name: 'text', description: 'text', tags: 'text' });
