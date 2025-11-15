import { apiClient } from './api';
import { Document } from '@/types';

export const documentService = {
  async upload(
    file: File,
    productSpaceId?: string,
    autoAnalyze = true
  ): Promise<{
    document: Document;
    productSpace: any;
    stats: {
      capabilities: number;
      vendors: number;
      responses: number;
      analyzed: number;
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (productSpaceId) {
      formData.append('productSpaceId', productSpaceId);
    }
    formData.append('autoAnalyze', String(autoAnalyze));

    const response = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getAll(productSpaceId?: string, type?: string): Promise<Document[]> {
    const response = await apiClient.get<Document[]>('/documents', {
      params: { productSpaceId, type },
    });
    return response.data;
  },

  async getById(id: string): Promise<Document> {
    const response = await apiClient.get<Document>(`/documents/${id}`);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },
};
