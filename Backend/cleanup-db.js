// Quick database cleanup script for testing
const mongoose = require('mongoose');
require('dotenv').config();

async function cleanDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // List current users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('📋 Current users in database:');
    
    if (users.length === 0) {
      console.log('   No users found - database already clean');
    } else {
      users.forEach(user => {
        console.log(`   - Email: ${user.email}, Name: ${user.fullName}`);
      });
      
      // Delete all users
      console.log('🗑️  Deleting all users...');
      const result = await mongoose.connection.db.collection('users').deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} user(s)`);
    }
    
    mongoose.connection.close();
    console.log('📱 Database cleaned! Ready for testing.');
    
  } catch (err) {
    console.error('❌ Error:', err);
    mongoose.connection.close();
  }
}

cleanDatabase();
