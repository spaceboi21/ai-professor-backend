import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';
import {
  NotificationTypeEnum,
  NotificationStatusEnum,
} from 'src/common/constants/notification.constant';

@Schema({
  collection: 'notifications',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Notification extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Student.name,
    required: true,
    index: true,
  })
  student_id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, enum: NotificationTypeEnum })
  type: NotificationTypeEnum;

  @Prop({
    enum: NotificationStatusEnum,
    default: NotificationStatusEnum.UNREAD,
  })
  status: NotificationStatusEnum;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>; // For additional data like module_id, etc.

  @Prop({ type: Date, default: null })
  read_at: Date;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Create indexes for better query performance
NotificationSchema.index({ student_id: 1, status: 1 });
NotificationSchema.index({ student_id: 1, created_at: -1 });
NotificationSchema.index({ type: 1 });
