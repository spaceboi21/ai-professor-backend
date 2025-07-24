import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { Module } from './module.schema';
import { RoleEnum } from 'src/common/constants/roles.constant';

@Schema({
  collection: 'module_professor_assignments',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class ModuleProfessorAssignment extends Document {
  declare _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Module.name, required: true, index: true })
  module_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  professor_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  assigned_by: Types.ObjectId;

  @Prop({ type: String, enum: RoleEnum, default: null })
  assigned_by_role: RoleEnum | null;

  @Prop({ type: Date, default: null })
  assigned_at: Date | null;

  @Prop({ type: Date, default: null })
  unassigned_at: Date | null;

  @Prop({ type: Types.ObjectId, ref: User.name, index: true, default: null })
  unassigned_by: Types.ObjectId | null;

  @Prop({ type: String, enum: RoleEnum, default: null })
  unassigned_by_role: RoleEnum | null;

  @Prop({ type: Boolean, default: true, index: true })
  is_active: boolean;

  @Prop({ type: Date, default: null })
  deleted_at: Date | null;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ModuleProfessorAssignmentSchema = SchemaFactory.createForClass(
  ModuleProfessorAssignment,
);

// Create compound index for module_id and professor_id to ensure unique assignments
ModuleProfessorAssignmentSchema.index(
  { module_id: 1, professor_id: 1 },
  { unique: true },
);

// Create index for active assignments
ModuleProfessorAssignmentSchema.index({ module_id: 1, is_active: 1 });
ModuleProfessorAssignmentSchema.index({ professor_id: 1, is_active: 1 });
