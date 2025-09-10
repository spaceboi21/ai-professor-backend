import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { Module } from './module.schema';
import { Chapter } from './chapter.schema';
import { Bibliography } from './bibliography.schema';
import { QuizGroup } from './quiz-group.schema';
import {
  AnchorTagTypeEnum,
  AnchorTagStatusEnum,
  AnchorTypeEnum,
} from 'src/common/constants/anchor-tag.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'anchor_tags',
})
export class AnchorTag extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Module.name, required: true, index: true })
  module_id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Chapter.name,
    required: true,
    index: true,
  })
  chapter_id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Bibliography.name,
    required: true,
    index: true,
  })
  bibliography_id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: AnchorTagTypeEnum })
  content_type: AnchorTagTypeEnum;

  @Prop()
  content_reference: string; // e.g., "slide-3", "00:02:30", "page-5"

  @Prop({ type: Number })
  timestamp_seconds: number; // For video content

  @Prop({ type: Number })
  page_number: number; // For PDF content

  @Prop({ type: Number })
  slide_number: number; // For slide content

  @Prop({
    required: true,
    enum: AnchorTagStatusEnum,
    default: AnchorTagStatusEnum.ACTIVE,
  })
  status: AnchorTagStatusEnum;

  @Prop({ type: Boolean, required: true, default: false })
  is_mandatory: boolean;

  @Prop({ type: Types.ObjectId, ref: QuizGroup.name, required: false })
  quiz_group_id: Types.ObjectId;

  @Prop({ type: String, required: false })
  ai_chat_question: string;

  @Prop({
    required: true,
    enum: AnchorTypeEnum,
    default: AnchorTypeEnum.QUIZ,
  })
  anchor_type: AnchorTypeEnum;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const AnchorTagSchema = SchemaFactory.createForClass(AnchorTag);

// Create compound indexes for better query performance
AnchorTagSchema.index({ module_id: 1, chapter_id: 1, bibliography_id: 1 });
AnchorTagSchema.index({ bibliography_id: 1, content_type: 1, status: 1 });
AnchorTagSchema.index({ quiz_group_id: 1 });
AnchorTagSchema.index({ created_by: 1, status: 1 });
AnchorTagSchema.index({ content_type: 1, content_reference: 1 });
AnchorTagSchema.index({ anchor_type: 1, status: 1 });

// Create compound index for bibliography_id, title, and deleted_at to ensure unique titles per bibliography
// Only active anchor tags (deleted_at is null) will be considered for uniqueness
// Note: Title uniqueness is enforced case-insensitively in the application layer
AnchorTagSchema.index(
  { bibliography_id: 1, title: 1, deleted_at: 1 },
  { unique: true },
);
AnchorTagSchema.index({ is_mandatory: 1, status: 1 });
