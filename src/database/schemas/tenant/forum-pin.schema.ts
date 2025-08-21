import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';

@Schema({
  collection: 'forum_pins',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ForumPin extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ForumDiscussion',
    required: true,
  })
  discussion_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  pinned_by: Types.ObjectId;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ForumPinSchema = SchemaFactory.createForClass(ForumPin);

// Create indexes for better query performance
ForumPinSchema.index({ discussion_id: 1, pinned_by: 1 }, { unique: true });
ForumPinSchema.index({ pinned_by: 1 });
ForumPinSchema.index({ discussion_id: 1 });
ForumPinSchema.index({ created_at: -1 });
// Compound index for efficient pin status queries
ForumPinSchema.index({ pinned_by: 1, created_at: -1 });
// Index for aggregation queries
ForumPinSchema.index({ discussion_id: 1, pinned_by: 1, created_at: -1 });
