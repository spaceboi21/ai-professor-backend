import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';
import { Module } from './module.schema';
import { Chapter } from './chapter.schema';
import { QuizGroup } from './quiz-group.schema';
import { Quiz } from './quiz.schema';
import { AttemptStatusEnum } from 'src/common/constants/status.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'student_quiz_attempts',
})
export class StudentQuizAttempt extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Student.name,
    required: true,
    index: true,
  })
  student_id: Types.ObjectId;

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

  @Prop({
    enum: AttemptStatusEnum,
    default: AttemptStatusEnum.IN_PROGRESS,
    index: true,
  })
  status: AttemptStatusEnum;

  @Prop({ type: Date, default: Date.now })
  started_at: Date;

  @Prop({ type: Date })
  completed_at: Date;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  score_percentage: number;

  @Prop({ type: Number, default: 0 })
  correct_answers: number;

  @Prop({ type: Number, default: 0 })
  total_questions: number;

  @Prop({ type: Number, default: 0 })
  time_taken_minutes: number;

  @Prop({ type: Boolean, default: false })
  is_passed: boolean;

  @Prop({ type: Number, default: 60 })
  passing_threshold: number;

  @Prop({ type: Number, default: 1 })
  attempt_number: number;

  // Store individual question answers
  @Prop({
    type: [
      {
        quiz_id: { type: Types.ObjectId, ref: Quiz.name, required: true },
        selected_answers: [String],
        is_correct: Boolean,
        time_spent_seconds: Number,
      },
    ],
    default: [],
  })
  answers: Array<{
    quiz_id: Types.ObjectId;
    selected_answers: string[];
    is_correct: boolean;
    time_spent_seconds: number;
  }>;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentQuizAttemptSchema =
  SchemaFactory.createForClass(StudentQuizAttempt);

// Create compound indexes for better query performance
StudentQuizAttemptSchema.index({ student_id: 1, quiz_group_id: 1 });
StudentQuizAttemptSchema.index(
  { student_id: 1, quiz_group_id: 1, attempt_number: 1 },
  { unique: true },
);
StudentQuizAttemptSchema.index({ student_id: 1, module_id: 1 });
StudentQuizAttemptSchema.index({ student_id: 1, chapter_id: 1 });
StudentQuizAttemptSchema.index({ student_id: 1, status: 1 });
StudentQuizAttemptSchema.index({ quiz_group_id: 1, status: 1 });
StudentQuizAttemptSchema.index({ score_percentage: 1 });
StudentQuizAttemptSchema.index({ is_passed: 1 });
StudentQuizAttemptSchema.index({ started_at: 1 });
StudentQuizAttemptSchema.index({ completed_at: 1 });
