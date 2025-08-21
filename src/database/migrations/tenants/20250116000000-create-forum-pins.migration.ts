import mongoose from 'mongoose';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration up: Creating forum pins collection in ${tenantDbName}`,
  );

  // Create forum_pins collection
  await connection.createCollection('forum_pins');
  await connection
    .collection('forum_pins')
    .createIndex({ discussion_id: 1, pinned_by: 1 }, { unique: true });
  await connection.collection('forum_pins').createIndex({ pinned_by: 1 });
  await connection.collection('forum_pins').createIndex({ discussion_id: 1 });
  await connection.collection('forum_pins').createIndex({ created_at: -1 });
  // Compound index for efficient pin status queries
  await connection
    .collection('forum_pins')
    .createIndex({ pinned_by: 1, created_at: -1 });
  // Index for aggregation queries
  await connection
    .collection('forum_pins')
    .createIndex({ discussion_id: 1, pinned_by: 1, created_at: -1 });

  console.info(
    `Migration up: Forum pins collection created successfully in ${tenantDbName}`,
  );
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration down: Dropping forum pins collection in ${tenantDbName}`,
  );

  // Drop forum_pins collection
  await connection.dropCollection('forum_pins');

  console.info(
    `Migration down: Forum pins collection dropped successfully in ${tenantDbName}`,
  );
}
