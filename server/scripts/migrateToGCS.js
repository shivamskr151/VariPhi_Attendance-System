const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const { uploadFileToGCS } = require('../services/gcsService');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system');
    console.log('MongoDB connected for migration');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migrate documents to GCS
const migrateDocumentsToGCS = async () => {
  try {
    console.log('Starting document migration to GCS...');
    
    // Get all documents that don't have GCS info
    const documents = await Document.find({ gcsFileName: { $exists: false } });
    console.log(`Found ${documents.length} documents to migrate`);
    
    if (documents.length === 0) {
      console.log('No documents to migrate');
      return;
    }
    
    const uploadDir = path.join(__dirname, '../uploads/documents');
    let successCount = 0;
    let errorCount = 0;
    
    for (const doc of documents) {
      try {
        console.log(`Migrating document: ${doc.originalName} (${doc._id})`);
        
        // Check if local file exists
        const filePath = path.join(uploadDir, doc.filename);
        if (!fs.existsSync(filePath)) {
          console.log(`Local file not found: ${filePath}`);
          errorCount++;
          continue;
        }
        
        // Read file
        const fileBuffer = fs.readFileSync(filePath);
        const fileStats = fs.statSync(filePath);
        
        // Create a mock file object for GCS upload
        const mockFile = {
          buffer: fileBuffer,
          originalname: doc.originalName,
          mimetype: getMimeType(doc.originalName),
          size: fileStats.size
        };
        
        // Upload to GCS
        const gcsResult = await uploadFileToGCS(mockFile, doc.employee.toString(), doc.type);
        
        // Update document in database
        await Document.findByIdAndUpdate(doc._id, {
          gcsFileName: gcsResult.gcsFileName,
          gcsPublicUrl: gcsResult.publicUrl,
          fileSize: gcsResult.size,
          mimeType: gcsResult.mimetype
        });
        
        console.log(`Successfully migrated: ${doc.originalName}`);
        successCount++;
        
      } catch (error) {
        console.error(`Error migrating document ${doc.originalName}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\nMigration completed:`);
    console.log(`- Successfully migrated: ${successCount} documents`);
    console.log(`- Failed migrations: ${errorCount} documents`);
    
  } catch (error) {
    console.error('Migration error:', error);
  }
};

// Helper function to get MIME type
const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Run migration
const runMigration = async () => {
  await connectDB();
  await migrateDocumentsToGCS();
  console.log('Migration script completed');
  process.exit(0);
};

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

// Run the migration
runMigration(); 