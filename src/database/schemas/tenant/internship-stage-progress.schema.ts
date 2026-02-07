import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';
import { Internship } from './internship.schema';
import { InternshipCase } from './internship-case.schema';

export enum StageStatusEnum {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VALIDATED = 'VALIDATED',
  NEEDS_REVISION = 'NEEDS_REVISION',
}

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'internship_stage_progress',
})
export class InternshipStageProgress extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Student.name, required: true, index: true })
  student_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Internship.name, required: true, index: true })
  internship_id: Types.ObjectId;

  // Stage 1: Initial Assessment & Safe Place
  @Prop({
    type: {
      status: { type: String, enum: Object.values(StageStatusEnum), default: StageStatusEnum.NOT_STARTED },
      started_at: { type: Date, default: null },
      completed_at: { type: Date, default: null },
      validated_at: { type: Date, default: null },
      score: { type: Number, default: null, min: 0, max: 100 },
      sessions_count: { type: Number, default: 0 },
      case_id: { type: Types.ObjectId, ref: InternshipCase.name, default: null },
      metrics: {
        type: {
          rapport_building: { type: Number, default: null, min: 0, max: 10 },
          safe_place_installation: { type: Number, default: null, min: 0, max: 10 },
          patient_engagement: { type: Number, default: null, min: 0, max: 10 },
          communication_clarity: { type: Number, default: null, min: 0, max: 10 },
        },
        default: {},
      },
      validation_notes: { type: String, default: null },
      needs_improvement_areas: { type: [String], default: [] },
    },
    default: {
      status: StageStatusEnum.NOT_STARTED,
      sessions_count: 0,
      metrics: {},
      needs_improvement_areas: [],
    },
  })
  stage_1: {
    status: StageStatusEnum;
    started_at: Date | null;
    completed_at: Date | null;
    validated_at: Date | null;
    score: number | null;
    sessions_count: number;
    case_id: Types.ObjectId | null;
    metrics: {
      rapport_building: number | null;
      safe_place_installation: number | null;
      patient_engagement: number | null;
      communication_clarity: number | null;
    };
    validation_notes: string | null;
    needs_improvement_areas: string[];
  };

  // Stage 2: Trauma Processing & Bilateral Stimulation
  @Prop({
    type: {
      status: { type: String, enum: Object.values(StageStatusEnum), default: StageStatusEnum.NOT_STARTED },
      started_at: { type: Date, default: null },
      completed_at: { type: Date, default: null },
      validated_at: { type: Date, default: null },
      score: { type: Number, default: null, min: 0, max: 100 },
      sessions_count: { type: Number, default: 0 },
      case_id: { type: Types.ObjectId, ref: InternshipCase.name, default: null },
      metrics: {
        type: {
          trauma_target_identification: { type: Number, default: null, min: 0, max: 10 },
          bilateral_stimulation_technique: { type: Number, default: null, min: 0, max: 10 },
          sud_tracking: { type: Number, default: null, min: 0, max: 10 },
          pacing_and_timing: { type: Number, default: null, min: 0, max: 10 },
          initial_sud: { type: Number, default: null, min: 0, max: 10 },
          final_sud: { type: Number, default: null, min: 0, max: 10 },
        },
        default: {},
      },
      validation_notes: { type: String, default: null },
      needs_improvement_areas: { type: [String], default: [] },
    },
    default: {
      status: StageStatusEnum.NOT_STARTED,
      sessions_count: 0,
      metrics: {},
      needs_improvement_areas: [],
    },
  })
  stage_2: {
    status: StageStatusEnum;
    started_at: Date | null;
    completed_at: Date | null;
    validated_at: Date | null;
    score: number | null;
    sessions_count: number;
    case_id: Types.ObjectId | null;
    metrics: {
      trauma_target_identification: number | null;
      bilateral_stimulation_technique: number | null;
      sud_tracking: number | null;
      pacing_and_timing: number | null;
      initial_sud: number | null;
      final_sud: number | null;
    };
    validation_notes: string | null;
    needs_improvement_areas: string[];
  };

  // Stage 3: Integration & Closure
  @Prop({
    type: {
      status: { type: String, enum: Object.values(StageStatusEnum), default: StageStatusEnum.NOT_STARTED },
      started_at: { type: Date, default: null },
      completed_at: { type: Date, default: null },
      validated_at: { type: Date, default: null },
      score: { type: Number, default: null, min: 0, max: 100 },
      sessions_count: { type: Number, default: 0 },
      case_id: { type: Types.ObjectId, ref: InternshipCase.name, default: null },
      metrics: {
        type: {
          voc_assessment: { type: Number, default: null, min: 0, max: 10 },
          closure_technique: { type: Number, default: null, min: 0, max: 10 },
          future_template: { type: Number, default: null, min: 0, max: 10 },
          integration_quality: { type: Number, default: null, min: 0, max: 10 },
          initial_voc: { type: Number, default: null, min: 1, max: 7 },
          final_voc: { type: Number, default: null, min: 1, max: 7 },
        },
        default: {},
      },
      validation_notes: { type: String, default: null },
      needs_improvement_areas: { type: [String], default: [] },
    },
    default: {
      status: StageStatusEnum.NOT_STARTED,
      sessions_count: 0,
      metrics: {},
      needs_improvement_areas: [],
    },
  })
  stage_3: {
    status: StageStatusEnum;
    started_at: Date | null;
    completed_at: Date | null;
    validated_at: Date | null;
    score: number | null;
    sessions_count: number;
    case_id: Types.ObjectId | null;
    metrics: {
      voc_assessment: number | null;
      closure_technique: number | null;
      future_template: number | null;
      integration_quality: number | null;
      initial_voc: number | null;
      final_voc: number | null;
    };
    validation_notes: string | null;
    needs_improvement_areas: string[];
  };

  // Overall progress
  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  overall_progress_percentage: number;

  @Prop({ type: Number, default: 0 })
  total_sessions: number;

  @Prop({ type: Number, default: null, min: 0, max: 100 })
  overall_score: number | null;

  @Prop({ type: Boolean, default: false })
  all_stages_completed: boolean;

  @Prop({ type: Date, default: null })
  internship_completed_at: Date | null;

  // Configuration thresholds (can be set per student or use defaults)
  @Prop({
    type: {
      minimum_score_to_pass: { type: Number, default: 60 },
      minimum_sessions_per_stage: { type: Number, default: 1 },
      require_professor_validation: { type: Boolean, default: true },
    },
    default: {
      minimum_score_to_pass: 60,
      minimum_sessions_per_stage: 1,
      require_professor_validation: true,
    },
  })
  thresholds: {
    minimum_score_to_pass: number;
    minimum_sessions_per_stage: number;
    require_professor_validation: boolean;
  };

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const InternshipStageProgressSchema = SchemaFactory.createForClass(
  InternshipStageProgress,
);

// Create compound indexes
InternshipStageProgressSchema.index(
  { student_id: 1, internship_id: 1 },
  { unique: true },
);
InternshipStageProgressSchema.index({ student_id: 1 });
InternshipStageProgressSchema.index({ internship_id: 1 });
InternshipStageProgressSchema.index({ 'stage_1.status': 1 });
InternshipStageProgressSchema.index({ 'stage_2.status': 1 });
InternshipStageProgressSchema.index({ 'stage_3.status': 1 });
InternshipStageProgressSchema.index({ overall_score: 1 });
InternshipStageProgressSchema.index({ all_stages_completed: 1 });
