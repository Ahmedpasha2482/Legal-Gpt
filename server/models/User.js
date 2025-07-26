const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['lawyer', 'student', 'researcher', 'other'],
    default: 'other'
  },
  profession: {
    type: String,
    trim: true,
    maxlength: [100, 'Profession cannot be more than 100 characters']
  },
  barCouncilNumber: {
    type: String,
    trim: true,
    sparse: true // Allows multiple null values
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  preferences: {
    language: {
      type: String,
      enum: ['english', 'hinglish'],
      default: 'english'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  usage: {
    queriesCount: {
      type: Number,
      default: 0
    },
    documentsUploaded: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'usage.lastActive': -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update last active
userSchema.methods.updateLastActive = function() {
  this.usage.lastActive = new Date();
  return this.save();
};

// Method to increment query count
userSchema.methods.incrementQueryCount = function() {
  this.usage.queriesCount += 1;
  this.usage.lastActive = new Date();
  return this.save();
};

// Method to increment documents uploaded
userSchema.methods.incrementDocumentsUploaded = function() {
  this.usage.documentsUploaded += 1;
  this.usage.lastActive = new Date();
  return this.save();
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);