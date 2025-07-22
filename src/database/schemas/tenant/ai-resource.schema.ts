import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ResourceCategoryEnum,
  ResourceTypeEnum,
} from 'src/common/constants/ai-resource.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

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

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ResourceTypeEnum })
  resource_type: ResourceTypeEnum;

  @Prop({ required: true, enum: ResourceCategoryEnum })
  category: ResourceCategoryEnum;

  @Prop({ required: true })
  url: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop({ type: [String], default: [] })
  related_mistakes: string[];

  @Prop({ type: Number, default: 0 })
  duration_minutes: number;

  @Prop({ type: String, default: null })
  author: string;

  @Prop({ type: String, default: null })
  source: string;

  @Prop({ type: Number, default: 0 })
  difficulty_level: number;

  @Prop({ type: Boolean, default: false })
  is_recommended: boolean;

  @Prop({ type: Boolean, default: false })
  is_accessed: boolean;

  @Prop({ type: Date, default: null })
  accessed_at: Date;

  @Prop({ type: Number, default: 0 })
  access_count: number;

  @Prop({ type: Object, default: null })
  resource_metadata: Record<string, any>;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const AIResourceSchema = SchemaFactory.createForClass(AIResource);
