import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  AnchorChatMessageSenderEnum,
  AnchorChatMessageTypeEnum,
} from 'src/common/constants/anchor-chat-message.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'anchor_chat_message',
})
export class AnchorChatMessage extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'AnchorChatSession',
    required: true,
    index: true,
  })
  session_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AnchorTag', required: false, index: true })
  anchor_tag_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Module', required: true, index: true })
  module_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  student_id: Types.ObjectId;

  @Prop({ required: true, enum: AnchorChatMessageSenderEnum })
  sender: AnchorChatMessageSenderEnum;

  @Prop({
    required: true,
    enum: AnchorChatMessageTypeEnum,
    default: AnchorChatMessageTypeEnum.TEXT,
  })
  message_type: AnchorChatMessageTypeEnum;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: Object, default: null })
  message_metadata: Record<string, any>;

  @Prop({ type: Boolean, default: false })
  is_error: boolean;

  @Prop({ type: String, default: null })
  error_message: string;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  @Prop({ type: Boolean, default: false })
  conversation_started: boolean;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const AnchorChatMessageSchema = SchemaFactory.createForClass(AnchorChatMessage);
