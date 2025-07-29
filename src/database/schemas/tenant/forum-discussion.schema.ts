import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { RoleEnum } from 'src/common/constants/roles.constant';

export enum DiscussionTypeEnum {
  DISCUSSION = 'DISCUSSION',
  QUESTION = 'QUESTION',
  CASE_STUDY = 'CASE_STUDY',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  MEETING = 'MEETING',
}

export enum DiscussionStatusEnum {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  REPORTED = 'REPORTED',
  DELETED = 'DELETED',
}

export enum VideoPlatformEnum {
  GOOGLE_MEET = 'GOOGLE_MEET',
  ZOOM = 'ZOOM',
  TEAMS = 'TEAMS',
  OTHER = 'OTHER',
}

@Schema({
  collection: 'forum_discussions',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ForumDiscussion extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, enum: DiscussionTypeEnum })
  type: DiscussionTypeEnum;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({ type: Number, default: 0 })
  reply_count: number;

  @Prop({ type: Number, default: 0 })
  view_count: number;

  @Prop({ type: Number, default: 0 })
  like_count: number;

  // Meeting fields (only for meeting type discussions)
  @Prop({ type: String })
  meeting_link: string;

  @Prop({ enum: VideoPlatformEnum })
  meeting_platform: VideoPlatformEnum;

  @Prop({ type: Date })
  meeting_scheduled_at?: Date;

  @Prop({ type: Number })
  meeting_duration_minutes?: number;

  @Prop({ type: Date })
  last_reply_at?: Date;

  @Prop({
    enum: DiscussionStatusEnum,
    default: DiscussionStatusEnum.ACTIVE,
    index: true,
  })
  status: DiscussionStatusEnum;

  @Prop({ type: Date })
  archived_at?: Date;

  @Prop({ type: Types.ObjectId, ref: User.name })
  archived_by: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  @Prop({ type: Types.ObjectId, ref: User.name })
  deleted_by: Types.ObjectId;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ForumDiscussionSchema =
  SchemaFactory.createForClass(ForumDiscussion);

// Create indexes for better query performance
ForumDiscussionSchema.index({ created_by: 1, status: 1 });
ForumDiscussionSchema.index({ type: 1, status: 1 });
ForumDiscussionSchema.index({ tags: 1, status: 1 });
ForumDiscussionSchema.index({ created_at: -1 });
ForumDiscussionSchema.index({ meeting_scheduled_at: 1, status: 1 });
