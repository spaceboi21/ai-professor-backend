import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  MessageSenderEnum,
  MessageTypeEnum,
} from 'src/common/constants/ai-chat-message.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'ai_chat_message',
})
export class AIChatMessage extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'AIChatSession',
    required: true,
    index: true,
  })
  session_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Module', required: true, index: true })
  module_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  student_id: Types.ObjectId;

  @Prop({ required: true, enum: MessageSenderEnum })
  sender: MessageSenderEnum;

  @Prop({
    required: true,
    enum: MessageTypeEnum,
    default: MessageTypeEnum.TEXT,
  })
  message_type: MessageTypeEnum;

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

export const AIChatMessageSchema = SchemaFactory.createForClass(AIChatMessage);
