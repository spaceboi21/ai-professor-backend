import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';

@Schema({
  collection: 'student_notifications',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class StudentNotification extends Document {
  declare _id: Types.ObjectId;

  // Reference to Students_tenent._id
  @Prop({
    type: Types.ObjectId,
    ref: Student.name,
    required: true,
    index: true,
  })
  student_id: Types.ObjectId;

  @Prop({ default: true })
  module_progress_updates: boolean;

  @Prop({ default: true })
  ai_feedback_alert: boolean;

  @Prop({ default: true })
  forum_replies: boolean;

  @Prop({ default: true })
  email_digest: boolean;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentNotificationSchema =
  SchemaFactory.createForClass(StudentNotification);
