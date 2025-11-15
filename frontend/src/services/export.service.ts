import { apiClient } from './api';

export const exportService = {
  async exportMatrix(
    productSpaceId: string,
    options: {
      format: 'excel' | 'csv';
      includeMetadata?: boolean;
      includeSentiment?: boolean;
      selectedCapabilities?: string[];
      selectedVendors?: string[];
    }
  ): Promise<Blob> {
    const response = await apiClient.post(
      `/export/${productSpaceId}/matrix`,
      options,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  async exportRFI(productSpaceId: string, selectedCapabilities: string[] = []): Promise<Blob> {
    const response = await apiClient.post(
      `/export/${productSpaceId}/rfi`,
      { selectedCapabilities },
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
