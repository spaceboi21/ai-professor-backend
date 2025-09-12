import mongoose from 'mongoose';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration up: Adding sequence field to modules in ${tenantDbName}...`,
  );

  // Add sequence field to modules that don't have it, setting default value to null
  const modulesResult = await connection
    .collection('modules')
    .updateMany(
      { sequence: { $exists: false } },
      { $set: { sequence: null } },
    );

  console.info(
    `Updated ${modulesResult.modifiedCount} modules with sequence=null in ${tenantDbName}`,
  );

  // Create index on sequence field for better query performance
  try {
    await connection.collection('modules').createIndex(
      { "sequence": 1, "year": 1, "deleted_at": 1 },
      { 
        name: "sequence_year_deleted_idx",
        partialFilterExpression: { 
          "sequence": { $exists: true, $ne: null },
          "deleted_at": null 
        }
      }
    );
    console.info(`Created sequence_year_deleted_idx index in ${tenantDbName}`);
  } catch (error) {
    console.warn(`Failed to create sequence_year_deleted_idx index in ${tenantDbName}:`, error);
  }

  // Create compound index for sequence-based queries
  try {
    await connection.collection('modules').createIndex(
      { "year": 1, "sequence": 1, "deleted_at": 1 },
      { 
        name: "year_sequence_deleted_idx",
        partialFilterExpression: { 
          "sequence": { $exists: true, $ne: null },
          "deleted_at": null 
        }
      }
    );
    console.info(`Created year_sequence_deleted_idx index in ${tenantDbName}`);
  } catch (error) {
    console.warn(`Failed to create year_sequence_deleted_idx index in ${tenantDbName}:`, error);
  }

  console.info(
    `Migration up: Completed adding sequence field to modules in ${tenantDbName}`,
  );
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  console.info(
    `Migration down: Removing sequence field from modules in ${tenantDbName}...`,
  );

  // Drop the indexes
  try {
    await connection.collection('modules').dropIndex("sequence_year_deleted_idx");
    console.info(`Dropped sequence_year_deleted_idx index in ${tenantDbName}`);
  } catch (error) {
    console.warn(`Failed to drop sequence_year_deleted_idx index in ${tenantDbName}:`, error);
  }

  try {
    await connection.collection('modules').dropIndex("year_sequence_deleted_idx");
    console.info(`Dropped year_sequence_deleted_idx index in ${tenantDbName}`);
  } catch (error) {
    console.warn(`Failed to drop year_sequence_deleted_idx index in ${tenantDbName}:`, error);
  }

  // Remove sequence field from all modules
  const modulesResult = await connection
    .collection('modules')
    .updateMany(
      { sequence: { $exists: true } },
      { $unset: { sequence: 1 } },
    );

  console.info(
    `Removed sequence field from ${modulesResult.modifiedCount} modules in ${tenantDbName}`,
  );

  console.info(
    `Migration down: Completed removing sequence field from modules in ${tenantDbName}`,
  );
}
