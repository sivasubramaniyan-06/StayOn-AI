import { apiClient } from './api';
import { Document, DocumentUploadResponse } from '../types';
import { mockDocuments } from '../mock/data';

const ENABLE_MOCK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK === 'true';

export const documentsService = {
  /**
   * 1. Register document & fetch backend S3 pre-signed upload URL
   * POST /documents
   */
  async createDocument(fileName: string, fileType: string = 'application/pdf'): Promise<DocumentUploadResponse> {
    try {
      const response = await apiClient.post<DocumentUploadResponse>('/documents', {
        fileName,
        fileType
      });
      return response.data;
    } catch (error) {
      if (ENABLE_MOCK) {
        console.warn('POST /documents failed, utilizing mock S3 pre-signed upload response for dev testing.');
        const newId = `doc-${Date.now()}`;
        return {
          id: newId,
          fileName,
          uploadUrl: `https://stayon-documents-mock.s3.amazonaws.com/uploads/${newId}.pdf`,
          status: 'pending_upload',
          createdAt: new Date().toISOString()
        };
      }
      throw error;
    }
  },

  /**
   * 2. Upload file directly to backend-provided S3 pre-signed URL
   * PUT to pre-signed S3 URL
   */
  async uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
    try {
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/pdf',
        },
        body: file,
      });
    } catch (error) {
      if (ENABLE_MOCK) {
        console.warn('S3 PUT upload simulated successfully in mock dev environment.');
        return;
      }
      throw error;
    }
  },

  /**
   * 3. Fetch list of uploaded documents & extracted summaries
   * GET /documents
   */
  async getDocuments(): Promise<Document[]> {
    try {
      const response = await apiClient.get<{ documents: Document[] }>('/documents');
      return response.data.documents;
    } catch (error) {
      if (ENABLE_MOCK) {
        return mockDocuments;
      }
      throw error;
    }
  }
};
