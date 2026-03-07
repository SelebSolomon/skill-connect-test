import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Location {
  @Prop({ type: String })
  city?: string;

  @Prop({ type: String })
  country?: string;

  @Prop({ type: Number })
  lat?: number;

  @Prop({ type: Number })
  lng?: number;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
