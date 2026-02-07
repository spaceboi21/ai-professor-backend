import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';
import { Internship } from './internship.schema';
import { InternshipCase } from './internship-case.schema';
import { StudentCaseSession } from './student-case-session.schema';
import { CaseFeedbackLog } from './case-feedback-log.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'internship_case_attempts',
})
export class InternshipCaseAttempts extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Student.name, required: true, index: true })
  student_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: InternshipCase.name, required: true, index: true })
  case_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Internship.name, required: true, index: true })
  internship_id: Types.ObjectId;

  @Prop({ type: Number, required: true, enum: [1, 2, 3] })
  step: 1 | 2 | 3;

  @Prop({ type: String, default: null })
  patient_base_id: string | null; // For Steps 2-3, identifies same patient across cases

  // Array of all attempts for this case by this student
  @Prop({
    type: [{
      attempt_number: { type: Number, required: true, min: 1 },
      session_id: { type: Types.ObjectId, ref: StudentCaseSession.name, required: true },
      assessment_id: { type: Types.ObjectId, ref: CaseFeedbackLog.name, required: true },
      assessment_score: { type: Number, required: true, min: 0, max: 100 },
      grade: { type: String, required: true }, // A, B, C, D, F
      pass_fail: { type: String, enum: ['PASS', 'FAIL'], required: true },
      pass_threshold: { type: Number, required: true }, // What was the threshold for this attempt
      key_learnings: { type: [String], default: [] },
      mistakes_made: { type: [String], default: [] },
      strengths: { type: [String], default: [] },
      areas_for_improvement: { type: [String], default: [] },
      completed_at: { type: Date, required: true },
    }],
    default: [],
  })
  attempts: Array<{
    attempt_number: number;
    session_id: Types.ObjectId;
    assessment_id: Types.ObjectId;
    assessment_score: number;
    grade: string;
    pass_fail: 'PASS' | 'FAIL';
    pass_threshold: number;
    key_learnings: string[];
    mistakes_made: string[];
    strengths: string[];
    areas_for_improvement: string[];
    completed_at: Date;
  }>;

  @Prop({ type: Number, default: 0 })
  total_attempts: number; // Count of attempts (unlimited)

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  best_score: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  average_score: number;

  @Prop({ 
    type: String, 
    enum: ['not_started', 'in_progress', 'passed', 'needs_retry'], 
    default: 'not_started',
    index: true,
  })
  current_status: 'not_started' | 'in_progress' | 'passed' | 'needs_retry';

  @Prop({ type: Date, default: null })
  first_passed_at: Date | null;

  @Prop({ type: Date, default: null })
  last_attempt_at: Date | null;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const InternshipCaseAttemptsSchema = SchemaFactory.createForClass(
  InternshipCaseAttempts,
);

// Create compound indexes for efficient queries
InternshipCaseAttemptsSchema.index(
  { student_id: 1, case_id: 1 },
  { unique: true }, // One document per student per case
);
InternshipCaseAttemptsSchema.index({ student_id: 1, internship_id: 1 });
InternshipCaseAttemptsSchema.index({ case_id: 1 });
InternshipCaseAttemptsSchema.index({ current_status: 1 });
InternshipCaseAttemptsSchema.index({ patient_base_id: 1, student_id: 1 }); // For Steps 2-3 progression queries
InternshipCaseAttemptsSchema.index({ step: 1, current_status: 1 });
