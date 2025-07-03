import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class User extends Document {
  @Prop({ type: Types.ObjectId })
  declare _id: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop()
  phone: number;

  @Prop()
  country_code: number;

  @Prop({ type: Types.ObjectId, index: true, ref: 'schools' })
  school_id: Types.ObjectId;

  @Prop({ required: true })
  password: string;

  @Prop()
  last_loggedin: Date;

  @Prop({ type: Types.ObjectId, ref: 'roles' })
  role: Types.ObjectId;

  @Prop()
  first_name: string;

  @Prop()
  last_name: string;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
