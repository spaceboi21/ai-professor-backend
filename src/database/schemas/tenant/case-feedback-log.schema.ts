import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';
import { InternshipCase } from './internship-case.schema';
import { StudentCaseSession } from './student-case-session.schema';
import { User } from '../central/user.schema';
import { FeedbackTypeEnum, FeedbackStatusEnum } from 'src/common/constants/internship.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class CaseFeedbackLog extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Student.name, required: true, index: true })
  student_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: InternshipCase.name, required: true, index: true })
  case_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: StudentCaseSession.name, required: true, index: true })
  session_id: Types.ObjectId;

  @Prop({
    required: true,
    enum: Object.values(FeedbackTypeEnum),
    default: FeedbackTypeEnum.AUTO_GENERATED,
  })
  feedback_type: FeedbackTypeEnum;

  // Auto-generated feedback from AI (ENHANCED for session-end comprehensive assessment)
  @Prop({
    type: {
      overall_score: { type: Number, default: 0, min: 0, max: 100 },
      grade: { type: String, default: 'F' }, // NEW: A, B, C, D, F
      pass_fail: { type: String, enum: ['PASS', 'FAIL'], default: 'FAIL' }, // NEW
      pass_threshold: { type: Number, default: 70 }, // NEW: what threshold was used
      
      // NEW: Detailed criteria breakdown
      criteria_scores: {
        type: [{
          criterion_id: { type: String, required: true },
          criterion_name: { type: String, required: true },
          points_earned: { type: Number, required: true },
          points_max: { type: Number, required: true },
          percentage: { type: Number, required: true },
          feedback: { type: String, required: true },
          evidence_from_conversation: { type: [String], default: [] },
        }],
        default: [],
      },
      
      strengths: { type: [String], default: [] },
      areas_for_improvement: { type: [String], default: [] },
      recommendations_next_session: { type: [String], default: [] }, // NEW
      evolution_vs_previous_attempts: { type: String, default: null }, // NEW
      literature_adherence: { type: Object, default: {} }, // NEW: per-reference feedback
      
      // OLD: Keep for backward compatibility
      technical_assessment: { type: Object, default: {} },
      communication_assessment: { type: Object, default: {} },
      clinical_reasoning: { type: Object, default: {} },
      
      generated_at: { type: Date, default: () => new Date() },
    },
    default: {},
  })
  ai_feedback: {
    overall_score: number;
    grade: string;
    pass_fail: 'PASS' | 'FAIL';
    pass_threshold: number;
    criteria_scores: Array<{
      criterion_id: string;
      criterion_name: string;
      points_earned: number;
      points_max: number;
      percentage: number;
      feedback: string;
      evidence_from_conversation: string[];
    }>;
    strengths: string[];
    areas_for_improvement: string[];
    recommendations_next_session: string[];
    evolution_vs_previous_attempts: string | null;
    literature_adherence: Record<string, any>;
    technical_assessment: Record<string, any>;
    communication_assessment: Record<string, any>;
    clinical_reasoning: Record<string, any>;
    generated_at: Date;
  };

  // Professor validation/edits
  @Prop({
    type: {
      validated_by: { type: Types.ObjectId, ref: User.name, default: null },
      is_approved: { type: Boolean, default: false },
      professor_comments: { type: String, default: null },
      edited_score: { type: Number, default: null, min: 0, max: 100 },
      validation_date: { type: Date, default: null },
    },
    default: {},
  })
  professor_feedback: {
    validated_by: Types.ObjectId;
    is_approved: boolean;
    professor_comments: string | null;
    edited_score: number | null;
    validation_date: Date | null;
  };

  @Prop({
    enum: Object.values(FeedbackStatusEnum),
    default: FeedbackStatusEnum.PENDING_VALIDATION,
  })
  status: FeedbackStatusEnum;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const CaseFeedbackLogSchema = SchemaFactory.createForClass(CaseFeedbackLog);

// Create indexes for better query performance
CaseFeedbackLogSchema.index({ student_id: 1, status: 1 });
CaseFeedbackLogSchema.index({ case_id: 1, student_id: 1 });
CaseFeedbackLogSchema.index({ status: 1 });
CaseFeedbackLogSchema.index({ 'professor_feedback.validated_by': 1 });

