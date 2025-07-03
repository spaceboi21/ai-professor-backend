import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class School extends Document {
  @Prop({ type: Types.ObjectId })
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true })
  db_name: string;

  @Prop()
  address: string;

  @Prop()
  website_url: string;

  @Prop()
  phone: number;

  @Prop()
  country_code: number;

  @Prop()
  logo: string;

  @Prop()
  timezone: string; // you can change this to an enum if you have fixed timezone options

  @Prop()
  language: string;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const SchoolSchema = SchemaFactory.createForClass(School);
