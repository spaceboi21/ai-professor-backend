import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  FeedbackTypeEnum,
  RatingEnum,
} from 'src/common/constants/ai-chat-feedback.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class AIChatFeedback extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'AIChatSession',
    required: true,
    index: true,
  })
  session_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Module', required: true, index: true })
  module_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  student_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({ required: true, enum: FeedbackTypeEnum })
  feedback_type: FeedbackTypeEnum;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Number, enum: RatingEnum, default: null })
  rating: RatingEnum;

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop({ type: [String], default: [] })
  mistakes: string[];

  @Prop({ type: [String], default: [] })
  strengths: string[];

  @Prop({ type: [String], default: [] })
  areas_for_improvement: string[];

  @Prop({ type: Object, default: null })
  analysis_data: Record<string, any>;

  @Prop({ type: Object, default: null })
  feedback_metadata: Record<string, any>;

  @Prop({ type: Boolean, default: false })
  is_processed: boolean;

  @Prop({ type: Date, default: null })
  processed_at: Date;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const AIChatFeedbackSchema =
  SchemaFactory.createForClass(AIChatFeedback);
