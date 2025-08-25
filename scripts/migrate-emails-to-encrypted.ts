import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EmailEncryptionService } from '../src/common/services/email-encryption.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Logger } from '@nestjs/common';

async function migrateEmailsToEncrypted() {
  const logger = new Logger('EmailMigration');
  
  try {
    logger.log('Starting email encryption migration...');
    
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Get services
    const emailEncryptionService = app.get(EmailEncryptionService);
    const connection = app.get<Connection>(getConnectionToken());
    
    // Get all collections that might contain emails
    const collections = ['users', 'global_students', 'schools', 'activity_logs'];
    
    for (const collectionName of collections) {
      logger.log(`Migrating collection: ${collectionName}`);
      
      const collection = connection.collection(collectionName);
      
      // Find all documents with email fields
      const documents = await collection.find({}).toArray();
      
      let migratedCount = 0;
      
      for (const doc of documents) {
        let updated = false;
        const updateData: any = {};
        
        // Check if email field exists and is not encrypted
        if (doc.email && typeof doc.email === 'string') {
          if (!emailEncryptionService.isEncrypted(doc.email)) {
            updateData.email = emailEncryptionService.encryptEmail(doc.email);
            updated = true;
            migratedCount++;
          }
        }
        
        // Check if target_user_email field exists and is not encrypted (for activity logs)
        if (doc.target_user_email && typeof doc.target_user_email === 'string') {
          if (!emailEncryptionService.isEncrypted(doc.target_user_email)) {
            updateData.target_user_email = emailEncryptionService.encryptEmail(doc.target_user_email);
            updated = true;
            migratedCount++;
          }
        }
        
        // Update the document if changes were made
        if (updated) {
          await collection.updateOne(
            { _id: doc._id },
            { $set: updateData }
          );
        }
      }
      
      logger.log(`Migrated ${migratedCount} documents in ${collectionName}`);
    }
    
    // Handle tenant databases (student collections)
    logger.log('Migrating tenant databases...');
    
    // Get all schools
    const schoolsCollection = connection.collection('schools');
    const schools = await schoolsCollection.find({}).toArray();
    
    for (const school of schools) {
      if (school.db_name) {
        try {
          // Connect to tenant database
          const tenantDb = connection.useDb(school.db_name);
          const studentsCollection = tenantDb.collection('students');
          
          // Find all students with unencrypted emails
          const students = await studentsCollection.find({}).toArray();
          
          let migratedCount = 0;
          
          for (const student of students) {
            if (student.email && typeof student.email === 'string') {
              if (!emailEncryptionService.isEncrypted(student.email)) {
                await studentsCollection.updateOne(
                  { _id: student._id },
                  { $set: { email: emailEncryptionService.encryptEmail(student.email) } }
                );
                migratedCount++;
              }
            }
          }
          
          logger.log(`Migrated ${migratedCount} students in school: ${school.name} (${school.db_name})`);
        } catch (error) {
          logger.error(`Error migrating school ${school.name}: ${error.message}`);
        }
      }
    }
    
    logger.log('Email encryption migration completed successfully!');
    
    await app.close();
    
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateEmailsToEncrypted()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateEmailsToEncrypted };
