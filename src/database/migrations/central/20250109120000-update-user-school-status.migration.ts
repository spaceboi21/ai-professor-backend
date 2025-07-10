import mongoose from 'mongoose';
import { StatusEnum } from 'src/common/constants/status.constant';

export async function up(connection: mongoose.Connection) {
  console.info('Migration up: Starting status update for users and schools...');

  // Update users collection - set status to ACTIVE for records that don't have a status
  const usersResult = await connection
    .collection('users')
    .updateMany(
      { status: { $exists: false } },
      { $set: { status: StatusEnum.ACTIVE } },
    );

  console.info(`Updated ${usersResult.modifiedCount} users with ACTIVE status`);

  // Update schools collection - set status to ACTIVE for records that don't have a status
  const schoolsResult = await connection
    .collection('schools')
    .updateMany(
      { status: { $exists: false } },
      { $set: { status: StatusEnum.ACTIVE } },
    );

  console.info(
    `Updated ${schoolsResult.modifiedCount} schools with ACTIVE status`,
  );

  // Optional: Update specific users or schools to INACTIVE if needed
  // Example: Set deleted users/schools to INACTIVE status
  const deletedUsersResult = await connection.collection('users').updateMany(
    {
      deleted_at: { $ne: null },
      status: StatusEnum.ACTIVE,
    },
    { $set: { status: 'INACTIVE' } },
  );

  console.info(
    `Updated ${deletedUsersResult.modifiedCount} deleted users to INACTIVE status`,
  );

  const deletedSchoolsResult = await connection
    .collection('schools')
    .updateMany(
      {
        deleted_at: { $ne: null },
        status: StatusEnum.ACTIVE,
      },
      { $set: { status: 'INACTIVE' } },
    );

  console.info(
    `Updated ${deletedSchoolsResult.modifiedCount} deleted schools to INACTIVE status`,
  );

  console.info('Migration up: Completed status update for users and schools');
}

export async function down(connection: mongoose.Connection) {
  console.info(
    'Migration down: Reverting status update for users and schools...',
  );

  // Note: We don't remove the status field as it's part of the schema
  // Instead, we reset all statuses to ACTIVE (the default)

  const usersResult = await connection
    .collection('users')
    .updateMany({}, { $set: { status: StatusEnum.ACTIVE } });

  console.info(`Reset ${usersResult.modifiedCount} users to ACTIVE status`);

  const schoolsResult = await connection
    .collection('schools')
    .updateMany({}, { $set: { status: StatusEnum.ACTIVE } });

  console.info(`Reset ${schoolsResult.modifiedCount} schools to ACTIVE status`);

  console.info(
    'Migration down: Completed reverting status update for users and schools',
  );
}
