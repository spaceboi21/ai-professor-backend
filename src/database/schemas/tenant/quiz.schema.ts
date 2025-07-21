import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { Module } from './module.schema';
import { Chapter } from './chapter.schema';
import { QuizGroup } from './quiz-group.schema';
import { QuizQuestionTypeEnum } from 'src/common/constants/quiz.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Quiz extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: QuizGroup.name,
    required: true,
    index: true,
  })
  quiz_group_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Module.name, index: true })
  module_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Chapter.name, index: true })
  chapter_id: Types.ObjectId;

  @Prop({ required: true })
  question: string;

  @Prop({ required: true, enum: QuizQuestionTypeEnum })
  type: QuizQuestionTypeEnum;

  @Prop({ required: false, type: [String], default: [] })
  options: string[]; // Array of all the options

  @Prop({ type: [String] })
  answer: string[]; // Array of correct options

  @Prop()
  explanation: string; // Optional explanation for the answer

  @Prop({ type: Number, min: 1 })
  sequence: number; // Order of the question in the quiz group

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);

// Create indexes for better query performance
QuizSchema.index({ quiz_group_id: 1, sequence: 1, deleted_at: 1 });
QuizSchema.index({ module_id: 1 });
QuizSchema.index({ chapter_id: 1 });
QuizSchema.index({ type: 1 });
