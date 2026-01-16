import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Student } from './student.schema';
import { Module } from './module.schema';
import { User } from '../central/user.schema';
import { RoleEnum } from 'src/common/constants/roles.constant';

/**
 * Enrollment Type - Individual module or academic year/cohort
 */
export enum EnrollmentTypeEnum {
  INDIVIDUAL = 'INDIVIDUAL',
  ACADEMIC_YEAR = 'ACADEMIC_YEAR',
  BULK = 'BULK',
}

/**
 * Enrollment Status - Track the state of enrollment
 */
export enum EnrollmentStatusEnum {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
}

/**
 * Enrollment Source - How the enrollment was created
 */
export enum EnrollmentSourceEnum {
  MANUAL = 'MANUAL',
  BULK_UPLOAD = 'BULK_UPLOAD',
  ACADEMIC_YEAR_ASSIGNMENT = 'ACADEMIC_YEAR_ASSIGNMENT',
  AUTO_ENROLLMENT = 'AUTO_ENROLLMENT',
}

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  collection: 'student_enrollments',
})
export class StudentEnrollment extends Document {
  declare _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Student.name,
    required: true,
    index: true,
  })
  student_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Module.name, required: true, index: true })
  module_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  school_id: Types.ObjectId;

  @Prop({
    enum: EnrollmentTypeEnum,
    default: EnrollmentTypeEnum.INDIVIDUAL,
    index: true,
  })
  enrollment_type: EnrollmentTypeEnum;

  @Prop({
    enum: EnrollmentStatusEnum,
    default: EnrollmentStatusEnum.ACTIVE,
    index: true,
  })
  status: EnrollmentStatusEnum;

  @Prop({
    enum: EnrollmentSourceEnum,
    default: EnrollmentSourceEnum.MANUAL,
  })
  source: EnrollmentSourceEnum;

  // Academic year for cohort enrollments (1-5)
  @Prop({ type: Number, min: 1, max: 5, index: true })
  academic_year: number;

  // Batch ID for bulk enrollments (to group related enrollments)
  @Prop({ type: String, index: true })
  batch_id: string;

  // Who enrolled the student
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  enrolled_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  enrolled_by_role: RoleEnum;

  @Prop({ type: String })
  enrolled_by_name: string;

  // Enrollment timestamps
  @Prop({ type: Date, default: Date.now })
  enrolled_at: Date;

  @Prop({ type: Date })
  completed_at: Date;

  @Prop({ type: Date })
  withdrawn_at: Date;

  // Who withdrew/removed the enrollment
  @Prop({ type: Types.ObjectId, ref: User.name })
  withdrawn_by: Types.ObjectId;

  @Prop({ type: String })
  withdrawal_reason: string;

  // Notes/comments about the enrollment
  @Prop({ type: String })
  notes: string;

  // Track if notification was sent
  @Prop({ type: Boolean, default: false })
  notification_sent: boolean;

  @Prop({ type: Date })
  notification_sent_at: Date;

  @Prop({ type: Boolean, default: false })
  email_notification_sent: boolean;

  @Prop({ type: Date })
  email_notification_sent_at: Date;

  // Soft delete
  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const StudentEnrollmentSchema = SchemaFactory.createForClass(StudentEnrollment);

// Compound indexes for common queries
StudentEnrollmentSchema.index({ student_id: 1, module_id: 1 }, { unique: true, partialFilterExpression: { deleted_at: null } });
StudentEnrollmentSchema.index({ school_id: 1, academic_year: 1 });
StudentEnrollmentSchema.index({ enrolled_by: 1, enrolled_at: -1 });
StudentEnrollmentSchema.index({ batch_id: 1, enrolled_at: -1 });
StudentEnrollmentSchema.index({ status: 1, school_id: 1 });

