import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { Internship } from './internship.schema';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class InternshipCase extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Internship.name, required: true, index: true })
  internship_id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, default: null })
  case_content: string; // Rich text content

  @Prop({
    type: [{
      url: { type: String, required: true },
      s3_key: { type: String, default: null },
      type: { type: String, required: true },
      name: { type: String, required: true },
      size: { type: Number, default: null },
      uploaded_at: { type: Date, default: Date.now },
    }],
    default: [],
  })
  case_documents: Array<{
    url: string;
    s3_key?: string;
    type: string;
    name: string;
    size?: number;
    uploaded_at?: Date;
  }>;

  @Prop({ required: true, type: Number, min: 1 })
  sequence: number; // Order within internship

  // NEW: 3-Step Progressive Structure
  @Prop({ type: Number, required: true, enum: [1, 2, 3], default: 1, index: true })
  step: 1 | 2 | 3; // Step 1: 5 isolated cases, Step 2: 7 progressive, Step 3: 15 realistic

  @Prop({ 
    type: String, 
    required: true, 
    enum: ['isolated', 'progressive', 'realistic'], 
    default: 'isolated' 
  })
  case_type: 'isolated' | 'progressive' | 'realistic';

  @Prop({ type: String, default: null, index: true })
  patient_base_id: string | null; // e.g., "brigitte_fenurel" - for Steps 2-3, null for Step 1

  @Prop({ type: Number, required: true, min: 1 })
  sequence_in_step: number; // Position within step (1-5 for Step 1, 1-7 for Step 2, 1-15 for Step 3)

  @Prop({ type: String, default: null })
  emdr_phase_focus: string | null; // For Step 2: e.g., "Phase 1-2", "Phase 3-4"

  @Prop({ type: String, default: null })
  session_narrative: string | null; // For Step 3: e.g., "Relapse after work stress"

  @Prop({
    type: {
      patient_profile: { type: Object, default: {} },
      scenario_type: { type: String, default: null },
      difficulty_level: { type: String, default: null },
    },
    default: {},
  })
  patient_simulation_config: {
    patient_profile: Record<string, any>;
    scenario_type: string;
    difficulty_level: string;
  };

  @Prop({ type: [String], default: [] })
  supervisor_prompts: string[]; // GPT prompts for supervisor feedback

  @Prop({ type: [String], default: [] })
  therapist_prompts: string[]; // GPT prompts for therapist guidance

  // DEPRECATED: Old evaluation_criteria (kept for backward compatibility)
  @Prop({
    type: [{
      criterion: { type: String, required: true },
      weight: { type: Number, required: true, min: 0, max: 100 },
    }],
    default: [],
  })
  evaluation_criteria: Array<{
    criterion: string;
    weight: number;
  }>;

  // NEW: Rich Assessment Criteria (MUST total 100 points)
  @Prop({
    type: [{
      criterion_id: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String, required: true },
      max_points: { type: Number, required: true, min: 0, max: 100 },
      reference_literature: { type: String, default: null },
      ko_example: { type: String, default: null },
      ok_example: { type: String, default: null },
    }],
    default: [],
  })
  assessment_criteria: Array<{
    criterion_id: string;
    name: string;
    description: string;
    max_points: number;
    reference_literature?: string;
    ko_example?: string;
    ok_example?: string;
  }>;

  // NEW: Literature References (for AI assessment)
  @Prop({
    type: [{
      title: { type: String, required: true },
      type: { type: String, enum: ['book', 'article', 'manual'], required: true },
      relevant_pages: { type: String, default: null },
      s3_url: { type: String, default: null },
      s3_key: { type: String, default: null },
      pinecone_namespace: { type: String, default: 'baby-ai' }, // Default to existing index
      priority: { type: String, enum: ['primary', 'secondary'], default: 'secondary' },
    }],
    default: [],
  })
  literature_references: Array<{
    title: string;
    type: 'book' | 'article' | 'manual';
    relevant_pages?: string;
    s3_url?: string;
    s3_key?: string;
    pinecone_namespace: string;
    priority: 'primary' | 'secondary';
  }>;

  // NEW: Pass Threshold (configurable per case)
  @Prop({ type: Number, default: 70, min: 0, max: 100 })
  pass_threshold: number; // Minimum score to pass (default 70)

  // NEW: Patient State (for Steps 2-3 - tracks patient evolution across sessions)
  @Prop({
    type: {
      current_sud: { type: Number, default: null, min: 0, max: 10 },
      current_voc: { type: Number, default: null, min: 1, max: 7 },
      safe_place_established: { type: Boolean, default: false },
      trauma_targets_resolved: { type: [String], default: [] },
      techniques_mastered: { type: [String], default: [] },
      progress_trajectory: { 
        type: String, 
        enum: ['improvement', 'stable', 'regression', 'breakthrough'], 
        default: null 
      },
    },
    default: null,
  })
  patient_state: {
    current_sud: number | null;
    current_voc: number | null;
    safe_place_established: boolean;
    trauma_targets_resolved: string[];
    techniques_mastered: string[];
    progress_trajectory: 'improvement' | 'stable' | 'regression' | 'breakthrough' | null;
  } | null;

  // Session configuration
  @Prop({
    type: {
      session_duration_minutes: { type: Number, default: 90 }, // Default 90 minutes for IA Stage
      max_sessions_allowed: { type: Number, default: null }, // null = unlimited (retry limit)
      allow_pause: { type: Boolean, default: true },
      auto_end_on_timeout: { type: Boolean, default: false },
      warning_before_timeout_minutes: { type: Number, default: 5 },
    },
    default: {
      session_duration_minutes: 90,
      max_sessions_allowed: null,
      allow_pause: true,
      auto_end_on_timeout: false,
      warning_before_timeout_minutes: 5,
    },
  })
  session_config: {
    session_duration_minutes: number;
    max_sessions_allowed: number | null; // null = unlimited retries
    allow_pause: boolean;
    auto_end_on_timeout: boolean;
    warning_before_timeout_minutes: number;
  };

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  @Prop({ type: Boolean, default: false })
  pinecone_ingested: boolean;

  @Prop({ type: Date, default: null })
  pinecone_ingested_at?: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const InternshipCaseSchema = SchemaFactory.createForClass(InternshipCase);

// Create compound index for internship_id, sequence, and deleted_at
InternshipCaseSchema.index(
  { internship_id: 1, sequence: 1, deleted_at: 1 },
  { unique: true },
);

// Create compound index for internship_id, title, and deleted_at
InternshipCaseSchema.index(
  { internship_id: 1, title: 1, deleted_at: 1 },
  { unique: true },
);

// NEW: Create index for step queries
InternshipCaseSchema.index({ internship_id: 1, step: 1, deleted_at: 1 });

// NEW: Create index for patient_base_id (Steps 2-3 queries)
InternshipCaseSchema.index({ patient_base_id: 1, step: 1, deleted_at: 1 });

// NEW: Create index for case_type queries
InternshipCaseSchema.index({ case_type: 1, deleted_at: 1 });

