import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { Module } from './module.schema';
import { Chapter } from './chapter.schema';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';
import {
  QuizTypeEnum,
} from 'src/common/constants/quiz.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'quiz_group',
})
export class QuizGroup extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: DifficultyEnum })
  difficulty: DifficultyEnum;

  @Prop({ required: true, type: Number, min: 1 })
  time_left: number; // in minutes

  @Prop({ required: true })
  category: string;

  @Prop({ type: Types.ObjectId, ref: Module.name, index: true })
  module_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Chapter.name, index: true })
  chapter_id: Types.ObjectId;

  @Prop({ required: true, enum: QuizTypeEnum })
  type: QuizTypeEnum;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const QuizGroupSchema = SchemaFactory.createForClass(QuizGroup);

// Create indexes for better query performance
QuizGroupSchema.index({ module_id: 1, type: 1 });
QuizGroupSchema.index({ chapter_id: 1, type: 1 });
QuizGroupSchema.index({ category: 1 });
QuizGroupSchema.index({ difficulty: 1 });

// Additional indexes for aggregation optimization
QuizGroupSchema.index({ chapter_id: 1, deleted_at: 1 });
