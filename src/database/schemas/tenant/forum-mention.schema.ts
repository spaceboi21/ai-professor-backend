import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';

@Schema({
  collection: 'forum_mentions',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ForumMention extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ForumReply',
    required: true,
  })
  reply_id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ForumDiscussion',
    required: true,
  })
  discussion_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  mentioned_by: Types.ObjectId; // User who created the mention

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  mentioned_user: Types.ObjectId; // User who was mentioned

  @Prop({ type: String, required: true })
  mention_text: string; // The actual @username text

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ForumMentionSchema = SchemaFactory.createForClass(ForumMention);

// Create indexes for better query performance
ForumMentionSchema.index({ reply_id: 1, mentioned_user: 1 });
ForumMentionSchema.index({ discussion_id: 1, mentioned_user: 1 });
ForumMentionSchema.index({ mentioned_by: 1 });
ForumMentionSchema.index({ mentioned_user: 1 });
ForumMentionSchema.index({ created_at: -1 });
