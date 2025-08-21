import mongoose from 'mongoose';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  // Create learning_log_reviews collection with schema validation
  await connection.createCollection('learning_log_reviews');
  
  // Create indexes for better query performance
  await connection.collection('learning_log_reviews').createIndex(
    { ai_feedback_id: 1, reviewer_role: 1 },
    { name: 'idx_ai_feedback_reviewer_role' }
  );
  
  await connection.collection('learning_log_reviews').createIndex(
    { reviewer_id: 1, reviewer_role: 1 },
    { name: 'idx_reviewer_id_role' }
  );
  
  await connection.collection('learning_log_reviews').createIndex(
    { created_at: -1 },
    { name: 'idx_created_at' }
  );
  
  console.info(`Migration up: created learning_log_reviews collection in ${tenantDbName}`);
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  await connection.collection('learning_log_reviews').drop();
  console.info(`Migration down: dropped learning_log_reviews collection in ${tenantDbName}`);
} 