import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ResourceCategoryEnum,
  ResourceTypeEnum,
} from 'src/common/constants/ai-resource.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { AIChatFeedback } from './ai-chat-feedback.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'ai_resource',
})
export class AIResource extends Document {
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

  @Prop({ type: [Object], default: [] })
  resources: Object[];

  @Prop({ type: String, default: '' })
  recommendations: string;

  @Prop({ type: Number, default: 0 })
  total_found: number;

  @Prop({ type: Boolean, default: false })
  knowledge_available: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: AIChatFeedback.name,
    required: true,
    index: true,
  })
  supervisor_feedback_id: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const AIResourceSchema = SchemaFactory.createForClass(AIResource);
