import mongoose from 'mongoose';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(`Migration up: Creating community schemas in ${tenantDbName}`);

  // Create forum_discussions collection
  await connection.createCollection('forum_discussions');
  await connection
    .collection('forum_discussions')
    .createIndex({ created_by: 1, status: 1 });
  await connection
    .collection('forum_discussions')
    .createIndex({ type: 1, status: 1 });
  await connection
    .collection('forum_discussions')
    .createIndex({ tags: 1, status: 1 });
  await connection
    .collection('forum_discussions')
    .createIndex({ created_at: -1 });
  await connection
    .collection('forum_discussions')
    .createIndex({ meeting_scheduled_at: 1, status: 1 });

  // Create forum_replies collection
  await connection.createCollection('forum_replies');
  await connection
    .collection('forum_replies')
    .createIndex({ discussion_id: 1, status: 1 });
  await connection
    .collection('forum_replies')
    .createIndex({ created_by: 1, status: 1 });
  await connection
    .collection('forum_replies')
    .createIndex({ parent_reply_id: 1, status: 1 });
  await connection.collection('forum_replies').createIndex({ created_at: 1 });

  // Create forum_likes collection
  await connection.createCollection('forum_likes');
  await connection
    .collection('forum_likes')
    .createIndex(
      { entity_type: 1, entity_id: 1, liked_by: 1 },
      { unique: true },
    );
  await connection
    .collection('forum_likes')
    .createIndex({ entity_type: 1, entity_id: 1 });
  await connection.collection('forum_likes').createIndex({ liked_by: 1 });

  // Create forum_reports collection
  await connection.createCollection('forum_reports');
  await connection
    .collection('forum_reports')
    .createIndex({ entity_type: 1, entity_id: 1 });
  await connection
    .collection('forum_reports')
    .createIndex({ reported_by: 1, status: 1 });
  await connection
    .collection('forum_reports')
    .createIndex({ status: 1, created_at: -1 });
  await connection
    .collection('forum_reports')
    .createIndex({ report_type: 1, status: 1 });

  console.info(
    `Migration up: Community schemas created successfully in ${tenantDbName}`,
  );
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration down: Dropping community schemas from ${tenantDbName}`,
  );

  // Drop collections
  await connection.collection('forum_discussions').drop();
  await connection.collection('forum_replies').drop();
  await connection.collection('forum_likes').drop();
  await connection.collection('forum_reports').drop();

  console.info(
    `Migration down: Community schemas dropped from ${tenantDbName}`,
  );
}
