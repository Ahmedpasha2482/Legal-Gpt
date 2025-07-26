const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    sources: [{
      document: String,
      section: String,
      page: Number,
      confidence: Number
    }],
    lawSections: [{
      act: String,
      section: String,
      title: String,
      replacement: String // For new law replacements
    }],
    processingTime: Number,
    language: {
      type: String,
      enum: ['english', 'hinglish'],
      default: 'english'
    }
  }
}, {
  _id: false
});

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Chat title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Chat description cannot be more than 500 characters']
  },
  messages: [messageSchema],
  caseDetails: {
    caseNumber: String,
    caseType: {
      type: String,
      enum: ['criminal', 'civil', 'constitutional', 'other'],
      default: 'criminal'
    },
    court: String,
    status: {
      type: String,
      enum: ['active', 'pending', 'closed', 'archived'],
      default: 'active'
    },
    tags: [String]
  },
  documentsAttached: [{
    filename: String,
    originalName: String,
    uploadDate: Date,
    size: Number,
    type: String
  }],
  summary: {
    keyPoints: [String],
    legalSections: [String],
    recommendations: [String],
    nextSteps: [String]
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isShared: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    userId: mongoose.Schema.Types.ObjectId,
    permission: {
      type: String,
      enum: ['read', 'comment', 'edit'],
      default: 'read'
    }
  }],
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
chatSchema.index({ userId: 1, lastActivity: -1 });
chatSchema.index({ 'caseDetails.status': 1 });
chatSchema.index({ isArchived: 1 });
chatSchema.index({ createdAt: -1 });
chatSchema.index({ title: 'text', description: 'text' });

// Pre-save middleware to update lastActivity
chatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActivity = new Date();
  }
  next();
});

// Method to add a message
chatSchema.methods.addMessage = function(messageData) {
  const message = {
    id: messageData.id || require('uuid').v4(),
    type: messageData.type,
    content: messageData.content,
    timestamp: new Date(),
    metadata: messageData.metadata || {}
  };
  
  this.messages.push(message);
  this.lastActivity = new Date();
  return this.save();
};

// Method to get recent messages
chatSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages
    .slice(-limit)
    .map(msg => ({
      id: msg.id,
      type: msg.type,
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: msg.metadata
    }));
};

// Method to generate summary
chatSchema.methods.generateSummary = function() {
  const userMessages = this.messages.filter(msg => msg.type === 'user');
  const assistantMessages = this.messages.filter(msg => msg.type === 'assistant');
  
  // Extract key information
  const keyPoints = [];
  const legalSections = new Set();
  
  assistantMessages.forEach(msg => {
    if (msg.metadata.lawSections) {
      msg.metadata.lawSections.forEach(section => {
        legalSections.add(`${section.act} - ${section.section}`);
      });
    }
  });
  
  this.summary = {
    keyPoints: keyPoints,
    legalSections: Array.from(legalSections),
    recommendations: [],
    nextSteps: []
  };
  
  return this.save();
};

// Method to archive chat
chatSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

// Method to share chat
chatSchema.methods.shareWith = function(userId, permission = 'read') {
  const existingShare = this.sharedWith.find(share => 
    share.userId.toString() === userId.toString()
  );
  
  if (existingShare) {
    existingShare.permission = permission;
  } else {
    this.sharedWith.push({ userId, permission });
  }
  
  this.isShared = true;
  return this.save();
};

// Static method to find user's chats
chatSchema.statics.findUserChats = function(userId, options = {}) {
  const query = { 
    userId,
    isArchived: options.includeArchived || false
  };
  
  return this.find(query)
    .sort({ lastActivity: -1 })
    .limit(options.limit || 50)
    .select('-messages'); // Exclude messages for list view
};

module.exports = mongoose.model('Chat', chatSchema);