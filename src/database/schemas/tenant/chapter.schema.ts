import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { Module } from './module.schema';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Chapter extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Module.name, required: true, index: true })
  module_id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  subject: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({ required: true, type: Number, min: 1 })
  sequence: number;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ChapterSchema = SchemaFactory.createForClass(Chapter);

// Create compound index for module_id and sequence to ensure unique sequence per module
ChapterSchema.index({ module_id: 1, sequence: 1 }, { unique: true });
