import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AISessionStatusEnum } from 'src/common/constants/ai-chat-session.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class AIChatSession extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Module', required: true, index: true })
  module_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Student', required: true, index: true })
  student_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({
    required: true,
    enum: AISessionStatusEnum,
    default: AISessionStatusEnum.ACTIVE,
  })
  status: AISessionStatusEnum;

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

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const AIChatSessionSchema = SchemaFactory.createForClass(AIChatSession);
