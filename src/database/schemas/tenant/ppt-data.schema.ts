import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Bibliography } from './bibliography.schema';
import { User } from '../central/user.schema';

export interface PptSlideContent {
  type: 'text' | 'image' | 'shape';
  content: string;
  style: {
    fontSize: string;
    fontFamily: string;
    color: string;
    bold: boolean;
    italic: boolean;
    alignment?: 'left' | 'center' | 'right' | 'justify';
  };
  position?: { x: number; y: number };
}

export interface PptSlide {
  slideNumber: number;
  title: string;
  content: PptSlideContent[];
  notes: string;
  layout: string;
  slideId: string;
}

export interface PptMetadata {
  title: string;
  author: string;
  createdDate: Date;
  modifiedDate: Date;
  totalSlides: number;
  subject?: string;
  keywords?: string[];
}

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'ppt_data',
})
export class PptData extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Bibliography.name,
    required: true,
    index: true,
  })
  bibliography_id: Types.ObjectId;

  @Prop({ required: true })
  totalSlides: number;

  @Prop({ type: [Object], required: true })
  slides: PptSlide[];

  @Prop({ type: Object, required: true })
  metadata: PptMetadata;

  @Prop({ type: Map, of: String })
  slideMapping: Map<number, string>; // slideNumber -> slideId mapping

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  created_by: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const PptDataSchema = SchemaFactory.createForClass(PptData);

// Add indexes for better query performance
PptDataSchema.index({ bibliography_id: 1, deleted_at: 1 });
PptDataSchema.index({ 'slides.slideNumber': 1 });
PptDataSchema.index({ created_at: -1 });
