import mongoose from 'mongoose';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration up: Adding is_csv_upload field to students in ${tenantDbName}...`,
  );

  // Add is_csv_upload field to students collection - set to false for existing records
  const studentsResult = await connection
    .collection('students')
    .updateMany(
      { is_csv_upload: { $exists: false } },
      { $set: { is_csv_upload: false } },
    );

  console.info(
    `Updated ${studentsResult.modifiedCount} students with is_csv_upload field in ${tenantDbName}`,
  );

  console.info(
    `Migration up: Completed adding is_csv_upload field to students in ${tenantDbName}`,
  );
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration down: Removing is_csv_upload field from students in ${tenantDbName}...`,
  );

  // Remove is_csv_upload field from students collection
  const studentsResult = await connection
    .collection('students')
    .updateMany(
      { is_csv_upload: { $exists: true } },
      { $unset: { is_csv_upload: '' } },
    );

  console.info(
    `Removed is_csv_upload field from ${studentsResult.modifiedCount} students in ${tenantDbName}`,
  );

  console.info(
    `Migration down: Completed removing is_csv_upload field from students in ${tenantDbName}`,
  );
}
