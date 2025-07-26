const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { auth } = require('../middleware/auth');
const { uploadRateLimit } = require('../middleware/rateLimiter');
const documentProcessor = require('../services/documentProcessor');
const Document = require('../models/Document');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'txt', 'doc', 'docx'];
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
    files: 5 // Maximum 5 files per request
  }
});

// Apply rate limiting to upload routes
router.use(uploadRateLimit);

// @route   POST /api/documents/upload
// @desc    Upload document(s) for processing
// @access  Private
router.post('/upload', auth, upload.array('documents', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const { documentType = 'case_file', description = '' } = req.body;
    const uploadResults = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        console.log(`Processing uploaded file: ${file.originalname}`);
        
        const document = await documentProcessor.processDocument(
          file.path,
          req.user._id,
          documentType,
          {
            originalName: file.originalname,
            description: description
          }
        );

        uploadResults.push({
          success: true,
          filename: file.originalname,
          documentId: document._id,
          message: 'File uploaded and processing initiated'
        });

        // Update user document count
        await req.user.incrementDocumentsUploaded();

      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        
        // Clean up file on error
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }

        uploadResults.push({
          success: false,
          filename: file.originalname,
          error: error.message
        });
      }
    }

    const successCount = uploadResults.filter(result => result.success).length;
    const failureCount = uploadResults.length - successCount;

    res.status(successCount > 0 ? 201 : 400).json({
      success: successCount > 0,
      message: `${successCount} file(s) uploaded successfully, ${failureCount} failed`,
      data: {
        results: uploadResults,
        summary: {
          total: uploadResults.length,
          successful: successCount,
          failed: failureCount
        }
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up any uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
    }

    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
});

// @route   GET /api/documents
// @desc    Get user's documents
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      documentType,
      processingStatus,
      search 
    } = req.query;

    const query = { userId: req.user._id };
    
    if (documentType) {
      query.documentType = documentType;
    }
    
    if (processingStatus) {
      query.processingStatus = processingStatus;
    }
    
    if (search) {
      query.$or = [
        { originalName: new RegExp(search, 'i') },
        { extractedText: new RegExp(search, 'i') },
        { 'searchableFields.keywords': { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const documents = await Document.find(query)
      .select('-extractedText -chunks') // Exclude large fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(query);

    res.json({
      success: true,
      data: {
        documents: documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents'
    });
  }
});

// @route   GET /api/documents/:id
// @desc    Get specific document details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user._id },
        { isSystemDocument: true },
        { isPublic: true }
      ]
    }).select('-chunks'); // Exclude chunks for performance

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: {
        document: document
      }
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document'
    });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Don't allow deletion of system documents
    if (document.isSystemDocument) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system documents'
      });
    }

    // Delete physical file
    try {
      await fs.unlink(document.filePath);
    } catch (error) {
      console.warn('Could not delete physical file:', error.message);
    }

    // Delete document record
    await Document.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
});

// @route   GET /api/documents/:id/download
// @desc    Download document file
// @access  Private
router.get('/:id/download', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user._id },
        { isSystemDocument: true },
        { isPublic: true }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(document.filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Update download count
    await document.incrementDownloadCount();

    // Set appropriate headers
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);

    // Stream the file
    const stream = require('fs').createReadStream(document.filePath);
    stream.pipe(res);

  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document'
    });
  }
});

// @route   POST /api/documents/:id/reprocess
// @desc    Reprocess document
// @access  Private
router.post('/:id/reprocess', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (document.isSystemDocument) {
      return res.status(403).json({
        success: false,
        message: 'Cannot reprocess system documents'
      });
    }

    // Reset processing status
    await document.updateProcessingStatus('pending');

    // Reprocess the document
    await documentProcessor.processDocument(
      document.filePath,
      document.userId,
      document.documentType,
      {
        originalName: document.originalName,
        isReprocessing: true
      }
    );

    res.json({
      success: true,
      message: 'Document reprocessing initiated'
    });

  } catch (error) {
    console.error('Reprocess document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reprocess document'
    });
  }
});

// @route   GET /api/documents/system/list
// @desc    Get list of system documents
// @access  Private
router.get('/system/list', auth, async (req, res) => {
  try {
    const { documentType } = req.query;

    const systemDocuments = await Document.findSystemDocuments(documentType)
      .select('-extractedText -chunks');

    res.json({
      success: true,
      data: {
        documents: systemDocuments,
        total: systemDocuments.length
      }
    });

  } catch (error) {
    console.error('Get system documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system documents'
    });
  }
});

// @route   POST /api/documents/search
// @desc    Search documents content
// @access  Private
router.post('/search', auth, async (req, res) => {
  try {
    const { 
      query, 
      documentTypes = [], 
      limit = 10,
      includeUserDocs = true,
      includeSystemDocs = true 
    } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Build document filter
    const docTypeFilter = documentTypes.length > 0 ? documentTypes : [];
    
    // Search documents
    const results = await documentProcessor.searchDocuments(
      query,
      docTypeFilter,
      parseInt(limit)
    );

    // Filter results based on access permissions
    const accessibleResults = results.filter(result => {
      if (result.isSystemDocument && includeSystemDocs) return true;
      if (!result.isSystemDocument && includeUserDocs && result.userId === req.user._id.toString()) return true;
      return false;
    });

    res.json({
      success: true,
      data: {
        results: accessibleResults,
        query: query,
        total: accessibleResults.length,
        filters: {
          documentTypes: docTypeFilter,
          includeUserDocs,
          includeSystemDocs
        }
      }
    });

  } catch (error) {
    console.error('Search documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search documents'
    });
  }
});

// @route   GET /api/documents/stats
// @desc    Get document statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      totalDocuments,
      processingDocuments,
      completedDocuments,
      failedDocuments,
      documentsByType
    ] = await Promise.all([
      Document.countDocuments({ userId }),
      Document.countDocuments({ userId, processingStatus: 'processing' }),
      Document.countDocuments({ userId, processingStatus: 'completed' }),
      Document.countDocuments({ userId, processingStatus: 'failed' }),
      Document.aggregate([
        { $match: { userId } },
        { $group: { _id: '$documentType', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total: totalDocuments,
        processing: processingDocuments,
        completed: completedDocuments,
        failed: failedDocuments,
        byType: documentsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Get document stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document statistics'
    });
  }
});

module.exports = router;