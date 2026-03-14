import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { MilestoneStatus } from '../enums/milestone-status.enum';

@Schema({ _id: true })
export class Milestones {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: Number, min: 0 })
  amount: number;

  @Prop({ enum: MilestoneStatus, default: MilestoneStatus.pending })
  status: MilestoneStatus;
}
