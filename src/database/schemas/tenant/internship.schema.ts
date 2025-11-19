import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { DEFAULT_IMAGES } from 'src/common/constants/default-images.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Internship extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, default: null })
  guidelines: string; // Rich text or markdown

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({ required: true, type: Number, min: 1, max: 5 })
  year: number;

  @Prop({ type: Boolean, default: false, index: true })
  published: boolean;

  @Prop({ type: Date, default: null })
  published_at: Date;

  @Prop({ type: Number, default: null, min: 1 })
  sequence: number;

  @Prop({ default: DEFAULT_IMAGES.MODULE_THUMBNAIL })
  thumbnail: string;

  @Prop({ type: Number, default: 0 })
  duration: number; // estimated hours

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const InternshipSchema = SchemaFactory.createForClass(Internship);

// Create indexes
InternshipSchema.index({ year: 1, deleted_at: 1 });
InternshipSchema.index({ published: 1, deleted_at: 1 });
InternshipSchema.index({ sequence: 1, year: 1 });

