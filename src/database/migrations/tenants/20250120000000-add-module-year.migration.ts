import mongoose from 'mongoose';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration up: Adding year field to modules in ${tenantDbName}...`,
  );

  // Add year field to modules that don't have it, setting default value to 1
  const modulesResult = await connection
    .collection('modules')
    .updateMany(
      { year: { $exists: false } },
      { $set: { year: 1 } },
    );

  console.info(
    `Updated ${modulesResult.modifiedCount} modules with year=1 in ${tenantDbName}`,
  );

  console.info(
    `Migration up: Completed adding year field to modules in ${tenantDbName}`,
  );
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration down: Removing year field from modules in ${tenantDbName}...`,
  );

  // Remove year field from modules
  const modulesResult = await connection
    .collection('modules')
    .updateMany(
      { year: { $exists: true } },
      { $unset: { year: 1 } },
    );

  console.info(
    `Removed year field from ${modulesResult.modifiedCount} modules in ${tenantDbName}`,
  );

  console.info(
    `Migration down: Completed removing year field from modules in ${tenantDbName}`,
  );
}
