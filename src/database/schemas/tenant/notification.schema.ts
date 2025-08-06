import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import {
  NotificationTypeEnum,
  NotificationStatusEnum,
} from 'src/common/constants/notification.constant';

export enum RecipientTypeEnum {
  STUDENT = 'STUDENT',
  PROFESSOR = 'PROFESSOR',
}

// Multi-language content interface
export interface MultiLanguageContent {
  en: string;
  fr: string;
}

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
    type: String,
    enum: RecipientTypeEnum,
    required: true,
  })
  recipient_type: RecipientTypeEnum;

  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  recipient_id: Types.ObjectId;

  @Prop({
    type: Object,
    required: true,
    validate: {
      validator: function (content: MultiLanguageContent) {
        return (
          content &&
          typeof content.en === 'string' &&
          typeof content.fr === 'string'
        );
      },
      message: 'Title must contain both English (en) and French (fr) versions',
    },
  })
  title: MultiLanguageContent;

  @Prop({
    type: Object,
    required: true,
    validate: {
      validator: function (content: MultiLanguageContent) {
        return (
          content &&
          typeof content.en === 'string' &&
          typeof content.fr === 'string'
        );
      },
      message:
        'Message must contain both English (en) and French (fr) versions',
    },
  })
  message: MultiLanguageContent;

  @Prop({ type: String, required: true, enum: NotificationTypeEnum })
  type: NotificationTypeEnum;

  @Prop({
    type: String,
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
NotificationSchema.index({ recipient_type: 1, recipient_id: 1, status: 1 });
NotificationSchema.index({
  recipient_type: 1,
  recipient_id: 1,
  created_at: -1,
});
NotificationSchema.index({ type: 1 });
