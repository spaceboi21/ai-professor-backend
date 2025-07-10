import mongoose from 'mongoose';
import { StatusEnum } from 'src/common/constants/status.constant';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration up: Starting status update for students in ${tenantDbName}...`,
  );

  // Update students collection - set status to ACTIVE for records that don't have a status
  const studentsResult = await connection
    .collection('students')
    .updateMany(
      { status: { $exists: false } },
      { $set: { status: StatusEnum.ACTIVE } },
    );

  console.info(
    `Updated ${studentsResult.modifiedCount} students with ACTIVE status in ${tenantDbName}`,
  );

  // Optional: Update specific students to INACTIVE if needed
  // Example: Set deleted students to INACTIVE status
  const deletedStudentsResult = await connection
    .collection('students')
    .updateMany(
      {
        deleted_at: { $ne: null },
        status: StatusEnum.ACTIVE,
      },
      { $set: { status: StatusEnum.INACTIVE } },
    );

  console.info(
    `Updated ${deletedStudentsResult.modifiedCount} deleted students to INACTIVE status in ${tenantDbName}`,
  );

  console.info(
    `Migration up: Completed status update for students in ${tenantDbName}`,
  );
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration down: Reverting status update for students in ${tenantDbName}...`,
  );

  // Note: We don't remove the status field as it's part of the schema
  // Instead, we reset all statuses to ACTIVE (the default)

  const studentsResult = await connection
    .collection('students')
    .updateMany({}, { $set: { status: StatusEnum.ACTIVE } });

  console.info(
    `Reset ${studentsResult.modifiedCount} students to ACTIVE status in ${tenantDbName}`,
  );

  console.info(
    `Migration down: Completed reverting status update for students in ${tenantDbName}`,
  );
}
