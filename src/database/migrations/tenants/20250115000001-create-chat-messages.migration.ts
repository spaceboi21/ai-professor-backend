import mongoose from 'mongoose';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(`Migration up: Creating chat messages schema in ${tenantDbName}`);

  // Create chat_messages collection
  await connection.createCollection('chat_messages');
  
  // Create indexes for better query performance
  await connection
    .collection('chat_messages')
    .createIndex({ sender_id: 1, receiver_id: 1 }, { background: true });
  
  await connection
    .collection('chat_messages')
    .createIndex({ receiver_id: 1, sender_id: 1 }, { background: true });
  
  await connection
    .collection('chat_messages')
    .createIndex({ sender_id: 1, created_at: -1 }, { background: true });
  
  await connection
    .collection('chat_messages')
    .createIndex({ receiver_id: 1, created_at: -1 }, { background: true });
  
  await connection
    .collection('chat_messages')
    .createIndex({ is_read: 1, receiver_id: 1 }, { background: true });
  
  await connection
    .collection('chat_messages')
    .createIndex({ deleted_at: 1 }, { background: true });

  console.info(
    `Migration up: Chat messages schema created successfully in ${tenantDbName}`,
  );
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration down: Dropping chat messages schema from ${tenantDbName}`,
  );

  // Drop the chat_messages collection
  await connection.collection('chat_messages').drop();

  console.info(
    `Migration down: Chat messages schema dropped from ${tenantDbName}`,
  );
} 