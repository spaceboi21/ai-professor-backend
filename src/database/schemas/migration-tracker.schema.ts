import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  collection: 'migration_tracker',
  timestamps: {
    createdAt: 'executed_at',
    updatedAt: false,
  },
})
export class MigrationTracker extends Document {
  @Prop({ required: true, unique: true, index: true })
  migration_name: string;

  @Prop({ required: true })
  migration_type: 'central' | 'tenant';

  @Prop()
  tenant_db_name?: string;

  @Prop({ default: Date.now })
  executed_at: Date;

  @Prop()
  execution_time_ms: number;

  @Prop()
  success: boolean;

  @Prop()
  error_message?: string;
}

export const MigrationTrackerSchema =
  SchemaFactory.createForClass(MigrationTracker);
