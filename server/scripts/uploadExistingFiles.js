const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const { uploadFileToGCS } = require('../services/gcsService');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Upload existing files to GCS
const uploadExistingFiles = async () => {
  try {
    console.log('Uploading existing files to GCS...');
    
    const uploadDir = path.join(__dirname, '../uploads/documents');
    const files = fs.readdirSync(uploadDir);
    
    console.log(`Found ${files.length} files in uploads directory`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const filename of files) {
      try {
        console.log(`\nProcessing file: ${filename}`);
        
        const filePath = path.join(uploadDir, filename);
        const fileStats = fs.statSync(filePath);
        
        // Extract original name from filename (remove timestamp and random suffix)
        const nameParts = filename.split('-');
        if (nameParts.length < 3) {
          console.log(`Skipping file with invalid format: ${filename}`);
          continue;
        }
        
        // Remove timestamp and random suffix, keep the rest as original name
        const originalName = nameParts.slice(2).join('-');
        
        console.log(`- Original name: ${originalName}`);
        console.log(`- File size: ${fileStats.size} bytes`);
        
        // Read file
        const fileBuffer = fs.readFileSync(filePath);
        
        // Create a mock file object for GCS upload
        const mockFile = {
          buffer: fileBuffer,
          originalname: originalName,
          mimetype: getMimeType(originalName),
          size: fileStats.size
        };
        
        // Use a default employee ID and document type for existing files
        const defaultEmployeeId = '68873774b1426c66be659398'; // Use the existing employee ID
        const defaultDocumentType = 'Other'; // Default type for existing files
        
        console.log(`- Uploading to GCS with employee: ${defaultEmployeeId}, type: ${defaultDocumentType}`);
        
        // Upload to GCS
        const gcsResult = await uploadFileToGCS(mockFile, defaultEmployeeId, defaultDocumentType);
        
        // Check if document already exists in database
        const existingDoc = await Document.findOne({ filename: filename });
        
        if (existingDoc) {
          // Update existing document with GCS info
          await Document.findByIdAndUpdate(existingDoc._id, {
            gcsFileName: gcsResult.gcsFileName,
            gcsPublicUrl: gcsResult.publicUrl,
            fileSize: gcsResult.size,
            mimeType: gcsResult.mimetype
          });
          console.log(`- Updated existing document in database`);
        } else {
          // Create new document entry
          const newDoc = new Document({
            employee: defaultEmployeeId,
            type: defaultDocumentType,
            filename: filename,
            originalName: originalName,
            gcsFileName: gcsResult.gcsFileName,
            gcsPublicUrl: gcsResult.publicUrl,
            fileSize: gcsResult.size,
            mimeType: gcsResult.mimetype
          });
          
          await newDoc.save();
          console.log(`- Created new document entry in database`);
        }
        
        console.log(`- Successfully uploaded to GCS: ${gcsResult.gcsFileName}`);
        successCount++;
        
      } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\nUpload completed:`);
    console.log(`- Successfully uploaded: ${successCount} files`);
    console.log(`- Failed uploads: ${errorCount} files`);
    
  } catch (error) {
    console.error('Upload error:', error);
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
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Run upload
const runUpload = async () => {
  await connectDB();
  await uploadExistingFiles();
  console.log('Upload script completed');
  process.exit(0);
};

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

// Run the upload
runUpload(); 