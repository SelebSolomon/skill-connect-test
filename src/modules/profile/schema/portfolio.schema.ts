import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class PortfolioItem {
  @Prop()
  title?: string;

  @Prop()
  description?: string;

  @Prop()
  imageUrl?: string;

  @Prop()
  publicId?: string; // for Cloudinary deletion

  @Prop()
  link?: string;
}

export const PortfolioItemSchema =
  SchemaFactory.createForClass(PortfolioItem);
