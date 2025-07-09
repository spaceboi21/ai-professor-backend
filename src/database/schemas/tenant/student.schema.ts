import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ROLE_IDS, RoleEnum } from 'src/common/constants/roles.constant';
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
export class Student extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  first_name: string;

  @Prop()
  last_name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: Types.ObjectId, index: true })
  school_id: Types.ObjectId;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true })
  student_code: string;

  @Prop()
  profile_pic: string;

  @Prop({ type: Types.ObjectId, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({
    type: Types.ObjectId,
    // ref: Role.name,
    required: true,
    index: true,
    default: new Types.ObjectId(ROLE_IDS.STUDENT),
  })
  role: Types.ObjectId;

  @Prop({ type: Date, default: null })
  last_logged_in: Date;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  @Prop({ enum: StatusEnum, default: DEFAULT_STATUS, index: true })
  status: StatusEnum;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
