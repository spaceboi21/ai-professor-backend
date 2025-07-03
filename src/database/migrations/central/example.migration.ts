import mongoose from 'mongoose';

export async function up(connection: mongoose.Connection) {
  //   await connection
  //     .collection('dummies')
  //     .updateMany({ deleted: { $exists: false } }, { $set: { deleted: false } });
  //   await mongoose.disconnect();
  //   console.log('Migration up: added deleted=false to dummies');
}

export async function down(connection: mongoose.Connection) {
  //   await connection.collection('dummies').updateMany({}, { $unset: { deleted: '' } });
  //   await mongoose.disconnect();
  //   console.log('Migration down: removed deleted from dummies');
}
