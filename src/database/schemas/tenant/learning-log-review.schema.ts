import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  collection: 'learning_log_reviews',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class LearningLogReview extends Document {
  declare _id: Types.ObjectId;

  // Reference to the AI chat feedback (learning log)
  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: 'ai_chat_feedback',
  })
  ai_feedback_id: Types.ObjectId;

  // Reference to the reviewer (user who gave the review)
  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  reviewer_id: Types.ObjectId;

  // Role of the reviewer
  @Prop({
    type: String,
    required: true,
    enum: RoleEnum,
  })
  reviewer_role: RoleEnum;

  // Rating given by the reviewer (1-5 stars)
  @Prop({
    type: Number,
    required: true,
    min: 1,
    max: 5,
  })
  rating: number;

  // Feedback/comment given by the reviewer
  @Prop({
    type: String,
    required: true,
    maxlength: 1000,
  })
  feedback: string;

  // Additional metadata for the review
  @Prop({
    type: Object,
    default: {},
  })
  metadata: Record<string, any>;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const LearningLogReviewSchema = SchemaFactory.createForClass(LearningLogReview);

// Create indexes for better query performance
LearningLogReviewSchema.index({ ai_feedback_id: 1, reviewer_role: 1 });
LearningLogReviewSchema.index({ reviewer_id: 1, reviewer_role: 1 });
LearningLogReviewSchema.index({ created_at: -1 }); 