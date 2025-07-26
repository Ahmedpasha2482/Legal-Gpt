const express = require('express');
const { auth } = require('../middleware/auth');
const Chat = require('../models/Chat');

const router = express.Router();

// @route   GET /api/chat
// @desc    Get user's chats
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, includeArchived = false } = req.query;
    
    const options = {
      includeArchived: includeArchived === 'true',
      limit: parseInt(limit)
    };

    const chats = await Chat.findUserChats(req.user._id, options);
    
    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedChats = chats.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        chats: paginatedChats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: chats.length,
          pages: Math.ceil(chats.length / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve chats'
    });
  }
});

// @route   GET /api/chat/:id
// @desc    Get specific chat with messages
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.json({
      success: true,
      data: {
        chat: chat
      }
    });

  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve chat'
    });
  }
});

// @route   POST /api/chat
// @desc    Create new chat
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      caseDetails = {},
      initialMessage 
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Chat title is required'
      });
    }

    const chat = new Chat({
      userId: req.user._id,
      title: title,
      description: description,
      caseDetails: {
        caseType: 'criminal',
        status: 'active',
        ...caseDetails
      }
    });

    await chat.save();

    // Add initial message if provided
    if (initialMessage) {
      await chat.addMessage({
        type: 'user',
        content: initialMessage,
        metadata: {}
      });
    }

    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: {
        chat: chat
      }
    });

  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat',
      error: error.message
    });
  }
});

// @route   PUT /api/chat/:id
// @desc    Update chat details
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const allowedUpdates = ['title', 'description', 'caseDetails'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    Object.assign(chat, updates);
    await chat.save();

    res.json({
      success: true,
      message: 'Chat updated successfully',
      data: {
        chat: chat
      }
    });

  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chat',
      error: error.message
    });
  }
});

// @route   DELETE /api/chat/:id
// @desc    Delete chat
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    await Chat.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });

  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chat'
    });
  }
});

// @route   POST /api/chat/:id/archive
// @desc    Archive/unarchive chat
// @access  Private
router.post('/:id/archive', auth, async (req, res) => {
  try {
    const { archive = true } = req.body;

    const chat = await Chat.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (archive) {
      await chat.archive();
    } else {
      chat.isArchived = false;
      await chat.save();
    }

    res.json({
      success: true,
      message: `Chat ${archive ? 'archived' : 'unarchived'} successfully`,
      data: {
        chat: chat
      }
    });

  } catch (error) {
    console.error('Archive chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive/unarchive chat'
    });
  }
});

// @route   POST /api/chat/:id/share
// @desc    Share chat with another user
// @access  Private
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { userId, permission = 'read' } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const chat = await Chat.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify the user exists
    const User = require('../models/User');
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    await chat.shareWith(userId, permission);

    res.json({
      success: true,
      message: 'Chat shared successfully',
      data: {
        chat: chat,
        sharedWith: targetUser.name
      }
    });

  } catch (error) {
    console.error('Share chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share chat'
    });
  }
});

// @route   GET /api/chat/:id/export
// @desc    Export chat as PDF or JSON
// @access  Private
router.get('/:id/export', auth, async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const chat = await Chat.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="chat-${chat._id}.json"`);
      
      const exportData = {
        title: chat.title,
        description: chat.description,
        caseDetails: chat.caseDetails,
        messages: chat.messages.map(msg => ({
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        })),
        summary: chat.summary,
        createdAt: chat.createdAt,
        exportedAt: new Date()
      };

      res.json(exportData);
    } else {
      // For now, return JSON format even for PDF requests
      // In a full implementation, you would use a PDF library
      res.json({
        success: false,
        message: 'PDF export not yet implemented'
      });
    }

  } catch (error) {
    console.error('Export chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export chat'
    });
  }
});

// @route   POST /api/chat/:id/generate-summary
// @desc    Generate chat summary
// @access  Private
router.post('/:id/generate-summary', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    await chat.generateSummary();

    res.json({
      success: true,
      message: 'Summary generated successfully',
      data: {
        summary: chat.summary
      }
    });

  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate summary'
    });
  }
});

// @route   GET /api/chat/search
// @desc    Search chats
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchRegex = new RegExp(query, 'i');

    const chats = await Chat.find({
      userId: req.user._id,
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { 'messages.content': searchRegex }
      ]
    })
    .limit(parseInt(limit))
    .sort({ lastActivity: -1 })
    .select('-messages'); // Exclude messages for performance

    res.json({
      success: true,
      data: {
        chats: chats,
        query: query,
        total: chats.length
      }
    });

  } catch (error) {
    console.error('Search chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search chats'
    });
  }
});

module.exports = router;