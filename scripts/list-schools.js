/**
 * Script to list all schools and their database names
 * Usage: node scripts/list-schools.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/baby_ia_central';

async function listSchools() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const SchoolSchema = new mongoose.Schema({
      name: String,
      email: String,
      db_name: String,
      created_at: Date,
      status: String,
    });
    
    const School = mongoose.model('School', SchoolSchema, 'schools');
    
    const schools = await School.find({ deleted_at: null }).sort({ created_at: -1 }).lean();
    
    console.log(`\n📚 Found ${schools.length} school(s):\n`);
    
    schools.forEach((school, index) => {
      console.log(`${index + 1}. ${school.name}`);
      console.log(`   Database: ${school.db_name}`);
      console.log(`   ID: ${school._id}`);
      console.log(`   Status: ${school.status || 'N/A'}`);
      console.log('');
    });
    
    console.log('\n💡 To check feedbacks for a school, run:');
    console.log('   node scripts/check-feedbacks.js <db_name> [student_id]\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

listSchools();

