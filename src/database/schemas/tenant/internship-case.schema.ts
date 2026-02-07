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

  // Session configuration
  @Prop({
    type: {
      session_duration_minutes: { type: Number, default: 90 }, // Default 90 minutes for IA Stage
      max_sessions_allowed: { type: Number, default: null }, // null = unlimited
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
    max_sessions_allowed: number | null;
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

