import mongoose from 'mongoose';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration up: Creating forum mentions collection in ${tenantDbName}`,
  );

  // Create forum_mentions collection
  await connection.createCollection('forum_mentions');
  await connection
    .collection('forum_mentions')
    .createIndex({ reply_id: 1, mentioned_user: 1 });
  await connection
    .collection('forum_mentions')
    .createIndex({ discussion_id: 1, mentioned_user: 1 });
  await connection
    .collection('forum_mentions')
    .createIndex({ mentioned_by: 1 });
  await connection
    .collection('forum_mentions')
    .createIndex({ mentioned_user: 1 });
  await connection.collection('forum_mentions').createIndex({ created_at: -1 });

  console.info(
    `Migration up: Forum mentions collection created successfully in ${tenantDbName}`,
  );
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration down: Dropping forum mentions collection in ${tenantDbName}`,
  );

  // Drop forum_mentions collection
  await connection.dropCollection('forum_mentions');

  console.info(
    `Migration down: Forum mentions collection dropped successfully in ${tenantDbName}`,
  );
}
