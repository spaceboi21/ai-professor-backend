import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Role extends Document {
  @Prop({ type: Types.ObjectId })
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  // Cretae a timestamp created_at and updated_at
  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
