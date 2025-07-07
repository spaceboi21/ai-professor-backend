import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from './role.schema';
import { School } from './school.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class User extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop()
  phone: number;

  @Prop()
  country_code: number;

  @Prop({ type: Types.ObjectId, index: true, ref: School.name })
  school_id: Types.ObjectId;

  // This field will be always super admin _id
  @Prop({ type: Types.ObjectId, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, select: false })
  password: string;

  @Prop()
  last_logged_in: Date;

  @Prop({ type: Types.ObjectId, ref: Role.name, required: true, index: true })
  role: Types.ObjectId;

  @Prop({ required: true, type: String })
  first_name: string;

  @Prop()
  last_name: string;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
