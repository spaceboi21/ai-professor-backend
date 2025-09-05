import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ResourceCategoryEnum,
  ResourceTypeEnum,
} from 'src/common/constants/ai-resource.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'anchor_chat_resource',
})
export class AnchorChatResource extends Document {
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

  @Prop({ type: [Object], default: [] })
  resources: Object[];

  @Prop({ type: String, default: '' })
  recommendations: string;

  @Prop({ type: Number, default: 0 })
  total_found: number;

  @Prop({ type: Boolean, default: false })
  knowledge_available: boolean;

  @Prop({ type: [String], default: [] })
  keywords_for_learning: string[];

  @Prop({ type: String, default: null })
  anchor_context: string;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const AnchorChatResourceSchema = SchemaFactory.createForClass(AnchorChatResource);
