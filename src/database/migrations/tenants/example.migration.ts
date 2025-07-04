import mongoose from 'mongoose';

export async function up(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  //   await connection.collection('dummies').updateMany(
  //     { deleted: { $exists: false } },
  //     { $set: { deleted: false } }
  //   );
  //   await mongoose.disconnect();
  //   console.info(`Migration up: added deleted=false to dummies in ${tenantDbName}`);
}

export async function down(
  connection: mongoose.Connection,
  tenantDbName: string,
) {
  //   await connection.collection('dummies').updateMany(
  //     {},
  //     { $unset: { deleted: "" } }
  //   );
  //   await mongoose.disconnect();
  //   console.info(`Migration down: removed deleted from dummies in ${tenantDbName}`);
}
