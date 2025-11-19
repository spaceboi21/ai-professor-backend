import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';
import { Internship } from './internship.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class StudentLogbook extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Student.name, required: true, index: true })
  student_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Internship.name, required: true, index: true })
  internship_id: Types.ObjectId;

  @Prop({
    type: [{
      case_id: { type: Types.ObjectId, required: true },
      case_title: { type: String, required: true },
      completed_date: { type: Date, default: () => new Date() },
      session_summary: { type: String, default: null },
      skills_practiced: { type: [String], default: [] },
      feedback_summary: { type: String, default: null },
      self_reflection: { type: String, default: null },
      attachments: {
        type: [{
          url: { type: String, required: true },
          type: { type: String, required: true },
        }],
        default: [],
      },
    }],
    default: [],
  })
  entries: Array<{
    case_id: Types.ObjectId;
    case_title: string;
    completed_date: Date;
    session_summary: string | null;
    skills_practiced: string[];
    feedback_summary: string | null;
    self_reflection: string | null;
    attachments: Array<{
      url: string;
      type: string;
    }>;
  }>;

  @Prop({ type: String, default: null })
  overall_progress_summary: string;

  @Prop({ type: Number, default: 0 })
  total_hours: number;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentLogbookSchema = SchemaFactory.createForClass(StudentLogbook);

// Create compound index for student_id and internship_id
StudentLogbookSchema.index(
  { student_id: 1, internship_id: 1 },
  { unique: true },
);

