import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';
import { School } from './school.schema';
import {
  ActivityTypeEnum,
  ActivityCategoryEnum,
  ActivityLevelEnum,
} from 'src/common/constants/activity.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

export interface MultiLanguageDescription {
  en: string;
  fr: string;
}

// Define a schema for the description without _id
const MultiLanguageDescriptionSchema = new MongooseSchema(
  {
    en: { type: String, required: true },
    fr: { type: String, required: true },
  },
  { _id: false },
);

@Schema({
  collection: 'activity_logs',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ActivityLog extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ActivityTypeEnum, index: true })
  activity_type: ActivityTypeEnum;

  @Prop({
    type: String,
    required: true,
    enum: ActivityCategoryEnum,
    index: true,
  })
  category: ActivityCategoryEnum;

  @Prop({ type: String, required: true, enum: ActivityLevelEnum, index: true })
  level: ActivityLevelEnum;

  @Prop({
    type: MultiLanguageDescriptionSchema,
    required: true,
  })
  description: MultiLanguageDescription;

  @Prop({ type: String })
  description_en: string;

  @Prop({ type: String })
  description_fr: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  performed_by: Types.ObjectId;

  @Prop({ type: String, required: true, enum: RoleEnum, index: true })
  performed_by_role: RoleEnum;

  @Prop({ type: Types.ObjectId, ref: School.name, index: true })
  school_id: Types.ObjectId;

  @Prop({ type: String })
  school_name: string;

  @Prop({ type: Types.ObjectId, ref: User.name, index: true })
  target_user_id: Types.ObjectId;

  @Prop({ type: String })
  target_user_email: string;

  @Prop({ type: String })
  target_user_role: RoleEnum;

  @Prop({ type: Types.ObjectId, index: true })
  module_id: Types.ObjectId;

  @Prop({ type: String })
  module_name: string;

  @Prop({ type: Types.ObjectId, index: true })
  chapter_id: Types.ObjectId;

  @Prop({ type: String })
  chapter_name: string;

  @Prop({ type: Types.ObjectId, index: true })
  quiz_group_id: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: String })
  ip_address: string;

  @Prop({ type: String })
  user_agent: string;

  @Prop({ type: String })
  session_id: string;

  @Prop({ type: Boolean, default: false, index: true })
  is_success: boolean;

  @Prop({ type: String })
  error_message: string;

  @Prop({ type: Number })
  execution_time_ms: number;

  @Prop({ type: String })
  endpoint: string;

  @Prop({ type: String })
  http_method: string;

  @Prop({ type: Number })
  http_status_code: number;

  @Prop({
    type: String,
    enum: ['SUCCESS', 'WARNING', 'ERROR', 'INFO'],
    default: 'SUCCESS',
    index: true,
  })
  status: string;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

// Create indexes for efficient querying
ActivityLogSchema.index({ created_at: -1 });
ActivityLogSchema.index({ performed_by: 1, created_at: -1 });
ActivityLogSchema.index({ school_id: 1, created_at: -1 });
ActivityLogSchema.index({ activity_type: 1, created_at: -1 });
ActivityLogSchema.index({ category: 1, created_at: -1 });
ActivityLogSchema.index({ level: 1, created_at: -1 });
ActivityLogSchema.index({ performed_by_role: 1, created_at: -1 });
ActivityLogSchema.index({ is_success: 1, created_at: -1 });
ActivityLogSchema.index({ target_user_id: 1, created_at: -1 });
ActivityLogSchema.index({ module_id: 1, created_at: -1 });
ActivityLogSchema.index({ chapter_id: 1, created_at: -1 });
ActivityLogSchema.index({ quiz_group_id: 1, created_at: -1 });
ActivityLogSchema.index({ status: 1, created_at: -1 });

// Compound indexes for common query patterns
ActivityLogSchema.index({ school_id: 1, performed_by_role: 1, created_at: -1 });
ActivityLogSchema.index({ performed_by: 1, activity_type: 1, created_at: -1 });
ActivityLogSchema.index({ school_id: 1, activity_type: 1, created_at: -1 });
ActivityLogSchema.index({ status: 1, activity_type: 1, created_at: -1 });
ActivityLogSchema.index({ status: 1, is_success: 1, created_at: -1 });
