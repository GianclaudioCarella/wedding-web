/**
 * DocumentUpload Component
 * 
 * Provides UI for uploading and managing documents in the knowledge base.
 * Features:
 * - Drag-and-drop file upload
 * - Document list with status indicators
 * - Delete functionality
 * - Progress feedback during processing
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
}

interface DocumentUploadProps {
  githubToken: string;
  userId: string;
  onDocumentsChange?: () => void; // Callback when documents are added/removed
}

export default function DocumentUpload({ githubToken, userId, onDocumentsChange }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  /**
   * Fetches all documents from the database
   */
  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  /**
   * Handles file upload and processing
   */
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isValidType = fileName.endsWith('.txt') || fileName.endsWith('.pdf');
    
    if (!isValidType) {
      alert('Currently only .txt and .pdf files are supported');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Uploading file...');

    try {
      // Import services dynamically
      const { EmbeddingService } = await import('@/lib/services/embedding.service');
      const { DocumentService } = await import('@/lib/services/document.service');

      // Initialize services
      const embeddingService = new EmbeddingService(githubToken);
      const documentService = new DocumentService(supabase, embeddingService);

      // Process the document
      setUploadProgress('Processing document...');
      await documentService.processDocument(file, userId);

      setUploadProgress('Document processed successfully!');
      
      // Reload documents list
      await loadDocuments();
      
      // Notify parent component
      if (onDocumentsChange) {
        onDocumentsChange();
      }

      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress('');
      }, 2000);
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadProgress('Error: ' + (error as Error).message);
      
      setTimeout(() => {
        setUploadProgress('');
      }, 5000);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handles file selection via input element
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  /**
   * Handles drag and drop events
   */
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  /**
   * Deletes a document from the database
   */
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const { DocumentService } = await import('@/lib/services/document.service');
      const { EmbeddingService } = await import('@/lib/services/embedding.service');
      
      const embeddingService = new EmbeddingService(githubToken);
      const documentService = new DocumentService(supabase, embeddingService);

      await documentService.deleteDocument(documentId);
      await loadDocuments();
      
      if (onDocumentsChange) {
        onDocumentsChange();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  /**
   * Formats file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  /**
   * Formats date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        
        <p className="mt-2 text-sm text-gray-600">
          {isUploading ? uploadProgress : 'Drag and drop a file here, or click to select'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Supported formats: .txt, .pdf
        </p>
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Uploaded Documents</h3>
          <div className="space-y-1">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(doc.file_size)} • {formatDate(doc.uploaded_at)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {/* Status Indicator */}
                  {doc.status === 'processing' && (
                    <span className="flex items-center text-xs text-blue-600">
                      <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing
                    </span>
                  )}
                  {doc.status === 'completed' && (
                    <span className="text-xs text-green-600">✓ Ready</span>
                  )}
                  {doc.status === 'failed' && (
                    <span className="text-xs text-red-600" title={doc.error_message}>
                      ✗ Failed
                    </span>
                  )}
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete document"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
