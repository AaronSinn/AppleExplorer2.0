const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./models/User');

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@agriculture.ca' });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@agriculture.ca');
      console.log('You can use the existing admin account');
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('Admin123!', saltRounds);

    // Create admin user
    const adminUser = new User({
      fullName: 'System Administrator',
      email: 'admin@agriculture.ca',
      password: hashedPassword,
      role: 'Administrator',
      isVerified: true,
      profileCompleted: true,
      
      // Profile information
      firstName: 'System',
      lastName: 'Administrator',
      organization: 'Agriculture and Agri-Food Canada',
      jobTitle: 'System Administrator',
      department: 'IT Department',
      country: 'Canada',
      province: 'Ontario'
    });

    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@agriculture.ca');
    console.log('🔑 Password: Admin123!');
    console.log('👤 Role: Administrator');
    console.log('');
    console.log('You can now log in with these credentials and access the user management page.');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
createAdminUser();
