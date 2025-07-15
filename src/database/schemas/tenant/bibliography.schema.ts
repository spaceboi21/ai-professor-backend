import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { Module } from './module.schema';
import { Chapter } from './chapter.schema';
import { BibliographyTypeEnum } from 'src/common/constants/bibliography-type.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Bibliography extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Module.name, required: true, index: true })
  module_id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Chapter.name,
    required: true,
    index: true,
  })
  chapter_id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: BibliographyTypeEnum })
  type: BibliographyTypeEnum;

  @Prop({ required: true })
  mime_type: string;

  @Prop({ required: true })
  path: string;

  @Prop({ type: Number })
  pages: number;

  @Prop({ required: true, type: Number })
  duration: number; // in minutes

  @Prop({ required: true, type: Number, min: 1 })
  sequence: number;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const BibliographySchema = SchemaFactory.createForClass(Bibliography);

// Create compound index for chapter_id and sequence to ensure unique sequence per chapter
BibliographySchema.index(
  { chapter_id: 1, sequence: 1, deleted_at: 1 },
  { unique: true },
);
