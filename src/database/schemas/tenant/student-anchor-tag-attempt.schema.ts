import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';
import { Module } from './module.schema';
import { Chapter } from './chapter.schema';
import { Bibliography } from './bibliography.schema';
import { AnchorTag } from './anchor-tag.schema';
import { Quiz } from './quiz.schema';
import { AnchorTagAttemptStatusEnum } from 'src/common/constants/anchor-tag.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'student_anchor_tag_attempts',
})
export class StudentAnchorTagAttempt extends Document {
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
    ref: Module.name,
    required: true,
    index: true,
  })
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

  @Prop({
    type: Types.ObjectId,
    ref: AnchorTag.name,
    required: true,
    index: true,
  })
  anchor_tag_id: Types.ObjectId;

  @Prop({
    enum: AnchorTagAttemptStatusEnum,
    default: AnchorTagAttemptStatusEnum.NOT_STARTED,
  })
  status: AnchorTagAttemptStatusEnum;

  @Prop({ type: Date, default: Date.now })
  started_at: Date;

  @Prop({ type: Date })
  completed_at: Date;

  @Prop({ type: Date })
  skipped_at: Date;

  @Prop({ type: Number, default: 0 })
  time_spent_seconds: number;

  @Prop({ type: Boolean, default: false })
  is_correct: boolean;

  @Prop({ type: Number, default: 0 })
  score_percentage: number;

  @Prop({ type: Number, default: 1 })
  attempt_number: number;

  // Store the quiz attempt details
  @Prop({
    type: {
      quiz_id: { type: Types.ObjectId, ref: Quiz.name, required: true },
      selected_answers: [String],
      time_spent_seconds: Number,
      is_correct: Boolean,
      score_percentage: Number,
    },
    default: null,
  })
  quiz_attempt: {
    quiz_id: Types.ObjectId;
    selected_answers: string[];
    time_spent_seconds: number;
    is_correct: boolean;
    score_percentage: number;
  };

  // Store student's text response for text-based questions
  @Prop({ type: String })
  text_response: string;

  // Store AI verification result if applicable
  @Prop({ type: Object, default: null })
  ai_verification_result: any;

  // Store metadata about the interaction
  @Prop({ type: Object, default: {} })
  interaction_metadata: Record<string, any>;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentAnchorTagAttemptSchema = SchemaFactory.createForClass(
  StudentAnchorTagAttempt,
);

// Create compound indexes for better query performance
StudentAnchorTagAttemptSchema.index({ student_id: 1, anchor_tag_id: 1 });
StudentAnchorTagAttemptSchema.index(
  { student_id: 1, anchor_tag_id: 1, attempt_number: 1 },
  { unique: true },
);
StudentAnchorTagAttemptSchema.index({ student_id: 1, module_id: 1 });
StudentAnchorTagAttemptSchema.index({ student_id: 1, chapter_id: 1 });
StudentAnchorTagAttemptSchema.index({ student_id: 1, bibliography_id: 1 });
StudentAnchorTagAttemptSchema.index({ student_id: 1, status: 1 });
StudentAnchorTagAttemptSchema.index({ anchor_tag_id: 1, status: 1 });
StudentAnchorTagAttemptSchema.index({ bibliography_id: 1, status: 1 });
StudentAnchorTagAttemptSchema.index({ started_at: 1 });
StudentAnchorTagAttemptSchema.index({ completed_at: 1 });
StudentAnchorTagAttemptSchema.index({ is_correct: 1 });
