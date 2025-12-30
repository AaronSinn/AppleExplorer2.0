const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const User = require('./models/User');

async function removeUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const emailsToRemove = [
      'ammar9@uwindsor.ca',
      'muhammad.ammar13@hotmail.com'
    ];

    for (const email of emailsToRemove) {
      // Check if user exists
      const user = await User.findOne({ email: email });
      
      if (user) {
        // Delete the user
        await User.deleteOne({ email: email });
        console.log(`✅ Removed user: ${email}`);
      } else {
        console.log(`ℹ️  User not found: ${email}`);
      }
    }

    console.log('\n🎉 User removal process completed!');

  } catch (error) {
    console.error('❌ Error removing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
removeUsers();
