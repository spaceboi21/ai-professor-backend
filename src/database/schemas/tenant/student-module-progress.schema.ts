import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';
import { Module } from './module.schema';

export enum ProgressStatusEnum {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'student_module_progress',
})
export class StudentModuleProgress extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Student.name, required: true, index: true })
  student_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Module.name, required: true, index: true })
  module_id: Types.ObjectId;

  @Prop({ enum: ProgressStatusEnum, default: ProgressStatusEnum.NOT_STARTED, index: true })
  status: ProgressStatusEnum;

  @Prop({ type: Date })
  started_at: Date;

  @Prop({ type: Date })
  completed_at: Date;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progress_percentage: number;

  @Prop({ type: Number, default: 0 })
  chapters_completed: number;

  @Prop({ type: Number, default: 0 })
  total_chapters: number;

  @Prop({ type: Boolean, default: false })
  module_quiz_completed: boolean;

  @Prop({ type: Date })
  last_accessed_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentModuleProgressSchema = SchemaFactory.createForClass(StudentModuleProgress);

// Create compound indexes for better query performance
StudentModuleProgressSchema.index({ student_id: 1, module_id: 1 }, { unique: true });
StudentModuleProgressSchema.index({ student_id: 1, status: 1 });
StudentModuleProgressSchema.index({ module_id: 1, status: 1 });
StudentModuleProgressSchema.index({ progress_percentage: 1 });
StudentModuleProgressSchema.index({ last_accessed_at: 1 }); 