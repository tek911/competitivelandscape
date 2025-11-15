import { apiClient } from './api';
import { BedrockConfig } from '@/types';

export const settingsService = {
  async getBedrockConfig(): Promise<BedrockConfig> {
    const response = await apiClient.get<BedrockConfig>('/settings/bedrock');
    return response.data;
  },

  async updateBedrockConfig(config: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    modelId?: string;
  }): Promise<any> {
    const response = await apiClient.post('/settings/bedrock', config);
    return response.data;
  },

  async testBedrockConnection(): Promise<{ success: boolean; message: string; testResult?: any }> {
    const response = await apiClient.post('/settings/bedrock/test');
    return response.data;
  },
};
