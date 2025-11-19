import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';
import { Internship } from './internship.schema';
import { InternshipCase } from './internship-case.schema';
import {
  SessionTypeEnum,
  SessionStatusEnum,
  MessageRoleEnum,
} from 'src/common/constants/internship.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class StudentCaseSession extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Student.name, required: true, index: true })
  student_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Internship.name, required: true, index: true })
  internship_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: InternshipCase.name, required: true, index: true })
  case_id: Types.ObjectId;

  @Prop({
    required: true,
    enum: SessionTypeEnum,
  })
  session_type: SessionTypeEnum;

  @Prop({
    required: true,
    enum: SessionStatusEnum,
    default: SessionStatusEnum.ACTIVE,
  })
  status: SessionStatusEnum;

  @Prop({ type: Date, default: () => new Date() })
  started_at: Date;

  @Prop({ type: Date, default: null })
  ended_at: Date;

  @Prop({ type: String, default: null })
  patient_session_id: string; // Python backend session ID

  @Prop({ type: String, default: null })
  therapist_session_id: string;

  @Prop({ type: String, default: null })
  supervisor_session_id: string;

  // Conversation history
  @Prop({
    type: [{
      role: { type: String, enum: MessageRoleEnum, required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: () => new Date() },
      metadata: { type: Object, default: {} },
    }],
    default: [],
  })
  messages: Array<{
    role: MessageRoleEnum;
    content: string;
    timestamp: Date;
    metadata: Record<string, any>;
  }>;

  // Real-time tips given during session
  @Prop({
    type: [{
      message: { type: String, required: true },
      context: { type: String, default: null },
      timestamp: { type: Date, default: () => new Date() },
    }],
    default: [],
  })
  realtime_tips: Array<{
    message: string;
    context: string | null;
    timestamp: Date;
  }>;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentCaseSessionSchema = SchemaFactory.createForClass(StudentCaseSession);

// Create indexes for better query performance
StudentCaseSessionSchema.index({ student_id: 1, status: 1 });
StudentCaseSessionSchema.index({ case_id: 1, student_id: 1 });
StudentCaseSessionSchema.index({ internship_id: 1, student_id: 1 });

