import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';
import { Internship } from './internship.schema';
import { ProgressStatusEnum } from 'src/common/constants/status.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'student_internship_progress',
})
export class StudentInternshipProgress extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Student.name,
    required: true,
    index: true,
  })
  student_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Internship.name, required: true, index: true })
  internship_id: Types.ObjectId;

  @Prop({
    enum: ProgressStatusEnum,
    default: ProgressStatusEnum.NOT_STARTED,
  })
  status: ProgressStatusEnum;

  @Prop({ type: Date })
  started_at: Date;

  @Prop({ type: Date })
  completed_at: Date;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progress_percentage: number;

  @Prop({ type: Number, default: 0 })
  cases_completed: number;

  @Prop({ type: Number, default: 0 })
  total_cases: number;

  @Prop({ type: Types.ObjectId, default: null })
  current_case_id: Types.ObjectId;

  @Prop({ type: Date })
  last_accessed_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentInternshipProgressSchema = SchemaFactory.createForClass(
  StudentInternshipProgress,
);

// Create compound indexes for better query performance
StudentInternshipProgressSchema.index(
  { student_id: 1, internship_id: 1 },
  { unique: true },
);
StudentInternshipProgressSchema.index({ student_id: 1, status: 1 });
StudentInternshipProgressSchema.index({ internship_id: 1, status: 1 });
StudentInternshipProgressSchema.index({ progress_percentage: 1 });
StudentInternshipProgressSchema.index({ last_accessed_at: 1 });

