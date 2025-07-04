import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { School, SchoolSchema } from '../central/school.schema';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Student extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: Types.ObjectId, index: true, ref: School.name })
  school_id: Types.ObjectId;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true })
  student_id: string;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  @Prop()
  profile_pic: string;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
