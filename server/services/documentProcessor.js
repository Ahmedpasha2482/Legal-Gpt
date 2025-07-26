const pdf = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');
const { encode } = require('gpt-3-encoder');
const openai = require('openai');
const Document = require('../models/Document');

class DocumentProcessor {
  constructor() {
    this.openaiClient = new openai({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.chunkSize = 1000; // characters
    this.chunkOverlap = 200; // characters
    this.maxTokens = 400; // for embeddings
  }

  async processDocument(filePath, userId, documentType, metadata = {}) {
    try {
      console.log(`Processing document: ${filePath}`);
      
      // Extract text from document
      const extractedText = await this.extractText(filePath);
      
      // Create document record
      const fileStats = await fs.stat(filePath);
      const filename = path.basename(filePath);
      
      const document = new Document({
        filename: filename,
        originalName: metadata.originalName || filename,
        filePath: filePath,
        fileSize: fileStats.size,
        mimeType: this.getMimeType(filename),
        userId: userId,
        documentType: documentType,
        isSystemDocument: metadata.isSystemDocument || false,
        extractedText: extractedText,
        metadata: {
          extractionMethod: 'pdf-parse',
          language: this.detectLanguage(extractedText),
          ...metadata
        }
      });

      await document.save();
      
      // Update processing status
      await document.updateProcessingStatus('processing');
      
      // Process in chunks and generate embeddings
      const chunks = this.createChunks(extractedText);
      console.log(`Created ${chunks.length} chunks for ${filename}`);
      
      // Process chunks in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        await this.processBatch(document, batch, i);
        
        // Small delay to respect rate limits
        await this.delay(1000);
      }
      
      // Extract legal sections if it's a law document
      if (this.isLawDocument(documentType)) {
        await document.extractLegalSections();
      }
      
      // Update processing status to completed
      await document.updateProcessingStatus('completed', {
        metadata: {
          ...document.metadata,
          totalPages: this.estimatePageCount(extractedText),
          totalChunks: chunks.length,
          processingTime: Date.now() - document.createdAt.getTime()
        }
      });
      
      console.log(`Document processing completed: ${filename}`);
      return document;
      
    } catch (error) {
      console.error('Document processing error:', error);
      
      // Update status to failed if document exists
      const document = await Document.findOne({ filePath });
      if (document) {
        await document.updateProcessingStatus('failed');
      }
      
      throw error;
    }
  }

  async extractText(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      
      switch (fileExtension) {
        case '.pdf':
          const pdfData = await pdf(fileBuffer);
          return this.cleanExtractedText(pdfData.text);
        
        case '.txt':
          return this.cleanExtractedText(fileBuffer.toString('utf-8'));
        
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }
    } catch (error) {
      console.error('Text extraction error:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  cleanExtractedText(text) {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove page numbers and headers/footers
      .replace(/Page \d+/gi, '')
      .replace(/^\d+\s*$/gm, '')
      // Remove special characters but keep legal formatting
      .replace(/[^\w\s\-.,;:()\[\]"'/]/g, ' ')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  createChunks(text) {
    const chunks = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let currentTokens = 0;
    
    for (const sentence of sentences) {
      const sentenceTokens = encode(sentence).length;
      
      // If adding this sentence would exceed token limit
      if (currentTokens + sentenceTokens > this.maxTokens && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          tokenCount: currentTokens,
          metadata: this.extractChunkMetadata(currentChunk)
        });
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk);
        currentChunk = overlapText + sentence;
        currentTokens = encode(currentChunk).length;
      } else {
        currentChunk += ' ' + sentence;
        currentTokens += sentenceTokens;
      }
    }
    
    // Add the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokens,
        metadata: this.extractChunkMetadata(currentChunk)
      });
    }
    
    return chunks;
  }

  splitIntoSentences(text) {
    // Split by sentence-ending punctuation but preserve legal formatting
    return text
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .filter(sentence => sentence.trim().length > 10);
  }

  getOverlapText(text) {
    const words = text.split(' ');
    const overlapWords = Math.min(this.chunkOverlap / 5, words.length); // Estimate 5 chars per word
    return words.slice(-overlapWords).join(' ') + ' ';
  }

  extractChunkMetadata(content) {
    const metadata = {};
    
    // Extract section information
    const sectionMatch = content.match(/Section\s+(\d+[A-Z]?)/i);
    if (sectionMatch) {
      metadata.sectionNumber = sectionMatch[1];
    }
    
    // Extract chapter information
    const chapterMatch = content.match(/Chapter\s+([IVX]+|\d+)/i);
    if (chapterMatch) {
      metadata.chapter = chapterMatch[1];
    }
    
    // Extract act information
    const actMatches = content.match(/(Indian Penal Code|IPC|Criminal Procedure Code|CrPC|Evidence Act|BNS|BNSS|BSA)/i);
    if (actMatches) {
      metadata.act = actMatches[1];
    }
    
    return metadata;
  }

  async processBatch(document, chunks, startIndex) {
    const embeddings = await this.generateEmbeddings(chunks.map(chunk => chunk.content));
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      await document.addChunk({
        content: chunk.content,
        embeddings: embeddings[i],
        metadata: {
          ...chunk.metadata,
          startIndex: startIndex + i,
          endIndex: startIndex + i + chunk.content.length
        },
        tokenCount: chunk.tokenCount
      });
    }
  }

  async generateEmbeddings(texts) {
    try {
      const response = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float'
      });
      
      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Embedding generation error:', error);
      // Return zero vectors as fallback
      return texts.map(() => new Array(1536).fill(0));
    }
  }

  detectLanguage(text) {
    // Simple language detection based on character patterns
    const hindiPattern = /[\u0900-\u097F]/;
    const englishPattern = /[a-zA-Z]/;
    
    const hasHindi = hindiPattern.test(text);
    const hasEnglish = englishPattern.test(text);
    
    if (hasHindi && hasEnglish) return 'mixed';
    if (hasHindi) return 'hindi';
    return 'english';
  }

  getMimeType(filename) {
    const extension = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  isLawDocument(documentType) {
    const lawDocTypes = [
      'ipc', 'crpc', 'crpc_amendment', 'bns', 'bnss', 'bsa',
      'indian_evidence_act', 'juvenile_justice', 'ndps'
    ];
    return lawDocTypes.includes(documentType.toLowerCase());
  }

  estimatePageCount(text) {
    const avgCharsPerPage = 2000;
    return Math.ceil(text.length / avgCharsPerPage);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async searchDocuments(query, documentTypes = [], limit = 10) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbeddings([query]);
      
      // Build MongoDB aggregation pipeline for vector search
      const pipeline = [
        {
          $match: {
            processingStatus: 'completed',
            ...(documentTypes.length > 0 && { documentType: { $in: documentTypes } })
          }
        },
        {
          $unwind: '$chunks'
        },
        {
          $addFields: {
            similarity: {
              $function: {
                body: function(queryEmbed, chunkEmbed) {
                  // Cosine similarity calculation
                  let dotProduct = 0;
                  let queryMag = 0;
                  let chunkMag = 0;
                  
                  for (let i = 0; i < queryEmbed.length; i++) {
                    dotProduct += queryEmbed[i] * chunkEmbed[i];
                    queryMag += queryEmbed[i] * queryEmbed[i];
                    chunkMag += chunkEmbed[i] * chunkEmbed[i];
                  }
                  
                  return dotProduct / (Math.sqrt(queryMag) * Math.sqrt(chunkMag));
                },
                args: [queryEmbedding[0], '$chunks.embeddings'],
                lang: 'js'
              }
            }
          }
        },
        {
          $match: {
            similarity: { $gte: 0.7 } // Similarity threshold
          }
        },
        {
          $sort: { similarity: -1 }
        },
        {
          $limit: limit
        },
        {
          $project: {
            documentType: 1,
            originalName: 1,
            content: '$chunks.content',
            metadata: '$chunks.metadata',
            similarity: 1
          }
        }
      ];
      
      const results = await Document.aggregate(pipeline);
      return results;
      
    } catch (error) {
      console.error('Document search error:', error);
      // Fallback to text search
      return await this.fallbackTextSearch(query, documentTypes, limit);
    }
  }

  async fallbackTextSearch(query, documentTypes = [], limit = 10) {
    const searchRegex = new RegExp(query.split(' ').join('|'), 'i');
    
    const documents = await Document.find({
      processingStatus: 'completed',
      ...(documentTypes.length > 0 && { documentType: { $in: documentTypes } }),
      $or: [
        { extractedText: searchRegex },
        { 'searchableFields.keywords': { $in: query.split(' ') } }
      ]
    })
    .limit(limit)
    .lean();
    
    return documents.map(doc => ({
      documentType: doc.documentType,
      originalName: doc.originalName,
      content: this.extractRelevantSnippet(doc.extractedText, query),
      metadata: doc.metadata,
      similarity: 0.5 // Default similarity for text search
    }));
  }

  extractRelevantSnippet(text, query, contextLength = 500) {
    const queryWords = query.toLowerCase().split(' ');
    const textLower = text.toLowerCase();
    
    // Find the first occurrence of any query word
    let bestIndex = -1;
    for (const word of queryWords) {
      const index = textLower.indexOf(word);
      if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index;
      }
    }
    
    if (bestIndex === -1) {
      return text.substring(0, contextLength);
    }
    
    // Extract context around the found term
    const start = Math.max(0, bestIndex - contextLength / 2);
    const end = Math.min(text.length, bestIndex + contextLength / 2);
    
    return text.substring(start, end);
  }

  async processSystemDocuments() {
    try {
      console.log('Processing system documents...');
      
      const dataDir = path.join(__dirname, '../../Data');
      const files = await fs.readdir(dataDir);
      
      const documentMappings = {
        'ipc.pdf': 'ipc',
        'crpc.pdf': 'crpc',
        'crpc amendment.pdf': 'crpc_amendment',
        'The Bharatiya Nyaya Sanhita, 2023.pdf': 'bns',
        'The Bharatiya Nagarik Suraksha Sanhita, 2023.pdf': 'bnss',
        'The Bharatiya Sakshya Adhiniyam, 2023.pdf': 'bsa',
        'THE-INDIAN-EVIDENCE-ACT-1872.pdf': 'indian_evidence_act',
        'Juvenile Justice.pdf': 'juvenile_justice',
        'narcotic-drugs-and-psychotropic-substances-act-1985.pdf': 'ndps',
        'pocs.pdf': 'pocs'
      };
      
      // Create system user ID (or use a fixed ID for system documents)
      const systemUserId = '507f1f77bcf86cd799439011'; // MongoDB ObjectId placeholder
      
      for (const file of files) {
        if (documentMappings[file]) {
          const filePath = path.join(dataDir, file);
          const documentType = documentMappings[file];
          
          // Check if already processed
          const existing = await Document.findOne({
            filename: file,
            isSystemDocument: true
          });
          
          if (!existing) {
            console.log(`Processing system document: ${file}`);
            await this.processDocument(filePath, systemUserId, documentType, {
              isSystemDocument: true,
              originalName: file
            });
          } else {
            console.log(`System document already processed: ${file}`);
          }
        }
      }
      
      console.log('System documents processing completed');
    } catch (error) {
      console.error('System documents processing error:', error);
      throw error;
    }
  }
}

module.exports = new DocumentProcessor();