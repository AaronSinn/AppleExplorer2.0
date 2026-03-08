const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const googleUserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  googleId:{
    type: String,
    required: true,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['Viewer', 'Researcher', 'Administrator'],
    default: 'Viewer'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
    default: null
  },
  verificationExpires: {
    type: Date,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  notifications: {
    type: Boolean,
    default: true
  },
  newsletter: {
    type: Boolean,
    default: false
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  securityQuestionsCompleted: {
    type: Boolean,
    default: false
  }
});

// Hash password before saving
googleUserSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    return err;
  }
});

// Method to compare passwords
googleUserSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Method to generate verification code
googleUserSchema.methods.generateVerificationCode = function() {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  this.verificationCode = code;
  this.verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return code;
};

// Method to generate password reset token
googleUserSchema.methods.generateResetToken = function() {
  const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit token
  this.resetPasswordToken = token;
  this.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  return token;
};

module.exports = mongoose.model("GoogleUser", googleUserSchema);

