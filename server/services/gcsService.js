const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: 'glassy-song-449317-a9',
  keyFilename: path.join(__dirname, '../config/gcs-key.json')
});

const bucketName = 'variphi_attendance_system';

// Ensure bucket exists
const ensureBucketExists = async () => {
  try {
    const [exists] = await storage.bucket(bucketName).exists();
    if (!exists) {
      await storage.createBucket(bucketName);
      console.log(`Bucket ${bucketName} created successfully.`);
    } else {
      console.log(`Bucket ${bucketName} already exists.`);
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    throw error;
  }
};

// Upload file to GCS
const uploadFileToGCS = async (file, employeeId, documentType) => {
  try {
    // Ensure bucket exists
    await ensureBucketExists();
    
    const bucket = storage.bucket(bucketName);
    
    // Create a unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/\s+/g, '_');
    const gcsFileName = `${employeeId}/${documentType}/${timestamp}-${randomSuffix}-${sanitizedOriginalName}`;
    
    // Create file object in bucket
    const gcsFile = bucket.file(gcsFileName);
    
    // Upload file
    await gcsFile.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          employeeId: employeeId,
          documentType: documentType,
          uploadedAt: new Date().toISOString()
        }
      }
    });
    
    // Note: Not making file public since bucket has uniform access control enabled
    // Files will be accessed through the API endpoints
    
    console.log(`File uploaded to GCS: ${gcsFileName}`);
    
    return {
      gcsFileName,
      publicUrl: null, // Not making files public due to uniform access control
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    };
  } catch (error) {
    console.error('Error uploading file to GCS:', error);
    throw error;
  }
};

// Delete file from GCS
const deleteFileFromGCS = async (gcsFileName) => {
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(gcsFileName);
    
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      console.log(`File deleted from GCS: ${gcsFileName}`);
      return true;
    } else {
      console.log(`File not found in GCS: ${gcsFileName}`);
      return false;
    }
  } catch (error) {
    console.error('Error deleting file from GCS:', error);
    throw error;
  }
};

// Get file from GCS
const getFileFromGCS = async (gcsFileName) => {
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(gcsFileName);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error('File not found in GCS');
    }
    
    const [buffer] = await file.download();
    const [metadata] = await file.getMetadata();
    
    return {
      buffer,
      metadata,
      contentType: metadata.contentType
    };
  } catch (error) {
    console.error('Error getting file from GCS:', error);
    throw error;
  }
};

module.exports = {
  uploadFileToGCS,
  deleteFileFromGCS,
  getFileFromGCS,
  ensureBucketExists
}; 