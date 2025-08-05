import { connect, disconnect } from 'mongoose';
import {
  Notification,
  NotificationSchema,
} from '../database/schemas/tenant/notification.schema';
import { createMultiLanguageContent } from '../common/utils/notification.utils';

/**
 * Migration script to convert existing single-language notifications to multi-language format
 * This script should be run once to migrate existing notifications
 */
async function migrateNotificationsToMultiLanguage() {
  try {
    // Connect to MongoDB (you'll need to set the connection string)
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';
    await connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get all tenant databases (you'll need to implement this based on your setup)
    const tenantDatabases = await getTenantDatabases();

    for (const dbName of tenantDatabases) {
      console.log(`Migrating notifications in database: ${dbName}`);

      // Connect to tenant database
      const tenantConnection = await connect(`${mongoUri}/${dbName}`);
      const NotificationModel = tenantConnection.model(
        Notification.name,
        NotificationSchema,
      );

      // Find all notifications that don't have multi-language format
      const notifications = await NotificationModel.find({
        $or: [{ title: { $type: 'string' } }, { message: { $type: 'string' } }],
      });

      console.log(
        `Found ${notifications.length} notifications to migrate in ${dbName}`,
      );

      for (const notification of notifications) {
        try {
          // Convert single language content to multi-language
          const titleEn =
            typeof notification.title === 'string'
              ? notification.title
              : 'Notification';
          const titleFr =
            typeof notification.title === 'string'
              ? notification.title
              : 'Notification';
          const messageEn =
            typeof notification.message === 'string'
              ? notification.message
              : 'You have a new notification.';
          const messageFr =
            typeof notification.message === 'string'
              ? notification.message
              : 'Vous avez une nouvelle notification.';

          // Update the notification with multi-language content
          await NotificationModel.findByIdAndUpdate(notification._id, {
            title: createMultiLanguageContent(titleEn, titleFr),
            message: createMultiLanguageContent(messageEn, messageFr),
            updated_at: new Date(),
          });

          console.log(`Migrated notification ${notification._id} in ${dbName}`);
        } catch (error) {
          console.error(
            `Error migrating notification ${notification._id} in ${dbName}:`,
            error,
          );
        }
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await disconnect();
    console.log('Disconnected from MongoDB');
  }
}

/**
 * Get all tenant database names
 * This is a placeholder - implement based on your database structure
 */
async function getTenantDatabases(): Promise<string[]> {
  // This should be implemented based on how you store tenant database names
  // For example, you might have a central database with school information
  // that contains the database names for each school

  // Placeholder implementation
  return ['tenant1', 'tenant2', 'tenant3']; // Replace with actual tenant database names
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateNotificationsToMultiLanguage()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateNotificationsToMultiLanguage };
