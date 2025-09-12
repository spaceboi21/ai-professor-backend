import mongoose from 'mongoose';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration up: Adding year field to students in ${tenantDbName}...`,
  );

  // Add year field to students that don't have it, setting default value to 1
  const studentsResult = await connection
    .collection('students')
    .updateMany(
      { year: { $exists: false } },
      { $set: { year: 1 } },
    );

  console.info(
    `Updated ${studentsResult.modifiedCount} students with year=1 in ${tenantDbName}`,
  );

  console.info(
    `Migration up: Completed adding year field to students in ${tenantDbName}`,
  );
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration down: Removing year field from students in ${tenantDbName}...`,
  );

  // Remove year field from students
  const studentsResult = await connection
    .collection('students')
    .updateMany(
      { year: { $exists: true } },
      { $unset: { year: 1 } },
    );

  console.info(
    `Removed year field from ${studentsResult.modifiedCount} students in ${tenantDbName}`,
  );

  console.info(
    `Migration down: Completed removing year field from students in ${tenantDbName}`,
  );
}
