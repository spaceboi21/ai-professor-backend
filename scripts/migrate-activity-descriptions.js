const { MongoClient } = require('mongodb');

// Database connection configuration
const DB_URI =
  process.env.DATABASE_URI || 'mongodb://localhost:27017/ai-professor-central';
const BATCH_SIZE = 1000;

// Translation mapping for common activity descriptions
const DESCRIPTION_TRANSLATIONS = {
  'User login successfully': {
    en: 'User login successfully',
    fr: 'Connexion utilisateur réussie',
  },
  'User login failed': {
    en: 'User login failed',
    fr: 'Échec de la connexion utilisateur',
  },
  'User logout successfully': {
    en: 'User logout successfully',
    fr: 'Déconnexion utilisateur réussie',
  },
  'User logout failed': {
    en: 'User logout failed',
    fr: 'Échec de la déconnexion utilisateur',
  },
  'User creation successfully': {
    en: 'User creation successfully',
    fr: "Création d'utilisateur réussie",
  },
  'User creation failed': {
    en: 'User creation failed',
    fr: "Échec de la création d'utilisateur",
  },
  'User update successfully': {
    en: 'User update successfully',
    fr: 'Mise à jour utilisateur réussie',
  },
  'User update failed': {
    en: 'User update failed',
    fr: 'Échec de la mise à jour utilisateur',
  },
  'User deletion successfully': {
    en: 'User deletion successfully',
    fr: "Suppression d'utilisateur réussie",
  },
  'User deletion failed': {
    en: 'User deletion failed',
    fr: "Échec de la suppression d'utilisateur",
  },
  'School creation successfully': {
    en: 'School creation successfully',
    fr: "Création d'école réussie",
  },
  'School creation failed': {
    en: 'School creation failed',
    fr: "Échec de la création d'école",
  },
  'School update successfully': {
    en: 'School update successfully',
    fr: "Mise à jour d'école réussie",
  },
  'School update failed': {
    en: 'School update failed',
    fr: "Échec de la mise à jour d'école",
  },
  'School deletion successfully': {
    en: 'School deletion successfully',
    fr: "Suppression d'école réussie",
  },
  'School deletion failed': {
    en: 'School deletion failed',
    fr: "Échec de la suppression d'école",
  },
  'Module creation successfully': {
    en: 'Module creation successfully',
    fr: 'Création de module réussie',
  },
  'Module creation failed': {
    en: 'Module creation failed',
    fr: 'Échec de la création de module',
  },
  'Module update successfully': {
    en: 'Module update successfully',
    fr: 'Mise à jour de module réussie',
  },
  'Module update failed': {
    en: 'Module update failed',
    fr: 'Échec de la mise à jour de module',
  },
  'Module deletion successfully': {
    en: 'Module deletion successfully',
    fr: 'Suppression de module réussie',
  },
  'Module deletion failed': {
    en: 'Module deletion failed',
    fr: 'Échec de la suppression de module',
  },
  'Module assignment successfully': {
    en: 'Module assignment successfully',
    fr: 'Attribution de module réussie',
  },
  'Module assignment failed': {
    en: 'Module assignment failed',
    fr: "Échec de l'attribution de module",
  },
  'Module started successfully': {
    en: 'Module started successfully',
    fr: 'Module commencé avec succès',
  },
  'Module started failed': {
    en: 'Module started failed',
    fr: 'Échec du démarrage du module',
  },
  'Module completed successfully': {
    en: 'Module completed successfully',
    fr: 'Module terminé avec succès',
  },
  'Module completed failed': {
    en: 'Module completed failed',
    fr: 'Échec de la complétion du module',
  },
  'Chapter creation successfully': {
    en: 'Chapter creation successfully',
    fr: 'Création de chapitre réussie',
  },
  'Chapter creation failed': {
    en: 'Chapter creation failed',
    fr: 'Échec de la création de chapitre',
  },
  'Chapter update successfully': {
    en: 'Chapter update successfully',
    fr: 'Mise à jour de chapitre réussie',
  },
  'Chapter update failed': {
    en: 'Chapter update failed',
    fr: 'Échec de la mise à jour de chapitre',
  },
  'Chapter deletion successfully': {
    en: 'Chapter deletion successfully',
    fr: 'Suppression de chapitre réussie',
  },
  'Chapter deletion failed': {
    en: 'Chapter deletion failed',
    fr: 'Échec de la suppression de chapitre',
  },
  'Chapter reordering successfully': {
    en: 'Chapter reordering successfully',
    fr: 'Réorganisation de chapitre réussie',
  },
  'Chapter reordering failed': {
    en: 'Chapter reordering failed',
    fr: 'Échec de la réorganisation de chapitre',
  },
  'Chapter started successfully': {
    en: 'Chapter started successfully',
    fr: 'Chapitre commencé avec succès',
  },
  'Chapter started failed': {
    en: 'Chapter started failed',
    fr: 'Échec du démarrage du chapitre',
  },
  'Chapter completed successfully': {
    en: 'Chapter completed successfully',
    fr: 'Chapitre terminé avec succès',
  },
  'Chapter completed failed': {
    en: 'Chapter completed failed',
    fr: 'Échec de la complétion du chapitre',
  },
  'Quiz creation successfully': {
    en: 'Quiz creation successfully',
    fr: 'Création de quiz réussie',
  },
  'Quiz creation failed': {
    en: 'Quiz creation failed',
    fr: 'Échec de la création de quiz',
  },
  'Quiz update successfully': {
    en: 'Quiz update successfully',
    fr: 'Mise à jour de quiz réussie',
  },
  'Quiz update failed': {
    en: 'Quiz update failed',
    fr: 'Échec de la mise à jour de quiz',
  },
  'Quiz deletion successfully': {
    en: 'Quiz deletion successfully',
    fr: 'Suppression de quiz réussie',
  },
  'Quiz deletion failed': {
    en: 'Quiz deletion failed',
    fr: 'Échec de la suppression de quiz',
  },
  'Quiz attempt successfully': {
    en: 'Quiz attempt successfully',
    fr: 'Tentative de quiz réussie',
  },
  'Quiz attempt failed': {
    en: 'Quiz attempt failed',
    fr: 'Échec de la tentative de quiz',
  },
  'Quiz started successfully': {
    en: 'Quiz started successfully',
    fr: 'Quiz commencé avec succès',
  },
  'Quiz started failed': {
    en: 'Quiz started failed',
    fr: 'Échec du démarrage du quiz',
  },
  'Quiz submitted successfully': {
    en: 'Quiz submitted successfully',
    fr: 'Quiz soumis avec succès',
  },
  'Quiz submitted failed': {
    en: 'Quiz submitted failed',
    fr: 'Échec de la soumission du quiz',
  },
  'Progress update successfully': {
    en: 'Progress update successfully',
    fr: 'Mise à jour du progrès réussie',
  },
  'Progress update failed': {
    en: 'Progress update failed',
    fr: 'Échec de la mise à jour du progrès',
  },
  'Progress completed successfully': {
    en: 'Progress completed successfully',
    fr: 'Progrès terminé avec succès',
  },
  'Progress completed failed': {
    en: 'Progress completed failed',
    fr: 'Échec de la complétion du progrès',
  },
  'AI chat session started successfully': {
    en: 'AI chat session started successfully',
    fr: 'Session de chat IA commencée avec succès',
  },
  'AI chat session started failed': {
    en: 'AI chat session started failed',
    fr: 'Échec du démarrage de la session de chat IA',
  },
  'AI chat message sent successfully': {
    en: 'AI chat message sent successfully',
    fr: 'Message de chat IA envoyé avec succès',
  },
  'AI chat message sent failed': {
    en: 'AI chat message sent failed',
    fr: "Échec de l'envoi du message de chat IA",
  },
  'AI feedback provided successfully': {
    en: 'AI feedback provided successfully',
    fr: 'Commentaire IA fourni avec succès',
  },
  'AI feedback provided failed': {
    en: 'AI feedback provided failed',
    fr: 'Échec de la fourniture du commentaire IA',
  },
  'File upload successfully': {
    en: 'File upload successfully',
    fr: 'Téléchargement de fichier réussi',
  },
  'File upload failed': {
    en: 'File upload failed',
    fr: 'Échec du téléchargement de fichier',
  },
  'File deletion successfully': {
    en: 'File deletion successfully',
    fr: 'Suppression de fichier réussie',
  },
  'File deletion failed': {
    en: 'File deletion failed',
    fr: 'Échec de la suppression de fichier',
  },
};

/**
 * Translate a description to multilingual format
 * @param {string} description - Original description
 * @returns {object} Multilingual description object
 */
function translateDescription(description) {
  // Check if we have a direct translation
  if (DESCRIPTION_TRANSLATIONS[description]) {
    return DESCRIPTION_TRANSLATIONS[description];
  }

  // If not found, create a basic translation
  const lowerDesc = description.toLowerCase();
  let frenchTranslation = description;

  // Basic pattern matching for common words
  if (lowerDesc.includes('successfully')) {
    frenchTranslation = description.replace('successfully', 'avec succès');
  } else if (lowerDesc.includes('failed')) {
    frenchTranslation = description.replace('failed', 'échoué');
  }

  // Additional common replacements
  frenchTranslation = frenchTranslation
    .replace(/\buser\b/gi, 'utilisateur')
    .replace(/\blogin\b/gi, 'connexion')
    .replace(/\blogout\b/gi, 'déconnexion')
    .replace(/\bcreation\b/gi, 'création')
    .replace(/\bupdate\b/gi, 'mise à jour')
    .replace(/\bdeletion\b/gi, 'suppression')
    .replace(/\bschool\b/gi, 'école')
    .replace(/\bmodule\b/gi, 'module')
    .replace(/\bchapter\b/gi, 'chapitre')
    .replace(/\bquiz\b/gi, 'quiz')
    .replace(/\bfile\b/gi, 'fichier')
    .replace(/\bupload\b/gi, 'téléchargement')
    .replace(/\bstarted\b/gi, 'commencé')
    .replace(/\bcompleted\b/gi, 'terminé')
    .replace(/\bprogress\b/gi, 'progrès')
    .replace(/\bassignment\b/gi, 'attribution')
    .replace(/\breordering\b/gi, 'réorganisation')
    .replace(/\battempt\b/gi, 'tentative')
    .replace(/\bsubmitted\b/gi, 'soumis')
    .replace(/\bfeedback\b/gi, 'commentaire')
    .replace(/\bchat\b/gi, 'chat')
    .replace(/\bsession\b/gi, 'session')
    .replace(/\bmessage\b/gi, 'message')
    .replace(/\bsent\b/gi, 'envoyé')
    .replace(/\bprovided\b/gi, 'fourni');

  return {
    en: description,
    fr: frenchTranslation,
  };
}

/**
 * Main migration function
 */
async function migrateActivityDescriptions() {
  const client = new MongoClient(DB_URI);

  try {
    console.log('Connecting to database...');
    await client.connect();

    const db = client.db();
    const collection = db.collection('activity_logs');

    console.log('Checking for activity logs with string descriptions...');

    // Find all documents where description is a string (not an object)
    const countQuery = { description: { $type: 'string' } };
    const totalCount = await collection.countDocuments(countQuery);

    if (totalCount === 0) {
      console.log(
        'No activity logs found with string descriptions. Migration may have already been completed.',
      );
      return;
    }

    console.log(`Found ${totalCount} activity logs to migrate.`);

    let processed = 0;
    let errors = 0;

    // Process in batches
    while (processed < totalCount) {
      console.log(
        `Processing batch ${Math.floor(processed / BATCH_SIZE) + 1}...`,
      );

      const documents = await collection
        .find(countQuery)
        .limit(BATCH_SIZE)
        .toArray();

      if (documents.length === 0) {
        break;
      }

      // Prepare bulk operations
      const bulkOps = documents
        .map((doc) => {
          try {
            const multilingualDescription = translateDescription(
              doc.description,
            );

            return {
              updateOne: {
                filter: { _id: doc._id },
                update: { $set: { description: multilingualDescription } },
              },
            };
          } catch (error) {
            console.error(`Error processing document ${doc._id}:`, error);
            errors++;
            return null;
          }
        })
        .filter((op) => op !== null);

      if (bulkOps.length > 0) {
        try {
          const result = await collection.bulkWrite(bulkOps);
          console.log(
            `Updated ${result.modifiedCount} documents in this batch.`,
          );
          processed += result.modifiedCount;
        } catch (error) {
          console.error('Bulk write error:', error);
          errors += bulkOps.length;
        }
      }
    }

    console.log('Migration completed!');
    console.log(`Total processed: ${processed}`);
    console.log(`Errors: ${errors}`);

    // Verify migration
    const remainingCount = await collection.countDocuments(countQuery);
    console.log(`Remaining string descriptions: ${remainingCount}`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

/**
 * Rollback migration (convert back to strings) - for testing purposes
 */
async function rollbackMigration() {
  const client = new MongoClient(DB_URI);

  try {
    console.log('Rolling back migration...');
    await client.connect();

    const db = client.db();
    const collection = db.collection('activity_logs');

    // Find all documents where description is an object
    const countQuery = { description: { $type: 'object' } };
    const totalCount = await collection.countDocuments(countQuery);

    console.log(`Found ${totalCount} activity logs to rollback.`);

    if (totalCount === 0) {
      console.log('No multilingual descriptions found to rollback.');
      return;
    }

    let processed = 0;

    while (processed < totalCount) {
      const documents = await collection
        .find(countQuery)
        .limit(BATCH_SIZE)
        .toArray();

      if (documents.length === 0) {
        break;
      }

      const bulkOps = documents.map((doc) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: { description: doc.description.en || 'Unknown activity' },
          },
        },
      }));

      const result = await collection.bulkWrite(bulkOps);
      console.log(`Rolled back ${result.modifiedCount} documents.`);
      processed += result.modifiedCount;
    }

    console.log('Rollback completed!');
  } catch (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'rollback') {
  rollbackMigration();
} else if (command === 'migrate' || !command) {
  migrateActivityDescriptions();
} else {
  console.log(
    'Usage: node migrate-activity-descriptions.js [migrate|rollback]',
  );
  console.log(
    '  migrate (default): Convert string descriptions to multilingual objects',
  );
  console.log(
    '  rollback: Convert multilingual objects back to English strings',
  );
  process.exit(1);
}
