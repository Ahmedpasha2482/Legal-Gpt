const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import models and services
const documentProcessor = require('../services/documentProcessor');
const Document = require('../models/Document');

/**
 * Initialize system documents by processing all legal PDFs in the Data folder
 */
async function initializeSystemDocuments() {
  try {
    console.log('🚀 Starting Criminal Law AI Chatbot System Document Initialization...\n');

    // Connect to MongoDB
    console.log('📊 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/criminal_law_chatbot');
    console.log('✅ Connected to MongoDB successfully\n');

    // Check if system documents already exist
    const existingDocs = await Document.find({ isSystemDocument: true });
    
    if (existingDocs.length > 0) {
      console.log(`📋 Found ${existingDocs.length} existing system documents`);
      console.log('❓ Do you want to reprocess them? (This will delete existing documents)');
      
      // For automated setup, skip reprocessing if documents exist
      console.log('ℹ️  Skipping reprocessing. Use force flag to reprocess existing documents.\n');
    }

    // Initialize document processor
    console.log('🔧 Initializing document processor...');
    
    // Process system documents
    console.log('📄 Processing system legal documents...');
    await documentProcessor.processSystemDocuments();
    
    // Get final count
    const finalDocs = await Document.find({ isSystemDocument: true });
    console.log(`\n✅ System initialization completed!`);
    console.log(`📊 Total system documents: ${finalDocs.length}`);
    
    // Display document summary
    console.log('\n📋 Document Summary:');
    const docTypes = {};
    finalDocs.forEach(doc => {
      docTypes[doc.documentType] = (docTypes[doc.documentType] || 0) + 1;
    });
    
    Object.entries(docTypes).forEach(([type, count]) => {
      console.log(`   - ${type.toUpperCase()}: ${count} document(s)`);
    });

    // Display status summary
    const statusSummary = {};
    finalDocs.forEach(doc => {
      statusSummary[doc.processingStatus] = (statusSummary[doc.processingStatus] || 0) + 1;
    });

    console.log('\n📈 Processing Status:');
    Object.entries(statusSummary).forEach(([status, count]) => {
      const emoji = status === 'completed' ? '✅' : status === 'processing' ? '⏳' : status === 'failed' ? '❌' : '⏸️';
      console.log(`   ${emoji} ${status.toUpperCase()}: ${count} document(s)`);
    });

    console.log('\n🎉 Criminal Law AI Chatbot is ready to serve!');
    console.log('🌐 You can now start the server and begin using the legal assistant.');
    
  } catch (error) {
    console.error('❌ Error during system initialization:', error);
    throw error;
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n📊 MongoDB connection closed.');
  }
}

/**
 * Force reprocess all system documents
 */
async function forceReprocessSystemDocuments() {
  try {
    console.log('🔄 Force reprocessing system documents...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/criminal_law_chatbot');
    
    // Delete existing system documents
    const deleteResult = await Document.deleteMany({ isSystemDocument: true });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing system documents`);
    
    // Process documents
    await documentProcessor.processSystemDocuments();
    
    const finalDocs = await Document.find({ isSystemDocument: true });
    console.log(`✅ Reprocessing completed! Total documents: ${finalDocs.length}`);
    
  } catch (error) {
    console.error('❌ Error during force reprocessing:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

/**
 * Check system health and document status
 */
async function checkSystemHealth() {
  try {
    console.log('🔍 Checking Criminal Law AI Chatbot system health...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/criminal_law_chatbot');
    
    // Check documents
    const totalDocs = await Document.countDocuments({ isSystemDocument: true });
    const completedDocs = await Document.countDocuments({ 
      isSystemDocument: true, 
      processingStatus: 'completed' 
    });
    const failedDocs = await Document.countDocuments({ 
      isSystemDocument: true, 
      processingStatus: 'failed' 
    });
    
    console.log('📊 System Health Report:');
    console.log(`   📄 Total system documents: ${totalDocs}`);
    console.log(`   ✅ Successfully processed: ${completedDocs}`);
    console.log(`   ❌ Failed processing: ${failedDocs}`);
    console.log(`   ⏳ Processing success rate: ${totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0}%`);
    
    // Check specific law types
    const lawTypes = [
      'bns', 'bnss', 'bsa',           // New laws
      'ipc', 'crpc', 'indian_evidence_act', // Old laws  
      'juvenile_justice', 'ndps', 'pocs'     // Special acts
    ];
    
    console.log('\n📋 Law Coverage:');
    for (const lawType of lawTypes) {
      const count = await Document.countDocuments({ 
        isSystemDocument: true, 
        documentType: lawType,
        processingStatus: 'completed'
      });
      const status = count > 0 ? '✅' : '❌';
      console.log(`   ${status} ${lawType.toUpperCase()}: ${count} document(s)`);
    }
    
    // Health status
    const healthScore = totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0;
    let healthStatus = 'CRITICAL';
    let healthEmoji = '🔴';
    
    if (healthScore >= 90) {
      healthStatus = 'EXCELLENT';
      healthEmoji = '🟢';
    } else if (healthScore >= 70) {
      healthStatus = 'GOOD';
      healthEmoji = '🟡';
    } else if (healthScore >= 50) {
      healthStatus = 'FAIR';
      healthEmoji = '🟠';
    }
    
    console.log(`\n${healthEmoji} System Health: ${healthStatus} (${Math.round(healthScore)}%)`);
    
    if (healthScore < 90) {
      console.log('\n💡 Recommendations:');
      if (failedDocs > 0) {
        console.log('   - Reprocess failed documents');
        console.log('   - Check API keys and configurations');
      }
      if (totalDocs < lawTypes.length) {
        console.log('   - Ensure all legal documents are in the Data/ folder');
        console.log('   - Run initialization script');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during health check:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// CLI interface
const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'init':
        await initializeSystemDocuments();
        break;
      case 'force':
        await forceReprocessSystemDocuments();
        break;
      case 'health':
        await checkSystemHealth();
        break;
      default:
        console.log('🏛️  Criminal Law AI Chatbot - System Document Manager\n');
        console.log('Usage:');
        console.log('  node initializeSystemDocuments.js init    - Initialize system documents');
        console.log('  node initializeSystemDocuments.js force   - Force reprocess all documents');
        console.log('  node initializeSystemDocuments.js health  - Check system health');
        console.log('\nExamples:');
        console.log('  npm run init-docs     # Initialize system documents');
        console.log('  npm run check-health  # Check system health');
    }
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  initializeSystemDocuments,
  forceReprocessSystemDocuments,
  checkSystemHealth
};