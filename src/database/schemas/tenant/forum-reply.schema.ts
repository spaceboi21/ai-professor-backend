import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { RoleEnum } from 'src/common/constants/roles.constant';

export enum ReplyStatusEnum {
  ACTIVE = 'active',
  REPORTED = 'reported',
  DELETED = 'deleted',
}

@Schema({
  collection: 'forum_replies',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ForumReply extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ForumDiscussion',
    required: true,
    index: true,
  })
  discussion_id: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({ type: Types.ObjectId, ref: 'ForumReply' })
  parent_reply_id: Types.ObjectId; // For nested replies

  @Prop({ type: Number, default: 0 })
  like_count: number;

  @Prop({ enum: ReplyStatusEnum, default: ReplyStatusEnum.ACTIVE, index: true })
  status: ReplyStatusEnum;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  @Prop({ type: Types.ObjectId, ref: User.name })
  deleted_by: Types.ObjectId;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ForumReplySchema = SchemaFactory.createForClass(ForumReply);

// Create indexes for better query performance
ForumReplySchema.index({ discussion_id: 1, status: 1 });
ForumReplySchema.index({ created_by: 1, status: 1 });
ForumReplySchema.index({ parent_reply_id: 1, status: 1 });
ForumReplySchema.index({ created_at: 1 });
