
const User = require('../models/User');

const email = String(process.env.ADMIN_EMAIL);
const password = String(process.env.ADMIN_PASSWORD);

const addAdminUser = async () => {
    try {
        const existingAdmin = await User.findOne({ email: email });
        if (existingAdmin) {
            console.log('Admin user already exists.');
            return;
        } else {
            const adminUser = new User({
                fullName: 'Admin User',
                email: email,
                password: password,
                role: 'Administrator',
                isVerified: true,
                verificationCode: null,
                verificationExpires: null,
                resetPasswordToken: null,
                resetPasswordExpires: null,
                lastLogin: null,
                notifications: true,
                newsletter: false,
                profileCompleted: true,
                securityQuestionsCompleted: true,
                createdAt: new Date(),
                __v: 0,
                securityAnswer: "",
                securityQuestion: "",
                country: "Canada",
                department: "",
                firstName: "Admin",
                interests: "",
                jobTitle: "",
                lastName: "User",
                organization: "",
                phone: "",
                province: ""
            });
            await adminUser.save();
            console.log('Admin user created successfully.');
        }
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
};

module.exports = addAdminUser;