import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { Internship } from './internship.schema';
import { WorkflowStepTypeEnum } from 'src/common/constants/internship.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class InternshipWorkflowConfig extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Internship.name, required: true, unique: true, index: true })
  internship_id: Types.ObjectId;

  @Prop({
    type: [{
      step_number: { type: Number, required: true },
      step_type: { type: String, enum: WorkflowStepTypeEnum, required: true },
      step_name: { type: String, required: true },
      is_required: { type: Boolean, default: true },
      order: { type: Number, required: true },
    }],
    default: [],
  })
  workflow_steps: Array<{
    step_number: number;
    step_type: WorkflowStepTypeEnum;
    step_name: string;
    is_required: boolean;
    order: number;
  }>;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  created_by: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const InternshipWorkflowConfigSchema = SchemaFactory.createForClass(InternshipWorkflowConfig);

