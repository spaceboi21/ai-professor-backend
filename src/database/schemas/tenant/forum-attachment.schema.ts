import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { RoleEnum } from 'src/common/constants/roles.constant';

export enum AttachmentEntityTypeEnum {
  DISCUSSION = 'DISCUSSION',
  REPLY = 'REPLY',
}

export enum AttachmentStatusEnum {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

@Schema({
  collection: 'forum_attachments',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ForumAttachment extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ForumDiscussion',
    required: true,
    index: true,
  })
  discussion_id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ForumReply',
    default: null,
    index: true,
  })
  reply_id: Types.ObjectId; // null for discussion attachments

  @Prop({
    required: true,
    enum: AttachmentEntityTypeEnum,
  })
  entity_type: AttachmentEntityTypeEnum;

  @Prop({ required: true })
  original_filename: string;

  @Prop({ required: true })
  stored_filename: string;

  @Prop({ required: true })
  file_url: string;

  @Prop({ required: true })
  mime_type: string;

  @Prop({ required: true })
  file_size: number; // in bytes

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  uploaded_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  uploaded_by_role: RoleEnum;

  @Prop({
    enum: AttachmentStatusEnum,
    default: AttachmentStatusEnum.ACTIVE,
  })
  status: AttachmentStatusEnum;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  @Prop({ type: Types.ObjectId, ref: User.name })
  deleted_by: Types.ObjectId;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ForumAttachmentSchema =
  SchemaFactory.createForClass(ForumAttachment);
