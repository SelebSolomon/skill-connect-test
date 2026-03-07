import { Prop, Schema } from '@nestjs/mongoose';
import { MilestoneStatus } from '../enums/milestone-status.';

@Schema({ _id: false })
export class Milestones {
  @Prop({ type: String })
  title: string;

  @Prop({ type: Number })
  amount: number;

  @Prop({ enum: MilestoneStatus, default: MilestoneStatus.pending })
  status: MilestoneStatus;

}
