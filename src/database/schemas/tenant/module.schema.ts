import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../central/user.schema';
import { DifficultyEnum } from 'src/common/constants/difficulty.constant';
import { RoleEnum } from 'src/common/constants/roles.constant';
import { DEFAULT_IMAGES } from 'src/common/constants/default-images.constant';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Module extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  category: string;

  @Prop({ required: true, type: Number })
  duration: number; // in minutes

  @Prop({ required: true, enum: DifficultyEnum })
  difficulty: DifficultyEnum;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: DEFAULT_IMAGES.MODULE_THUMBNAIL })
  thumbnail: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  created_by: Types.ObjectId;

  @Prop({ required: true, enum: RoleEnum })
  created_by_role: RoleEnum;

  @Prop({ type: Date, default: null })
  deleted_at: Date;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const ModuleSchema = SchemaFactory.createForClass(Module);
