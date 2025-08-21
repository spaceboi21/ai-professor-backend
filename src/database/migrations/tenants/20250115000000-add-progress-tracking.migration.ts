import * as mongoose from 'mongoose';
import { StudentModuleProgressSchema } from '../../schemas/tenant/student-module-progress.schema';
import { StudentChapterProgressSchema } from '../../schemas/tenant/student-chapter-progress.schema';
import { StudentQuizAttemptSchema } from '../../schemas/tenant/student-quiz-attempt.schema';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(`Adding progress tracking collections to ${tenantDbName}...`);

  try {
    // Create student_module_progress collection with optimized indexes
    const studentModuleProgressCollection = connection.collection(
      'student_module_progress',
    );

    // Create indexes for student_module_progress
    await studentModuleProgressCollection.createIndexes([
      {
        key: { student_id: 1, module_id: 1 },
        unique: true,
        name: 'student_module_unique',
      },
      { key: { student_id: 1, status: 1 }, name: 'student_status_idx' },
      { key: { module_id: 1, status: 1 }, name: 'module_status_idx' },
      { key: { progress_percentage: 1 }, name: 'progress_percentage_idx' },
      { key: { last_accessed_at: 1 }, name: 'last_accessed_idx' },
      {
        key: { student_id: 1, last_accessed_at: -1 },
        name: 'student_recent_activity_idx',
      },
      { key: { created_at: 1 }, name: 'created_at_idx' },
      { key: { completed_at: 1 }, sparse: true, name: 'completed_at_idx' },
    ]);

    // Create student_chapter_progress collection with optimized indexes
    const studentChapterProgressCollection = connection.collection(
      'student_chapter_progress',
    );

    // Create indexes for student_chapter_progress
    await studentChapterProgressCollection.createIndexes([
      {
        key: { student_id: 1, chapter_id: 1 },
        unique: true,
        name: 'student_chapter_unique',
      },
      {
        key: { student_id: 1, module_id: 1 },
        name: 'student_module_chapters_idx',
      },
      {
        key: { student_id: 1, module_id: 1, chapter_sequence: 1 },
        name: 'student_module_sequence_idx',
      },
      { key: { student_id: 1, status: 1 }, name: 'student_chapter_status_idx' },
      { key: { chapter_id: 1, status: 1 }, name: 'chapter_status_idx' },
      { key: { module_id: 1, status: 1 }, name: 'module_chapter_status_idx' },
      { key: { chapter_quiz_completed: 1 }, name: 'quiz_completed_idx' },
      { key: { last_accessed_at: 1 }, name: 'chapter_last_accessed_idx' },
      {
        key: { student_id: 1, module_id: 1, chapter_quiz_completed: 1 },
        name: 'student_module_quiz_status_idx',
      },
      { key: { created_at: 1 }, name: 'chapter_created_at_idx' },
    ]);

    // Create student_quiz_attempts collection with optimized indexes
    const studentQuizAttemptsCollection = connection.collection(
      'student_quiz_attempts',
    );

    // Create indexes for student_quiz_attempts
    await studentQuizAttemptsCollection.createIndexes([
      {
        key: { student_id: 1, quiz_group_id: 1 },
        name: 'student_quiz_group_idx',
      },
      {
        key: { student_id: 1, quiz_group_id: 1, attempt_number: 1 },
        unique: true,
        name: 'student_quiz_attempt_unique',
      },
      {
        key: { student_id: 1, module_id: 1 },
        name: 'student_module_attempts_idx',
      },
      {
        key: { student_id: 1, chapter_id: 1 },
        name: 'student_chapter_attempts_idx',
      },
      { key: { student_id: 1, status: 1 }, name: 'student_attempt_status_idx' },
      { key: { quiz_group_id: 1, status: 1 }, name: 'quiz_group_status_idx' },
      { key: { score_percentage: 1 }, name: 'score_percentage_idx' },
      { key: { is_passed: 1 }, name: 'is_passed_idx' },
      { key: { started_at: 1 }, name: 'attempt_started_at_idx' },
      {
        key: { completed_at: 1 },
        sparse: true,
        name: 'attempt_completed_at_idx',
      },
      {
        key: { student_id: 1, started_at: -1 },
        name: 'student_recent_attempts_idx',
      },
      {
        key: { quiz_group_id: 1, started_at: -1 },
        name: 'quiz_group_recent_attempts_idx',
      },
      {
        key: { student_id: 1, quiz_group_id: 1, is_passed: 1 },
        name: 'student_quiz_passed_idx',
      },
    ]);

    console.info(
      `✅ Progress tracking collections and indexes created successfully in ${tenantDbName}`,
    );
  } catch (error) {
    console.error(
      `❌ Error creating progress tracking collections in ${tenantDbName}:`,
      error,
    );
    throw error;
  }
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Removing progress tracking collections from ${tenantDbName}...`,
  );

  try {
    // Drop the collections
    await connection
      .collection('student_module_progress')
      .drop()
      .catch(() => {
        console.info(
          'student_module_progress collection does not exist, skipping...',
        );
      });

    await connection
      .collection('student_chapter_progress')
      .drop()
      .catch(() => {
        console.info(
          'student_chapter_progress collection does not exist, skipping...',
        );
      });

    await connection
      .collection('student_quiz_attempts')
      .drop()
      .catch(() => {
        console.info(
          'student_quiz_attempts collection does not exist, skipping...',
        );
      });

    console.info(
      `✅ Progress tracking collections removed successfully from ${tenantDbName}`,
    );
  } catch (error) {
    console.error(
      `❌ Error removing progress tracking collections from ${tenantDbName}:`,
      error,
    );
    throw error;
  }
}
