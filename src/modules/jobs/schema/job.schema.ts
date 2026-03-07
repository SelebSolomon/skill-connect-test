import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Query, Types } from 'mongoose';
import { Status } from '../enums/status.enum';
import { Milestones } from './milestone.schema';

export type JobDocument = Job & Document;

@Schema({
  timestamps: true,
})
export class Job {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  clientId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  providerId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Service',
    required: true,
  })
  serviceId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title: string;
  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, default: null })
  imageUrl: string;

  @Prop({ type: String, default: null })
  imagePublicId: string;

  @Prop({ type: Number, min: 0 })
  budget: Number;

  @Prop({ type: String })
  jobLocation: string;

  @Prop({
    type: String,
    enum: Status,
    default: Status.open,
  })
  status: Status;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDeleted: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  deleteAt: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  deletedBy: Types.ObjectId;

  @Prop({
    type: [Milestones],
    default: [],
  })
  milestones: Milestones[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: null })
  assignedDate: Date;

  @Prop({ type: String, default: null })
  unassignReason: string;

  @Prop({ type: Date, default: null })
  unassignedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);

JobSchema.pre(/^find/, function (this: Query<unknown, unknown>) {
  this.where({ isDeleted: { $ne: true } });
});

JobSchema.set('toJSON', {
  transform: function (_doc, ret) {
    const obj = ret as unknown as Record<string, any>;

    delete obj.__v;

    return obj;
  },
});
