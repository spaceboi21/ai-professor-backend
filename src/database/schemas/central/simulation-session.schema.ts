import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RoleEnum } from 'src/common/constants/roles.constant';

export enum SimulationStatusEnum {
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

export enum SimulationModeEnum {
  DUMMY_STUDENT = 'DUMMY_STUDENT', // Using a test/dummy student profile
  READ_ONLY_IMPERSONATION = 'READ_ONLY_IMPERSONATION', // Viewing real student in read-only mode
}

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'simulation_sessions',
})
export class SimulationSession extends Document {
  declare _id: Types.ObjectId;

  // The original user (Teacher/Admin) who initiated the simulation
  @Prop({ type: Types.ObjectId, required: true, index: true })
  original_user_id: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  original_user_role: RoleEnum;

  @Prop({ required: true })
  original_user_email: string;

  // The student being simulated/impersonated
  @Prop({ type: Types.ObjectId, required: true, index: true })
  simulated_student_id: Types.ObjectId;

  @Prop({ required: true })
  simulated_student_email: string;

  @Prop()
  simulated_student_name: string;

  // School context
  @Prop({ type: Types.ObjectId, required: true, index: true })
  school_id: Types.ObjectId;

  @Prop()
  school_name: string;

  // Simulation mode
  @Prop({ 
    required: true, 
    enum: SimulationModeEnum,
    default: SimulationModeEnum.READ_ONLY_IMPERSONATION 
  })
  simulation_mode: SimulationModeEnum;

  // Session status
  @Prop({ 
    required: true, 
    enum: SimulationStatusEnum, 
    default: SimulationStatusEnum.ACTIVE,
    index: true 
  })
  status: SimulationStatusEnum;

  // Session timing
  @Prop({ type: Date, required: true, default: Date.now })
  started_at: Date;

  @Prop({ type: Date })
  ended_at: Date;

  // Session duration in seconds
  @Prop({ type: Number })
  duration_seconds: number;

  // Activity tracking
  @Prop({ type: [String], default: [] })
  pages_visited: string[];

  @Prop({ type: Number, default: 0 })
  ai_chats_opened: number;

  @Prop({ type: Number, default: 0 })
  quizzes_viewed: number;

  @Prop({ type: Number, default: 0 })
  modules_viewed: number;

  // Session metadata
  @Prop()
  ip_address: string;

  @Prop()
  user_agent: string;

  // Purpose/reason for simulation (optional)
  @Prop()
  purpose: string;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const SimulationSessionSchema = SchemaFactory.createForClass(SimulationSession);

// Create indexes for common queries
SimulationSessionSchema.index({ original_user_id: 1, status: 1 });
SimulationSessionSchema.index({ school_id: 1, created_at: -1 });
SimulationSessionSchema.index({ simulated_student_id: 1, created_at: -1 });

