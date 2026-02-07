import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from './role.schema';
import { School } from './school.schema';
import {
  StatusEnum,
  DEFAULT_STATUS,
} from 'src/common/constants/status.constant';
import {
  LanguageEnum,
  DEFAULT_LANGUAGE,
} from 'src/common/constants/language.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class User extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, index: true }) // Removed unique constraint for multi-account support
  email: string;

  @Prop({ index: true }) // Username as secondary identifier
  username: string;

  @Prop({ index: true }) // Account code as secondary identifier
  account_code: string;

  @Prop()
  profile_pic: string;

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

  @Prop({ type: Date, default: null })
  last_logged_in: Date;

  @Prop({ type: Types.ObjectId, ref: Role.name, required: true, index: true })
  role: Types.ObjectId;

  @Prop({ required: true, type: String })
  first_name: string;

  @Prop()
  last_name: string;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  @Prop({ enum: StatusEnum, default: DEFAULT_STATUS, index: true })
  status: StatusEnum;

  @Prop({
    enum: LanguageEnum,
    default: DEFAULT_LANGUAGE,
    required: true,
  })
  preferred_language: LanguageEnum;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create compound unique index for email + school + role combination
// This ensures a user can't have duplicate accounts with same email, school, and role
UserSchema.index(
  { email: 1, school_id: 1, role: 1, deleted_at: 1 },
  { 
    unique: true,
    partialFilterExpression: { deleted_at: null }
  }
);
