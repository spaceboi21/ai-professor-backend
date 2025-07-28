import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';

export enum LikeEntityTypeEnum {
  DISCUSSION = 'discussion',
  REPLY = 'reply',
}

@Schema({
  collection: 'forum_likes',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ForumLike extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, enum: LikeEntityTypeEnum })
  entity_type: LikeEntityTypeEnum;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  entity_id: Types.ObjectId; // ID of the liked discussion or reply

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  liked_by: Types.ObjectId;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ForumLikeSchema = SchemaFactory.createForClass(ForumLike);

// Create compound unique index to prevent duplicate likes
ForumLikeSchema.index(
  { entity_type: 1, entity_id: 1, liked_by: 1 },
  { unique: true },
);

// Create indexes for better query performance
ForumLikeSchema.index({ entity_type: 1, entity_id: 1 });
ForumLikeSchema.index({ liked_by: 1 });
