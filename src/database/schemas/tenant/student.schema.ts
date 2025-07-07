import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { School } from '../central/school.schema';
import { ROLE_IDS, RoleEnum } from 'src/common/constants/roles.constant';
import { Role } from '../central/role.schema';

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

  @Prop()
  last_name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: Types.ObjectId, index: true, ref: School.name })
  school_id: Types.ObjectId;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true })
  student_code: string;

  @Prop()
  profile_path: string;

  @Prop({ type: Types.ObjectId, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({
    type: Types.ObjectId,
    ref: Role.name,
    required: true,
    index: true,
    default: new Types.ObjectId(ROLE_IDS.STUDENT),
  })
  role: Types.ObjectId;

  @Prop({ type: Date, default: null })
  last_logged_in: Date;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
