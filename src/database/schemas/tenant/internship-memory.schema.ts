import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Schema for backing up cross-session memory from Python AI
 * This provides redundancy and allows querying memory from MongoDB
 */
@Schema({ collection: 'internship_memory', timestamps: true })
export class InternshipMemory extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Internship' })
  internship_id: Types.ObjectId;

  @Prop({ type: String, required: true })
  user_id: string;

  @Prop({ type: Number, default: 0 })
  total_sessions: number;

  @Prop({ type: Number, default: 0 })
  current_session_number: number;

  @Prop({ type: Object, default: {} })
  memory_snapshot: {
    sessions?: any[];
    patient_memory?: {
      techniques_learned?: string[];
      safe_place_details?: string | null;
      trauma_targets?: any[];
      current_sud_baseline?: number | null;
      bilateral_stimulation_preferences?: string | null;
    };
    student_progress?: {
      skills_demonstrated?: Record<string, number>;
      areas_of_strength?: string[];
      areas_for_improvement?: string[];
      supervisor_notes?: Array<{
        note: string;
        session_number: number;
        timestamp: string;
      }>;
    };
  };

  @Prop({ type: Date, default: Date.now })
  last_synced_at: Date;

  @Prop({ type: Date, default: null })
  deleted_at: Date | null;
}

export const InternshipMemorySchema = SchemaFactory.createForClass(InternshipMemory);

// Indexes for efficient queries
InternshipMemorySchema.index({ internship_id: 1, user_id: 1 }, { unique: true });
InternshipMemorySchema.index({ user_id: 1 });
InternshipMemorySchema.index({ last_synced_at: 1 });
