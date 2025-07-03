import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class GlobalStudent extends Document {
  @Prop({ type: Types.ObjectId })
  declare _id: Types.ObjectId;

  // Primary key (indexed)
  @Prop({ type: Types.ObjectId, index: true })
  student_id: Types.ObjectId;

  // Indexed email
  @Prop({ required: true, index: true })
  email: string;

  // Reference to Schools_central._id
  @Prop({ type: Types.ObjectId, ref: 'schools', index: true })
  school_id: Types.ObjectId;

  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export const GlobalStudentSchema = SchemaFactory.createForClass(GlobalStudent);
