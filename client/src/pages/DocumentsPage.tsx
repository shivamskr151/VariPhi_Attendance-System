import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import type { AxiosProgressEvent } from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { api } from '../services/api';
import {
  Box, Card, CardContent, Typography, Button, Grid, TextField, Select, MenuItem, InputLabel, FormControl, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar, Alert, LinearProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip
} from '@mui/material';
import { CloudUpload, Delete, InsertDriveFile, Image as ImageIcon, PictureAsPdf, Close, CameraAlt } from '@mui/icons-material';

// Get the base URL for direct file access
  const getApiBaseUrl = () => {
    return process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  };

  const fetchImageBlob = async (documentId: string): Promise<string | null> => {
    try {
      const response = await api.get(`/documents/preview/${documentId}`, {
        responseType: 'blob'
      });
      
      if (response.data) {
        const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/jpeg' });
        return URL.createObjectURL(blob);
      }
      return null;
    } catch (error) {
      console.error('Error fetching image blob:', error);
      return null;
    }
  };

const DOCUMENT_TYPES = [
  'Aadhar Card',
  'PAN Card',
  'Passport',
  'Offer Letter',
  'Experience Letter',
  'Salary Slip',
  'Graduation Certificate',
  'Photos',
  'Other'
];

const MAX_FILE_SIZE_MB = 10;

const getFileIcon = (name: string) => {
  if (/\.(jpg|jpeg|png|gif)$/i.test(name)) return <ImageIcon color="primary" />;
  if (/\.pdf$/i.test(name)) return <PictureAsPdf color="error" />;
  return <InsertDriveFile color="action" />;
};

const DocumentsPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [documents, setDocuments] = useState<any[]>([]);
  // Per-type upload state
  const [fileStates, setFileStates] = useState<{ [type: string]: { file: File | null; uploadProgress: number; loading: boolean; error: string; success: string } }>(
    () => Object.fromEntries(DOCUMENT_TYPES.map(type => [type, { file: null, uploadProgress: 0, loading: false, error: '', success: '' }]))
  );
  // Document list state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [type: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    console.log('User object in DocumentsPage:', user);
    console.log('User type:', typeof user);
    console.log('User keys:', user ? Object.keys(user) : 'no user');
    if (user?._id) {
      console.log('User ID found, fetching documents:', user._id);
      console.log('User ID type:', typeof user._id);
      fetchDocuments();
    } else {
      console.log('No user ID available, cannot fetch documents');
      if (user) {
        console.log('User exists but no _id field. Available fields:', Object.keys(user));
      }
    }
  }, [user?._id]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl);
      }
    };
  }, [imageBlobUrl]);

  const fetchDocuments = async () => {
    if (!user?._id) {
      console.log('No user ID available for fetching documents');
      return;
    }
    
    console.log('Fetching documents for user:', user._id);
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await api.get(`/documents/employee/${user._id}`);
      console.log('Documents API response:', res.data);
      setDocuments(res.data || []);
      
      if (!res.data || res.data.length === 0) {
        console.log('No documents found for user');
      } else {
        console.log(`Found ${res.data.length} documents`);
        res.data.forEach((doc: any, index: number) => {
          console.log(`Document ${index + 1}:`, {
            id: doc._id,
            type: doc.type,
            name: doc.originalName,
            uploadedAt: doc.uploadedAt
          });
        });
      }
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      setError(err.response?.data?.error || err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (type: string, f: File | null) => {
    setFileStates(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        file: f,
        error: f && f.size > MAX_FILE_SIZE_MB * 1024 * 1024 ? `File size exceeds ${MAX_FILE_SIZE_MB}MB limit.` : '',
        success: '',
      },
    }));
  };



  const handleUpload = async (e: React.FormEvent, type: string) => {
    e.preventDefault();
    const { file } = fileStates[type];
    if (!file) {
      setFileStates(prev => ({ ...prev, [type]: { ...prev[type], error: 'Please select a file', success: '' } }));
      return;
    }
    if (!user?._id) {
      setFileStates(prev => ({ ...prev, [type]: { ...prev[type], error: 'User not loaded', success: '' } }));
      return;
    }
    setFileStates(prev => ({ ...prev, [type]: { ...prev[type], loading: true, uploadProgress: 0, error: '', success: '', file } }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employee', user._id);
      formData.append('type', type);
      
      
      console.log(`Individual upload for ${type}:`, {
        file: file.name,
        employee: user._id,
        type: type
      });
      await api.post('/documents/upload', formData, {
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (typeof progressEvent.total === 'number' && progressEvent.total > 0) {
            setFileStates(prev => ({
              ...prev,
              [type]: {
                ...prev[type],
                uploadProgress: Math.round((progressEvent.loaded * 100) / progressEvent.total!),
              },
            }));
          } else {
            setFileStates(prev => ({
              ...prev,
              [type]: {
                ...prev[type],
                uploadProgress: 0,
              },
            }));
          }
        },
      });
      setFileStates(prev => ({
        ...prev,
        [type]: { ...prev[type], file: null, uploadProgress: 0, loading: false, error: '', success: 'Document uploaded successfully!' },
      }));
      if (fileInputRefs.current[type]) {
        try {
          fileInputRefs.current[type]!.value = '';
        } catch (error) {
          console.warn('Could not reset file input:', error);
        }
      }
      fetchDocuments();
    } catch (err: any) {
      setFileStates(prev => ({
        ...prev,
        [type]: { ...prev[type], loading: false, uploadProgress: 0, error: err.response?.data?.error || 'Upload failed', success: '' },
      }));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.delete(`/documents/${deleteId}`);
      setSuccess('Document deleted successfully!');
      fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    } finally {
      setLoading(false);
      setDeleteId(null);
    }
  };

  const handlePreview = useCallback(async (doc: any) => {
    // For PDF files, open directly in new tab instead of modal
    if (/\.pdf$/i.test(doc.originalName)) {
      window.open(`${getApiBaseUrl()}/documents/preview/${doc._id}`, '_blank');
      return;
    }
    
    // For images, fetch as blob and show in modal
    if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(doc.originalName)) {
      setPreviewDoc(doc);
      setImageError(false);
      setPdfLoadError(false);
      
      // Clean up previous blob URL
      if (imageBlobUrl) {
        URL.revokeObjectURL(imageBlobUrl);
        setImageBlobUrl(null);
      }
      
      // Fetch new image as blob (skip for test placeholder)
      if (doc._id !== 'test') {
        const blobUrl = await fetchImageBlob(doc._id);
        if (blobUrl) {
          setImageBlobUrl(blobUrl);
        } else {
          setImageError(true);
        }
      }
      return;
    }
    
    // For other files, use modal preview
    setPreviewDoc(doc);
    setPdfLoadError(false);
    setImageError(false);
  }, [imageBlobUrl]);

  const handleClosePreview = useCallback(() => {
    setPreviewDoc(null);
    setPdfLoadError(false);
    setImageError(false);
    
    // Clean up blob URL
    if (imageBlobUrl) {
      URL.revokeObjectURL(imageBlobUrl);
      setImageBlobUrl(null);
    }
  }, [imageBlobUrl]);

  if (!user?._id) {
    return <Box sx={{ p: 3 }}>Loading user information...</Box>;
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 1, md: 3 } }}>
      <Typography variant="h4" gutterBottom>Employee Documents</Typography>
      {user?._id && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Current User ID: {user._id}
        </Typography>
      )}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <form
            onSubmit={async e => {
              e.preventDefault();
              // Upload all selected files for all document types
              await Promise.all(
                DOCUMENT_TYPES.map(async type => {
                  const { file } = fileStates[type];
                  if (!file) return;
                  setFileStates(prev => ({
                    ...prev,
                    [type]: { ...prev[type], loading: true, uploadProgress: 0, error: '', success: '' },
                  }));
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('employee', user._id);
                    formData.append('type', type);
        
                    
                    console.log(`Uploading ${type} document:`, file.name, 'for user:', user._id);
                    console.log('FormData contents:', {
                      file: file.name,
                      employee: user._id,
                      type: type
                    });
            const uploadResponse = await api.post('/documents/upload', formData, {
                      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        if (typeof progressEvent.total === 'number' && progressEvent.total > 0) {
                          setFileStates(prev => ({
                            ...prev,
                            [type]: {
                              ...prev[type],
                              uploadProgress: Math.round((progressEvent.loaded * 100) / progressEvent.total!),
                            },
                          }));
                        } else {
                          setFileStates(prev => ({
                            ...prev,
                            [type]: {
                              ...prev[type],
                              uploadProgress: 0,
                            },
                          }));
                        }
                      },
                    });
                    
                    console.log(`Upload successful for ${type}:`, uploadResponse.data);
                    setFileStates(prev => ({
                      ...prev,
                      [type]: { ...prev[type], file: null, uploadProgress: 0, loading: false, error: '', success: 'Document uploaded successfully!' },
                    }));
                    if (fileInputRefs.current[type]) {
                      try {
                        fileInputRefs.current[type]!.value = '';
                      } catch (error) {
                        console.warn('Could not reset file input:', error);
                      }
                    }
                  } catch (err: any) {
                    setFileStates(prev => ({
                      ...prev,
                      [type]: { ...prev[type], loading: false, uploadProgress: 0, error: err.response?.data?.error || 'Upload failed', success: '' },
                    }));
                  }
                })
              );
              fetchDocuments();
            }}
          >
            <Grid container spacing={3}>
              {DOCUMENT_TYPES.map(type => (
                <Grid item xs={12} key={type}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <Typography variant="subtitle1">{type}</Typography>
                    </Grid>
                    <Grid item xs={12} md={9}>
                      <Box
                        onDrop={e => {
                          e.preventDefault();
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFileChange(type, e.dataTransfer.files[0]);
                          }
                        }}
                        onDragOver={e => e.preventDefault()}
                        sx={{
                          border: '2px dashed #90caf9',
                          borderRadius: 2,
                          p: 1,
                          textAlign: 'center',
                          bgcolor: fileStates[type].file ? '#e3f2fd' : 'inherit',
                          cursor: 'pointer',
                        }}
                        onClick={() => fileInputRefs.current[type]?.click()}
                      >
                        <input
                          id={`doc-file-${type}`}
                          type="file"
                          ref={el => (fileInputRefs.current[type] = el)}
                          style={{ display: 'none' }}
                          onChange={e => handleFileChange(type, e.target.files?.[0] || null)}
                          title={type === 'Photos' ? 'Upload photo (JPG, PNG, GIF)' : `Upload ${type} file`}
                          aria-label={type === 'Photos' ? 'Upload photo' : `Upload ${type} file`}
                          accept={type === 'Photos' ? 'image/*' : '.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx'}
                        />
                                                  {type === 'Photos' ? 
                            <CameraAlt sx={{ fontSize: 32, color: '#1976d2' }} /> : 
                            <CloudUpload sx={{ fontSize: 32, color: '#1976d2' }} />
                          }
                                                  <Typography variant="body2">
                            {fileStates[type].file ? fileStates[type].file!.name : 
                             type === 'Photos' ? 'Drag & drop or click to select photo' : 'Drag & drop or click to select file'}
                          </Typography>
                        {fileStates[type].file && <Typography variant="caption">{(fileStates[type].file!.size / 1024 / 1024).toFixed(2)} MB</Typography>}
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={12}>
                      {fileStates[type].uploadProgress > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <LinearProgress variant="determinate" value={fileStates[type].uploadProgress} />
                        </Box>
                      )}
                      {fileStates[type].error && (
                        <Alert severity="error" sx={{ mt: 1 }}>{fileStates[type].error}</Alert>
                      )}
                      {fileStates[type].success && (
                        <Alert severity="success" sx={{ mt: 1 }}>{fileStates[type].success}</Alert>
                      )}
                    </Grid>
                  </Grid>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={DOCUMENT_TYPES.every(type => !fileStates[type].file) || DOCUMENT_TYPES.some(type => fileStates[type].loading)}
                  sx={{ minWidth: 160 }}
                >
                  Upload All
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>{success}</Alert>
      </Snackbar>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Uploaded Documents</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          
          <Button 
            onClick={fetchDocuments} 
            disabled={loading}
            variant="outlined"
            size="small"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </Box>
      </Box>
      <Paper sx={{ mb: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>File</TableCell>
                <TableCell>Uploaded At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} align="center">Loading documents...</TableCell></TableRow>
              ) : error ? (
                <TableRow><TableCell colSpan={4} align="center" style={{color: 'red'}}>Error: {error}</TableCell></TableRow>
              ) : documents.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center">No documents uploaded yet. Upload your first document above!</TableCell></TableRow>
              ) : documents.map((doc: any) => (
                                  <TableRow key={doc._id}>
                    <TableCell>{doc.type}</TableCell>
                    <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getFileIcon(doc.originalName)}
                      <Tooltip title={/\.pdf$/i.test(doc.originalName) ? "Click to open PDF in new tab" : "Click to preview"}>
                        <Button size="small" onClick={() => handlePreview(doc)}>{doc.originalName}</Button>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>{new Date(doc.uploadedAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <IconButton color="error" onClick={() => setDeleteId(doc._id)} disabled={loading}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this document?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} color="primary">Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
      {/* Preview Dialog (for images/PDFs) */}
      <Dialog open={!!previewDoc} onClose={handleClosePreview} maxWidth="md" fullWidth>
        <DialogTitle>
          {previewDoc?.originalName}
          <IconButton onClick={handleClosePreview} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {previewDoc && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(previewDoc.originalName) ? (
            !imageError && (imageBlobUrl || previewDoc._id === 'test') ? (
              <img 
                src={previewDoc._id === 'test' ? 
                  'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Test+Image' : 
                  imageBlobUrl || ''
                } 
                alt={previewDoc.originalName} 
                style={{ maxWidth: '100%', height: 'auto' }} 
                onError={(e) => {
                  console.error('Image preview error for document:', previewDoc._id);
                  console.error('Image blob URL:', imageBlobUrl);
                  console.error('Image error event:', e);
                  setImageError(true);
                }}
              />
            ) : !imageBlobUrl && !imageError && previewDoc._id !== 'test' ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ margin: '20px 0' }}>Loading image...</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <ImageIcon style={{ fontSize: '64px', color: '#666', marginBottom: '16px' }} />
                <h4>Image Preview Error</h4>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  Unable to display this image. The file might be corrupted or in an unsupported format.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <a 
                    href={`${getApiBaseUrl()}/documents/download/${previewDoc._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'inline-block',
                      padding: '10px 20px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}
                  >
                    Download Image
                  </a>
                  <button 
                    onClick={async () => {
                      setImageError(false);
                      if (previewDoc && previewDoc._id !== 'test') {
                        const blobUrl = await fetchImageBlob(previewDoc._id);
                        if (blobUrl) {
                          setImageBlobUrl(blobUrl);
                        } else {
                          setImageError(true);
                        }
                      }
                    }}
                    style={{ 
                      padding: '10px 20px',
                      border: '1px solid #666',
                      backgroundColor: 'transparent',
                      color: '#666',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )
          ) : previewDoc && /\.pdf$/i.test(previewDoc.originalName) ? (
            <div>
              {!pdfLoadError ? (
                <>
                                     <iframe
                     src={`${getApiBaseUrl()}/documents/preview/${previewDoc._id}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                    title={previewDoc.originalName}
                    width="100%"
                    height="600px"
                    style={{ 
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      minHeight: '600px'
                    }}
                    onError={(e) => {
                      console.error('PDF preview error for document:', previewDoc._id, 'URL:', `${getApiBaseUrl()}/documents/preview/${previewDoc._id}`);
                      setPdfLoadError(true);
                    }}
                    onLoad={(e) => {
                      console.log('PDF iframe loaded for document:', previewDoc._id);
                      const iframe = e.target as HTMLIFrameElement;
                      
                      // Set a timeout to check if PDF actually loaded
                      setTimeout(() => {
                        try {
                          // Try to access the iframe to see if it has content
                          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                          if (iframeDoc && iframeDoc.body) {
                            const content = iframeDoc.body.innerText || iframeDoc.body.textContent;
                            if (content && (content.includes('error') || content.includes('not found') || content.includes('failed'))) {
                              console.warn('PDF iframe contains error content');
                              setPdfLoadError(true);
                            } else {
                              console.log('PDF iframe content appears valid');
                            }
                          } else {
                            console.log('PDF iframe content not accessible (normal for PDFs)');
                          }
                        } catch (error) {
                          console.log('Cannot access iframe content (normal for PDFs):', error);
                        }
                      }, 3000); // Wait 3 seconds for PDF to load
                    }}
                  />
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <PictureAsPdf style={{ fontSize: '64px', color: '#666', marginBottom: '16px' }} />
                  <h4>PDF Preview Error</h4>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    Unable to display this PDF in the browser. This could be due to:
                  </p>
                  <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto 20px', color: '#666' }}>
                    <li>Browser security settings</li>
                    <li>PDF format compatibility</li>
                    <li>File corruption</li>
                  </ul>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a 
                      href={`${getApiBaseUrl()}/documents/download/${previewDoc._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        display: 'inline-block',
                        padding: '10px 20px',
                        backgroundColor: '#1976d2',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}
                    >
                      Download PDF
                    </a>
                    <a 
                      href={`${getApiBaseUrl()}/documents/preview/${previewDoc._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        display: 'inline-block',
                        padding: '10px 20px',
                        border: '1px solid #1976d2',
                        color: '#1976d2',
                        textDecoration: 'none',
                        borderRadius: '4px'
                      }}
                    >
                      Open in New Tab
                    </a>
                    <button 
                      onClick={() => setPdfLoadError(false)}
                      style={{ 
                        padding: '10px 20px',
                        border: '1px solid #666',
                        backgroundColor: 'transparent',
                        color: '#666',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#666', marginRight: '16px' }}>
                  Having trouble viewing the PDF?
                </span>
                <a 
                  href={`${getApiBaseUrl()}/documents/download/${previewDoc._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#1976d2', 
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    marginRight: '16px'
                  }}
                >
                  Download PDF
                </a>
                <a 
                  href={`${getApiBaseUrl()}/documents/preview/${previewDoc._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#1976d2', 
                    textDecoration: 'none',
                    fontSize: '0.875rem'
                  }}
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          ) : previewDoc ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', color: '#666', marginBottom: '16px' }}>📄</div>
              <h4>Preview not available</h4>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                This file type cannot be previewed in the browser.
              </p>
              <a 
                href={`${getApiBaseUrl()}/documents/download/${previewDoc._id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  display: 'inline-block',
                  padding: '8px 16px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}
              >
                Download File
              </a>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DocumentsPage; 