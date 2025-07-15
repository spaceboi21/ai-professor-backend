import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';
import { Module } from './module.schema';
import { Chapter } from './chapter.schema';
import { ProgressStatusEnum } from './student-module-progress.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'student_chapter_progress',
})
export class StudentChapterProgress extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Student.name, required: true, index: true })
  student_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Module.name, required: true, index: true })
  module_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Chapter.name, required: true, index: true })
  chapter_id: Types.ObjectId;

  @Prop({ enum: ProgressStatusEnum, default: ProgressStatusEnum.NOT_STARTED, index: true })
  status: ProgressStatusEnum;

  @Prop({ type: Date })
  started_at: Date;

  @Prop({ type: Date })
  completed_at: Date;

  @Prop({ type: Boolean, default: false })
  chapter_quiz_completed: boolean;

  @Prop({ type: Date })
  quiz_completed_at: Date;

  @Prop({ type: Number })
  chapter_sequence: number;

  @Prop({ type: Date })
  last_accessed_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentChapterProgressSchema = SchemaFactory.createForClass(StudentChapterProgress);

// Create compound indexes for better query performance
StudentChapterProgressSchema.index({ student_id: 1, chapter_id: 1 }, { unique: true });
StudentChapterProgressSchema.index({ student_id: 1, module_id: 1 });
StudentChapterProgressSchema.index({ student_id: 1, module_id: 1, chapter_sequence: 1 });
StudentChapterProgressSchema.index({ student_id: 1, status: 1 });
StudentChapterProgressSchema.index({ chapter_id: 1, status: 1 });
StudentChapterProgressSchema.index({ module_id: 1, status: 1 });
StudentChapterProgressSchema.index({ chapter_quiz_completed: 1 });
StudentChapterProgressSchema.index({ last_accessed_at: 1 }); 