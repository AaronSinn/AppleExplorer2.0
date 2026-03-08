const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Email service using EmailJS (client-side)
// We'll send the verification data to frontend, which will use EmailJS
const sendVerificationEmail = async (email, code, fullName) => {
  try {
    // Always return the verification data for frontend to handle
    console.log('='.repeat(50));
    console.log('📧 EMAIL VERIFICATION DATA');
    console.log('='.repeat(50));
    console.log(`👤 User: ${fullName}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔢 Verification Code: ${code}`);
    console.log('⚠️  This data will be sent via EmailJS from frontend');
    console.log('='.repeat(50));
    return { email, code, fullName }; // Return data for frontend
  } catch (error) {
    console.error('Email service error:', error);
    return null;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, token, fullName) => {
  try {
    // Return reset data for frontend to handle via EmailJS
    console.log('='.repeat(50));
    console.log('📧 PASSWORD RESET DATA');
    console.log('='.repeat(50));
    console.log(`👤 User: ${fullName}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Reset Token: ${token}`);
    console.log('⚠️  This data will be sent via EmailJS from frontend');
    console.log('='.repeat(50));
    return { email, token, fullName }; // Return data for frontend
  } catch (error) {
    console.error('Email service error:', error);
    return null;
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-default-secret', {
    expiresIn: '7d'
  });
};

// Register route
router.post('/register', async (req, res) => {
  try {
    console.log('🔄 Registration request received');
    console.log('📝 Request body:', req.body);
    
    const { fullName, email, password } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide full name, email, and password' 
      });
    }

    if (password.length < 6) {
      console.log('❌ Validation failed: Password too short');
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    console.log('🔍 Checking if user exists:', email.toLowerCase());
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Create new user
    const user = new User({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password, 
      role: 'Viewer'
    });

    console.log(user.password);

    // Generate verification code
    const verificationCode = user.generateVerificationCode();
    await user.save();

    // Get email data for frontend to send via EmailJS
    const emailData = await sendVerificationEmail(user.email, verificationCode, user.fullName);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification code.',
      userId: user._id,
      emailData: emailData // Send email data to frontend
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Check if it's a MongoDB storage quota error
    if (error.code === 8000 || error.message?.includes('space quota')) {
      return res.status(507).json({ 
        success: false, 
        message: 'Database storage limit reached. Please contact the administrator.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration'
    });
  }
});

// Verify email route
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and verification code' 
      });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      verificationCode: code,
      verificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification code' 
      });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationExpires = null;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during email verification' 
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please verify your email before logging in',
        needsVerification: true 
      });
    }

    // Attatch user data to session
    req.session.visited = true; 
    req.session.user = user;

    // Store previous login time before updating
    const previousLogin = user.lastLogin;
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        lastLogin: previousLogin // Send the previous login time
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Used to test a user's session information
router.get('/status', (req, res) => {
  req.sessionStore.get(req.sessionID, (err, session) => {
    console.log(session);
  });
  
  return req.session.user ? res.status(200).send(req.session.user) : res.status(401).send('Not authenticated');  
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email address' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already verified' 
      });
    }

    // Generate new verification code
    const verificationCode = user.generateVerificationCode();
    await user.save();

    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, verificationCode, user.fullName);

    res.json({
      success: true,
      message: 'Verification code sent successfully',
      emailSent
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while resending verification code' 
    });
  }
});

// Forgot password route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email address' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, a reset code has been sent'
      });
    }

    // Generate reset token
    const resetToken = user.generateResetToken();
    await user.save();

    // Send reset email
    const emailData = await sendPasswordResetEmail(user.email, resetToken, user.fullName);

    res.json({
      success: true,
      message: 'If an account with that email exists, a reset code has been sent',
      emailData
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while processing password reset request' 
    });
  }
});

// Reset password route
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email, reset token, and new password' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while resetting password' 
    });
  }
});

// Get user profile (protected route)
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret');
    const user = await User.findById(decoded.userId).select('-password -verificationCode -resetPasswordToken');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
});

// Setup security questions route
router.post('/setup-security-questions', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret');
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Security question and answer are required'
      });
    }

    // Hash the security answer for storage
    const saltRounds = 10;
    const hashedAnswer = await bcrypt.hash(answer.toLowerCase().trim(), saltRounds);

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      {
        securityQuestion: question,
        securityAnswer: hashedAnswer,
        securityQuestionsCompleted: true
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ Security questions set up for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Security questions set up successfully'
    });

  } catch (error) {
    console.error('Setup security questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during security questions setup'
    });
  }
});

// Update profile route
router.post('/update-profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret');
    const {
      firstName,
      lastName,
      phone,
      organization,
      jobTitle,
      department,
      interests,
      country,
      province,
      notifications,
      newsletter
    } = req.body;

    if (!firstName || !lastName || !country) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and country are required'
      });
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      {
        firstName,
        lastName,
        phone,
        organization,
        jobTitle,
        department,
        interests,
        country,
        province,
        notifications: notifications !== undefined ? notifications : true,
        newsletter: newsletter !== undefined ? newsletter : false,
        profileCompleted: true
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ Profile updated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        organization: user.organization,
        jobTitle: user.jobTitle,
        department: user.department,
        interests: user.interests,
        country: user.country,
        province: user.province,
        notifications: user.notifications,
        newsletter: user.newsletter,
        profileCompleted: user.profileCompleted,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update'
    });
  }
});

// Logout route (client-side token removal, but we can log it)
router.post('/logout', async (req, res) => {
  try {
    // In a real app, you might want to blacklist the token
    // For now, we just send a success response
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during logout' 
    });
  }
});

module.exports = router;