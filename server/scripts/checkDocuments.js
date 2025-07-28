const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');

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

// Check documents
const checkDocuments = async () => {
  try {
    console.log('Checking documents in database...');
    
    const documents = await Document.find({});
    console.log(`Found ${documents.length} documents in database`);
    
    const uploadDir = path.join(__dirname, '../uploads/documents');
    
    for (const doc of documents) {
      console.log(`\nDocument: ${doc.originalName}`);
      console.log(`- ID: ${doc._id}`);
      console.log(`- Type: ${doc.type}`);
      console.log(`- Employee: ${doc.employee}`);
      console.log(`- Filename: ${doc.filename}`);
      console.log(`- GCS File: ${doc.gcsFileName || 'Not uploaded to GCS'}`);
      console.log(`- GCS URL: ${doc.gcsPublicUrl || 'No GCS URL'}`);
      
      // Check if local file exists
      const filePath = path.join(uploadDir, doc.filename);
      const localFileExists = fs.existsSync(filePath);
      console.log(`- Local file exists: ${localFileExists}`);
      
      if (localFileExists) {
        const stats = fs.statSync(filePath);
        console.log(`- Local file size: ${stats.size} bytes`);
      }
    }
    
  } catch (error) {
    console.error('Error checking documents:', error);
  }
};

// Run check
const runCheck = async () => {
  await connectDB();
  await checkDocuments();
  console.log('\nDocument check completed');
  process.exit(0);
};

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

// Run the check
runCheck(); 