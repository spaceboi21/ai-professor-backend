import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';

@Schema({
  collection: 'forum_views',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ForumView extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  discussion_id: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  viewed_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ForumViewSchema = SchemaFactory.createForClass(ForumView);

// Create compound unique index to prevent duplicate entries per user per discussion
ForumViewSchema.index({ user_id: 1, discussion_id: 1 }, { unique: true });

// Create indexes for better query performance
ForumViewSchema.index({ user_id: 1 });
ForumViewSchema.index({ discussion_id: 1 });
ForumViewSchema.index({ viewed_at: -1 });
