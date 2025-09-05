import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AnchorChatSessionStatusEnum } from 'src/common/constants/anchor-chat-session.constant';
import { AnchorChatSessionTypeEnum } from 'src/common/constants/anchor-chat-session-type.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'anchor_chat_session',
})
export class AnchorChatSession extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AnchorTag', required: false, index: true })
  anchor_tag_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Module', required: false, index: true })
  module_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  student_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({
    required: true,
    enum: AnchorChatSessionStatusEnum,
    default: AnchorChatSessionStatusEnum.ACTIVE,
  })
  status: AnchorChatSessionStatusEnum;

  @Prop({
    required: true,
    enum: AnchorChatSessionTypeEnum,
    default: AnchorChatSessionTypeEnum.AI_CHAT,
  })
  session_type: AnchorChatSessionTypeEnum;

  @Prop({ type: Date, default: null })
  started_at: Date;

  @Prop({ type: Date, default: null })
  ended_at: Date;

  @Prop({ type: Number, default: 0 })
  total_messages: number;

  @Prop({ type: Number, default: 0 })
  student_messages: number;

  @Prop({ type: Number, default: 0 })
  ai_messages: number;

  @Prop({ type: String, default: null })
  session_title: string;

  @Prop({ type: String, default: null })
  session_description: string;

  @Prop({ type: Object, default: null })
  session_metadata: Record<string, any>;

  @Prop({ type: String, default: null })
  anchor_context: string;

  @Prop({ type: String, default: null })
  ai_chat_question: string;

  @Prop({ type: Boolean, default: false })
  ai_question_asked: boolean;

  @Prop({ type: Boolean, default: false })
  ai_question_answered: boolean;

  @Prop({ type: Boolean, default: false })
  additional_questions_asked: boolean;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const AnchorChatSessionSchema = SchemaFactory.createForClass(AnchorChatSession);
