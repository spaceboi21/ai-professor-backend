import mongoose from 'mongoose';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(`Migration up: Creating anchor tag schemas in ${tenantDbName}`);

  // Create anchor_tags collection
  await connection.createCollection('anchor_tags');
  await connection
    .collection('anchor_tags')
    .createIndex({ module_id: 1, chapter_id: 1, bibliography_id: 1 });
  await connection
    .collection('anchor_tags')
    .createIndex({ bibliography_id: 1, content_type: 1, status: 1 });
  await connection.collection('anchor_tags').createIndex({ quiz_group_id: 1 });
  await connection
    .collection('anchor_tags')
    .createIndex({ created_by: 1, status: 1 });
  await connection
    .collection('anchor_tags')
    .createIndex({ content_type: 1, content_reference: 1 });
  await connection
    .collection('anchor_tags')
    .createIndex({ is_mandatory: 1, status: 1 });
  await connection.collection('anchor_tags').createIndex({ deleted_at: 1 });
  await connection.collection('anchor_tags').createIndex({ created_at: -1 });

  // Create student_anchor_tag_attempts collection
  await connection.createCollection('student_anchor_tag_attempts');
  await connection
    .collection('student_anchor_tag_attempts')
    .createIndex({ student_id: 1, anchor_tag_id: 1 });
  await connection
    .collection('student_anchor_tag_attempts')
    .createIndex(
      { student_id: 1, anchor_tag_id: 1, attempt_number: 1 },
      { unique: true },
    );
  await connection
    .collection('student_anchor_tag_attempts')
    .createIndex({ student_id: 1, module_id: 1 });
  await connection
    .collection('student_anchor_tag_attempts')
    .createIndex({ student_id: 1, chapter_id: 1 });
  await connection
    .collection('student_anchor_tag_attempts')
    .createIndex({ student_id: 1, bibliography_id: 1 });
  await connection
    .collection('student_anchor_tag_attempts')
    .createIndex({ student_id: 1, status: 1 });
  await connection
    .collection('student_anchor_tag_attempts')
    .createIndex({ anchor_tag_id: 1, status: 1 });
  await connection
    .collection('student_anchor_tag_attempts')
    .createIndex({ bibliography_id: 1, status: 1 });
  await connection
    .collection('student_anchor_tag_attempts')
    .createIndex({ started_at: 1 });
  await connection
    .collection('student_anchor_tag_attempts')
    .createIndex({ completed_at: 1 });
  await connection
    .collection('student_anchor_tag_attempts')
    .createIndex({ is_correct: 1 });
  await connection
    .collection('student_anchor_tag_attempts')
    .createIndex({ deleted_at: 1 });

  console.info(
    `✅ Migration up completed: Anchor tag schemas created in ${tenantDbName}`,
  );
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration down: Dropping anchor tag schemas in ${tenantDbName}`,
  );

  // Drop student_anchor_tag_attempts collection
  await connection.dropCollection('student_anchor_tag_attempts');

  // Drop anchor_tags collection
  await connection.dropCollection('anchor_tags');

  console.info(
    `✅ Migration down completed: Anchor tag schemas dropped in ${tenantDbName}`,
  );
}
