const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  embeddings: {
    type: [Number],
    required: true
  },
  metadata: {
    page: Number,
    section: String,
    subsection: String,
    act: String,
    chapterTitle: String,
    sectionNumber: String,
    startIndex: Number,
    endIndex: Number
  },
  tokenCount: {
    type: Number,
    default: 0
  }
}, {
  _id: false
});

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentType: {
    type: String,
    enum: [
      'ipc', 'crpc', 'crpc_amendment', 'bns', 'bnss', 'bsa', 
      'indian_evidence_act', 'juvenile_justice', 'ndps', 
      'case_file', 'judgment', 'other'
    ],
    required: true
  },
  lawCategory: {
    type: String,
    enum: ['criminal', 'civil', 'constitutional', 'procedural', 'evidence'],
    default: 'criminal'
  },
  isSystemDocument: {
    type: Boolean,
    default: false // True for pre-loaded law documents
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  extractedText: {
    type: String,
    default: ''
  },
  chunks: [chunkSchema],
  vectorIndexId: {
    type: String, // Pinecone vector ID
    sparse: true
  },
  metadata: {
    totalPages: Number,
    totalChunks: Number,
    processingTime: Number,
    extractionMethod: String,
    language: {
      type: String,
      enum: ['english', 'hindi', 'mixed'],
      default: 'english'
    },
    actDetails: {
      fullName: String,
      year: Number,
      sections: [{
        number: String,
        title: String,
        content: String,
        page: Number
      }],
      chapters: [{
        number: String,
        title: String,
        sections: [String]
      }]
    }
  },
  searchableFields: {
    sections: [String],
    keywords: [String],
    topics: [String]
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better search performance
documentSchema.index({ userId: 1, documentType: 1 });
documentSchema.index({ documentType: 1, isSystemDocument: 1 });
documentSchema.index({ processingStatus: 1 });
documentSchema.index({ 'metadata.actDetails.sections.number': 1 });
documentSchema.index({ 'searchableFields.sections': 1 });
documentSchema.index({ 'searchableFields.keywords': 1 });
documentSchema.index({ filename: 'text', originalName: 'text', extractedText: 'text' });

// Method to add chunk
documentSchema.methods.addChunk = function(chunkData) {
  this.chunks.push({
    content: chunkData.content,
    embeddings: chunkData.embeddings,
    metadata: chunkData.metadata || {},
    tokenCount: chunkData.tokenCount || 0
  });
  
  this.metadata.totalChunks = this.chunks.length;
  return this.save();
};

// Method to update processing status
documentSchema.methods.updateProcessingStatus = function(status, additionalData = {}) {
  this.processingStatus = status;
  
  if (additionalData.extractedText) {
    this.extractedText = additionalData.extractedText;
  }
  
  if (additionalData.metadata) {
    this.metadata = { ...this.metadata, ...additionalData.metadata };
  }
  
  if (status === 'completed') {
    this.lastAccessed = new Date();
  }
  
  return this.save();
};

// Method to search within document
documentSchema.methods.searchContent = function(query, limit = 5) {
  const regex = new RegExp(query, 'i');
  
  return this.chunks
    .filter(chunk => regex.test(chunk.content))
    .slice(0, limit)
    .map(chunk => ({
      content: chunk.content,
      metadata: chunk.metadata,
      relevanceScore: this.calculateRelevanceScore(chunk.content, query)
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
};

// Method to calculate relevance score
documentSchema.methods.calculateRelevanceScore = function(content, query) {
  const queryTerms = query.toLowerCase().split(' ');
  const contentLower = content.toLowerCase();
  
  let score = 0;
  queryTerms.forEach(term => {
    const matches = (contentLower.match(new RegExp(term, 'g')) || []).length;
    score += matches;
  });
  
  return score / content.length * 1000; // Normalize by content length
};

// Method to extract legal sections
documentSchema.methods.extractLegalSections = function() {
  const sectionPattern = /Section\s+(\d+[A-Z]?)\s*[:\-\.]\s*([^\n]+)/gi;
  const sections = [];
  
  let match;
  while ((match = sectionPattern.exec(this.extractedText)) !== null) {
    sections.push({
      number: match[1],
      title: match[2].trim(),
      content: this.extractSectionContent(match.index),
      page: this.getPageNumber(match.index)
    });
  }
  
  this.metadata.actDetails.sections = sections;
  this.searchableFields.sections = sections.map(s => s.number);
  
  return this.save();
};

// Helper method to extract section content
documentSchema.methods.extractSectionContent = function(startIndex) {
  const endPattern = /Section\s+\d+[A-Z]?/i;
  const content = this.extractedText.substring(startIndex);
  const nextSectionMatch = content.substring(100).match(endPattern);
  
  if (nextSectionMatch) {
    return content.substring(0, 100 + nextSectionMatch.index).trim();
  }
  
  return content.substring(0, 2000).trim(); // Fallback to 2000 chars
};

// Helper method to get page number
documentSchema.methods.getPageNumber = function(index) {
  // Simple estimation based on character count
  const avgCharsPerPage = 2000;
  return Math.ceil(index / avgCharsPerPage);
};

// Static method to find system documents
documentSchema.statics.findSystemDocuments = function(documentType = null) {
  const query = { isSystemDocument: true };
  if (documentType) {
    query.documentType = documentType;
  }
  
  return this.find(query).sort({ createdAt: 1 });
};

// Static method to find by law type with preference for newer laws
documentSchema.statics.findByLawType = function(lawType) {
  const preferenceOrder = {
    'criminal_code': ['bns', 'ipc'],
    'criminal_procedure': ['bnss', 'crpc'],
    'evidence': ['bsa', 'indian_evidence_act']
  };
  
  const docTypes = preferenceOrder[lawType] || [lawType];
  
  return this.find({
    documentType: { $in: docTypes },
    isSystemDocument: true
  }).sort({ createdAt: -1 });
};

// Method to increment download count
documentSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

module.exports = mongoose.model('Document', documentSchema);