import mongoose from 'mongoose';
import { DEFAULT_IMAGES } from 'src/common/constants/default-images.constant';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration up: Adding thumbnail field to modules in ${tenantDbName}...`,
  );

  // Add thumbnail field to modules that don't have it
  const modulesResult = await connection
    .collection('modules')
    .updateMany(
      { thumbnail: { $exists: false } },
      { $set: { thumbnail: DEFAULT_IMAGES.MODULE_THUMBNAIL } },
    );

  console.info(
    `Updated ${modulesResult.modifiedCount} modules with default thumbnail in ${tenantDbName}`,
  );

  console.info(
    `Migration up: Completed adding thumbnail field to modules in ${tenantDbName}`,
  );
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration down: Removing thumbnail field from modules in ${tenantDbName}...`,
  );

  // Remove thumbnail field from modules
  const modulesResult = await connection
    .collection('modules')
    .updateMany({ thumbnail: { $exists: true } }, { $unset: { thumbnail: 1 } });

  console.info(
    `Removed thumbnail field from ${modulesResult.modifiedCount} modules in ${tenantDbName}`,
  );

  console.info(
    `Migration down: Completed removing thumbnail field from modules in ${tenantDbName}`,
  );
}
