import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  collection: 'chat_messages',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ChatMessage extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  sender_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  receiver_id: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  sender_role: RoleEnum;

  @Prop({ required: true, enum: RoleEnum })
  receiver_role: RoleEnum;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Boolean, default: false })
  is_read: boolean;

  @Prop({ type: Date, default: null })
  read_at: Date;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  @Prop({ type: Types.ObjectId, ref: User.name })
  deleted_by: Types.ObjectId;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// Create indexes for better query performance
ChatMessageSchema.index({ sender_id: 1, receiver_id: 1 });
ChatMessageSchema.index({ receiver_id: 1, sender_id: 1 });
ChatMessageSchema.index({ sender_id: 1, created_at: -1 });
ChatMessageSchema.index({ receiver_id: 1, created_at: -1 });
ChatMessageSchema.index({ is_read: 1, receiver_id: 1 });
ChatMessageSchema.index({ deleted_at: 1 }); 