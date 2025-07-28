import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { RoleEnum } from 'src/common/constants/roles.constant';

export enum ReportTypeEnum {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  MISLEADING = 'misleading',
  OTHER = 'other',
}

export enum ReportStatusEnum {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ReportEntityTypeEnum {
  DISCUSSION = 'discussion',
  REPLY = 'reply',
}

@Schema({
  collection: 'forum_reports',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ForumReport extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, enum: ReportEntityTypeEnum })
  entity_type: ReportEntityTypeEnum;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  entity_id: Types.ObjectId; // ID of the reported discussion or reply

  @Prop({ required: true, enum: ReportTypeEnum })
  report_type: ReportTypeEnum;

  @Prop({ required: true })
  reason: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  reported_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  reported_by_role: RoleEnum;

  @Prop({
    enum: ReportStatusEnum,
    default: ReportStatusEnum.PENDING,
    index: true,
  })
  status: ReportStatusEnum;

  @Prop({ type: Types.ObjectId, ref: User.name })
  reviewed_by: Types.ObjectId;

  @Prop({ type: Date, default: null })
  reviewed_at: Date;

  @Prop()
  admin_notes: string;

  @Prop({ type: Date, default: null })
  resolved_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ForumReportSchema = SchemaFactory.createForClass(ForumReport);

// Create indexes for better query performance
ForumReportSchema.index({ entity_type: 1, entity_id: 1 });
ForumReportSchema.index({ reported_by: 1, status: 1 });
ForumReportSchema.index({ status: 1, created_at: -1 });
ForumReportSchema.index({ report_type: 1, status: 1 });
