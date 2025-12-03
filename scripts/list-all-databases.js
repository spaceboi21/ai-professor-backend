const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

async function listDatabases() {
  const baseUri = process.env.MONGODB_BASE_URI;
  
  if (!baseUri) {
    console.error('❌ MONGODB_BASE_URI not found in .env');
    process.exit(1);
  }
  
  console.log('🔍 Connecting to MongoDB Atlas...');
  console.log('URI:', baseUri.replace(/:[^:@]+@/, ':****@'));
  
  const client = new MongoClient(baseUri);
  
  try {
    await client.connect();
    console.log('✅ Connected!\n');
    
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();
    
    console.log('📚 Available Databases:');
    console.log('='.repeat(60));
    
    for (const db of databases) {
      console.log(`\n📁 ${db.name}`);
      console.log(`   Size: ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
      
      // List collections in each database (skip system databases)
      if (db.name === 'admin' || db.name === 'config' || db.name === 'local') {
        console.log(`   Collections: (skipped - system db)`);
        continue;
      }
      
      const database = client.db(db.name);
      const collections = await database.listCollections().toArray();
      
      if (collections.length > 0 && db.name !== 'admin') {
        console.log(`   Collections (${collections.length}):`);
        for (const coll of collections) {
          try {
            const count = await database.collection(coll.name).countDocuments();
            console.log(`      - ${coll.name} (${count} documents)`);
          } catch (err) {
            console.log(`      - ${coll.name} (unable to count)`);
          }
        }
      } else if (db.name === 'admin') {
        console.log(`   Collections: ${collections.length} (skipped - admin db)`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

listDatabases();

