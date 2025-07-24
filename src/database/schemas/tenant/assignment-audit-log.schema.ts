import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { Module } from './module.schema';
import { RoleEnum } from 'src/common/constants/roles.constant';

export enum AssignmentActionEnum {
  ASSIGN = 'ASSIGN',
  UNASSIGN = 'UNASSIGN',
}

@Schema({
  collection: 'assignment_audit_logs',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class AssignmentAuditLog extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Module.name, required: true, index: true })
  module_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  professor_id: Types.ObjectId;

  @Prop({ type: String, required: true, enum: AssignmentActionEnum })
  action: AssignmentActionEnum;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  performed_by: Types.ObjectId;

  @Prop({ type: String, required: true, enum: RoleEnum })
  performed_by_role: RoleEnum;

  @Prop({ type: String, required: true })
  action_description: string;

  @Prop({ type: Object, default: {} })
  previous_data: Record<string, any>;

  @Prop({ type: Object, default: {} })
  new_data: Record<string, any>;

  @Prop({ type: String })
  reason: string;

  @Prop({ type: String })
  ip_address: string;

  @Prop({ type: String })
  user_agent: string;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const AssignmentAuditLogSchema =
  SchemaFactory.createForClass(AssignmentAuditLog);

// Create indexes for efficient querying
AssignmentAuditLogSchema.index({ module_id: 1, created_at: -1 });
AssignmentAuditLogSchema.index({ professor_id: 1, created_at: -1 });
AssignmentAuditLogSchema.index({ performed_by: 1, created_at: -1 });
AssignmentAuditLogSchema.index({ action: 1, created_at: -1 });
