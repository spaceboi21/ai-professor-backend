import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FeedbackTypeEnum } from 'src/common/constants/ai-chat-feedback.constant';
import { RatingObjectType } from 'src/common/types/ai-chat-module.type';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'ai_chat_feedback',
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

  @Prop({ required: true, enum: FeedbackTypeEnum })
  feedback_type: FeedbackTypeEnum;

  @Prop({ type: Object, default: null })
  rating: RatingObjectType;

  @Prop({ type: [String], default: [] })
  keywords_for_learning: string[];

  @Prop({ type: [String], default: [] })
  suggestions: string[];

  @Prop({ type: [String], default: [] })
  missed_opportunities: string[];

  @Prop({ type: [String], default: [] })
  areas_for_improvement: string[];

  @Prop({ type: [String], default: [] })
  strengths: string[];

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const AIChatFeedbackSchema =
  SchemaFactory.createForClass(AIChatFeedback);
