const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const { queryRateLimit } = require('../middleware/rateLimiter');
const grokService = require('../services/grokService');
const documentProcessor = require('../services/documentProcessor');
const Chat = require('../models/Chat');
const Document = require('../models/Document');
const { lawMappings } = require('../utils/lawMappings');

const router = express.Router();

// Apply rate limiting to query routes
router.use(queryRateLimit);

// @route   POST /api/query/ask
// @desc    Ask a legal question with RAG
// @access  Private
router.post('/ask', auth, async (req, res) => {
  try {
    const { 
      question, 
      chatId, 
      language = 'english', 
      context = '',
      documentTypes = [] 
    } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question is required'
      });
    }

    const startTime = Date.now();

    // Get or create chat
    let chat;
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }
    } else {
      // Create new chat
      chat = new Chat({
        userId: req.user._id,
        title: question.substring(0, 100) + (question.length > 100 ? '...' : ''),
        description: 'New criminal law consultation',
        caseDetails: {
          caseType: 'criminal',
          status: 'active'
        }
      });
      await chat.save();
    }

    // Add user message to chat
    const userMessageId = uuidv4();
    await chat.addMessage({
      id: userMessageId,
      type: 'user',
      content: question,
      metadata: {
        language: language
      }
    });

    // Determine document types to search
    const searchDocTypes = documentTypes.length > 0 
      ? documentTypes 
      : ['bns', 'bnss', 'bsa', 'ipc', 'crpc', 'indian_evidence_act', 'juvenile_justice', 'ndps'];

    // Search for relevant documents using RAG
    const relevantDocs = await documentProcessor.searchDocuments(
      question, 
      searchDocTypes, 
      8 // Limit to top 8 most relevant chunks
    );

    // Prepare context for Grok
    const combinedContext = [
      context,
      'Relevant legal documents and sections:'
    ].filter(Boolean).join('\n\n');

    // Get chat history for context
    const chatHistory = chat.getRecentMessages(6);

    // Generate response using Grok
    const grokResponse = await grokService.generateResponse(
      question,
      combinedContext,
      {
        language: language,
        userRole: req.user.role,
        chatHistory: chatHistory,
        relevantDocs: relevantDocs
      }
    );

    // Add AI response to chat
    const assistantMessageId = uuidv4();
    const processingTime = Date.now() - startTime;

    await chat.addMessage({
      id: assistantMessageId,
      type: 'assistant',
      content: grokResponse.response,
      metadata: {
        ...grokResponse.metadata,
        processingTime: processingTime,
        language: language,
        model: grokResponse.model,
        sources: relevantDocs.map(doc => ({
          document: doc.documentType,
          section: doc.metadata?.sectionNumber || '',
          page: doc.metadata?.page || 0,
          confidence: doc.similarity || 0
        }))
      }
    });

    // Update user query count
    await req.user.incrementQueryCount();

    // Extract law sections and check for conflicts
    const lawSections = grokResponse.metadata.lawSections || [];
    const conflicts = lawMappings.getConflicts(lawSections);

    res.json({
      success: true,
      data: {
        chatId: chat._id,
        messageId: assistantMessageId,
        response: grokResponse.response,
        metadata: {
          processingTime: processingTime,
          sources: relevantDocs.slice(0, 3), // Return top 3 sources
          lawSections: lawSections,
          conflicts: conflicts,
          relevantDocuments: relevantDocs.length,
          language: language
        }
      }
    });

  } catch (error) {
    console.error('Query processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process query',
      error: error.message
    });
  }
});

// @route   POST /api/query/analyze-case
// @desc    Analyze a case file and provide summary
// @access  Private
router.post('/analyze-case', auth, async (req, res) => {
  try {
    const { caseContent, chatId, language = 'english' } = req.body;

    if (!caseContent || caseContent.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Case content is required'
      });
    }

    const startTime = Date.now();

    // Get chat if provided
    let chat;
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }
    }

    // Generate case summary using Grok
    const summaryResponse = await grokService.generateCaseSummary(
      caseContent,
      { language: language }
    );

    // Search for relevant legal sections
    const relevantDocs = await documentProcessor.searchDocuments(
      caseContent.substring(0, 500), // Use first 500 chars for search
      ['bns', 'bnss', 'bsa', 'ipc', 'crpc', 'indian_evidence_act'],
      5
    );

    const processingTime = Date.now() - startTime;

    // If chat provided, add the analysis to chat
    if (chat) {
      const messageId = uuidv4();
      await chat.addMessage({
        id: messageId,
        type: 'assistant',
        content: `**Case Analysis Summary:**\n\n${summaryResponse.summary}`,
        metadata: {
          processingTime: processingTime,
          language: language,
          type: 'case_analysis',
          sources: relevantDocs.map(doc => ({
            document: doc.documentType,
            section: doc.metadata?.sectionNumber || '',
            confidence: doc.similarity || 0
          }))
        }
      });

      // Update chat summary
      await chat.generateSummary();
    }

    res.json({
      success: true,
      data: {
        summary: summaryResponse.summary,
        metadata: {
          processingTime: processingTime,
          relevantSections: relevantDocs.slice(0, 3),
          language: language
        }
      }
    });

  } catch (error) {
    console.error('Case analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze case',
      error: error.message
    });
  }
});

// @route   GET /api/query/search-sections
// @desc    Search for specific legal sections
// @access  Private
router.get('/search-sections', auth, async (req, res) => {
  try {
    const { query, act, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Determine document types to search
    let documentTypes = [];
    if (act) {
      const actLower = act.toLowerCase();
      if (['bns', 'ipc'].includes(actLower)) {
        documentTypes = ['bns', 'ipc'];
      } else if (['bnss', 'crpc'].includes(actLower)) {
        documentTypes = ['bnss', 'crpc'];
      } else if (['bsa', 'indian_evidence_act'].includes(actLower)) {
        documentTypes = ['bsa', 'indian_evidence_act'];
      } else {
        documentTypes = [actLower];
      }
    } else {
      // Search all criminal law documents
      documentTypes = ['bns', 'bnss', 'bsa', 'ipc', 'crpc', 'indian_evidence_act'];
    }

    // Search documents
    const results = await documentProcessor.searchDocuments(
      query,
      documentTypes,
      parseInt(limit)
    );

    // Format results with law mapping information
    const formattedResults = results.map(result => {
      const lawInfo = lawMappings.getReplacement(
        result.documentType.toUpperCase(),
        result.metadata?.sectionNumber || ''
      );

      return {
        documentType: result.documentType,
        section: result.metadata?.sectionNumber || '',
        content: result.content,
        similarity: result.similarity,
        page: result.metadata?.page || 0,
        replacement: lawInfo,
        isOutdated: lawMappings.isLawOutdated(result.documentType.toUpperCase())
      };
    });

    res.json({
      success: true,
      data: {
        results: formattedResults,
        query: query,
        act: act,
        total: formattedResults.length
      }
    });

  } catch (error) {
    console.error('Section search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search sections',
      error: error.message
    });
  }
});

// @route   GET /api/query/law-mapping/:act/:section
// @desc    Get law mapping information for a specific section
// @access  Private
router.get('/law-mapping/:act/:section', auth, async (req, res) => {
  try {
    const { act, section } = req.params;

    const actUpper = act.toUpperCase();
    
    // Get new law equivalent if it's an old law
    const newEquivalent = lawMappings.getNewLawEquivalent(actUpper, section);
    
    // Get old law equivalent if it's a new law
    const oldEquivalent = lawMappings.getOldLawEquivalent(actUpper, section);
    
    // Get replacement information
    const replacement = lawMappings.getReplacement(actUpper, section);
    
    // Check if law is outdated
    const isOutdated = lawMappings.isLawOutdated(actUpper);
    
    // Format citation
    const citation = lawMappings.formatCitation(actUpper, section);

    res.json({
      success: true,
      data: {
        act: actUpper,
        section: section,
        citation: citation,
        isOutdated: isOutdated,
        replacement: replacement,
        newEquivalent: newEquivalent,
        oldEquivalent: oldEquivalent
      }
    });

  } catch (error) {
    console.error('Law mapping error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get law mapping information',
      error: error.message
    });
  }
});

// @route   GET /api/query/law-conflicts
// @desc    Check for conflicts between old and new laws in text
// @access  Private
router.post('/law-conflicts', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    // Extract law sections from text
    const sectionPattern = /(BNS|BNSS|BSA|IPC|CrPC|Indian Evidence Act)\s+(?:Section\s+)?(\d+[A-Z]?)/gi;
    const sections = [];
    
    let match;
    while ((match = sectionPattern.exec(text)) !== null) {
      sections.push({
        act: match[1].toUpperCase(),
        sectionNumber: match[2]
      });
    }

    // Get conflicts
    const conflicts = lawMappings.getConflicts(sections);

    // Get recommendations for updating to new laws
    const recommendations = sections
      .filter(section => lawMappings.isLawOutdated(section.act))
      .map(section => {
        const newEquivalent = lawMappings.getNewLawEquivalent(section.act, section.sectionNumber);
        return {
          original: section,
          recommended: newEquivalent,
          reason: 'This law has been replaced by newer legislation as of 2023'
        };
      });

    res.json({
      success: true,
      data: {
        sectionsFound: sections,
        conflicts: conflicts,
        recommendations: recommendations,
        totalConflicts: conflicts.length,
        needsUpdate: recommendations.length > 0
      }
    });

  } catch (error) {
    console.error('Law conflicts check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check law conflicts',
      error: error.message
    });
  }
});

module.exports = router;