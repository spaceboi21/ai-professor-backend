import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Student extends Document {
  @Prop({ type: Types.ObjectId })
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop({ required: true, unique: true })
  email: string;

  // Reference to Schools_central._id
  @Prop({ type: Types.ObjectId, ref: 'schools', index: true })
  school_id: Types.ObjectId;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  student_id: string;

  @Prop()
  profile_pic: string;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
