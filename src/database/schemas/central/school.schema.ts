import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  StatusEnum,
  DEFAULT_STATUS,
} from 'src/common/constants/status.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class School extends Document {
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

  // This field will be always super admin _id
  @Prop({ type: Types.ObjectId, index: true, ref: 'User' })
  created_by: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true, ref: 'User' })
  updated_by: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  @Prop({ enum: StatusEnum, default: DEFAULT_STATUS, index: true })
  status: StatusEnum;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const SchoolSchema = SchemaFactory.createForClass(School);
