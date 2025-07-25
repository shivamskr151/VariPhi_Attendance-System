const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const Employee = require('../models/Employee');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

const upload = multer({ storage });

// Upload a document
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { employee, type } = req.body;
    console.log('Document upload request:', { employee, type, fileName: req.file?.originalname });
    
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const doc = new Document({
      employee,
      type,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
    
    console.log('Saving document to database:', doc);
    await doc.save();
    console.log('Document saved successfully:', doc._id);
    
    res.status(201).json(doc);
  } catch (err) {
    console.error('Document upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List documents for an employee
router.get('/employee/:employeeId', async (req, res) => {
  try {
    console.log('Fetching documents for employee:', req.params.employeeId);
    const docs = await Document.find({ employee: req.params.employeeId }).sort({ uploadedAt: -1 });
    console.log(`Found ${docs.length} documents for employee ${req.params.employeeId}`);
    
    if (docs.length > 0) {
      console.log('Document sample:', docs[0]);
    }
    
    res.json(docs);
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: err.message });
  }
});

// Download a document
router.get('/download/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const filePath = path.join(uploadDir, doc.filename);
    res.download(filePath, doc.originalName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Preview a document (inline for browser)
router.get('/preview/:id', async (req, res) => {
  try {
    console.log('Preview request for document ID:', req.params.id);
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      console.error('Document not found in database:', req.params.id);
      return res.status(404).json({ error: 'Document not found' });
    }
    console.log('Document found:', { id: doc._id, filename: doc.filename, type: doc.type });
    const filePath = path.join(uploadDir, doc.filename);
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return res.status(404).json({ error: 'File not found' });
    }
    // Determine content type
    const mime = require('mime-types');
    let contentType = mime.lookup(doc.originalName);
    
    // Ensure PDFs are properly identified
    if (!contentType) {
      if (/\.pdf$/i.test(doc.originalName)) {
        contentType = 'application/pdf';
      } else {
        contentType = 'application/octet-stream';
      }
    }
    
    console.log(`Preview for ${doc.originalName}: Content-Type: ${contentType}`);
    
    // Set headers for preview
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    
    // Override security headers for document preview to allow iframe embedding
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "default-src 'self'; frame-src 'self'; object-src 'self';");
    
    // Add cache headers for better performance
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('ETag', `"${doc._id}-${doc.uploadedAt}"`);
    
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });
    stream.pipe(res);
  } catch (err) {
    console.error('Preview endpoint error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// Delete a document
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const filePath = path.join(uploadDir, doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 