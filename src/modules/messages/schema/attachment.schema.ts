import { Prop, Schema } from "@nestjs/mongoose";

@Schema({ _id: false })
export class Attachment {
  @Prop({ required: true })
  url: string;

  @Prop({
    required: true,
    enum: ['image', 'video', 'audio', 'document', 'other'],
  })
  type: string;

  @Prop()
  fileName?: string;

  @Prop()
  size?: number;

  @Prop()
  mimeType?: string;

  @Prop()
  thumbnail?: string;

  @Prop()
  duration?: number;
}