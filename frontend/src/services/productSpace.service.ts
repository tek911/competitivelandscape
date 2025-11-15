import { apiClient } from './api';
import {
  ProductSpace,
  PaginatedResponse,
  Capability,
  Vendor,
  CompetitiveIntelligenceMatrix,
  CapabilityUpdateSuggestion,
} from '@/types';

export const productSpaceService = {
  async getAll(page = 1, limit = 20): Promise<PaginatedResponse<ProductSpace>> {
    const response = await apiClient.get<PaginatedResponse<ProductSpace>>('/product-spaces', {
      params: { page, limit },
    });
    return response.data;
  },

  async getById(id: string): Promise<ProductSpace> {
    const response = await apiClient.get<ProductSpace>(`/product-spaces/${id}`);
    return response.data;
  },

  async create(data: {
    name: string;
    description?: string;
    industry?: string;
  }): Promise<ProductSpace> {
    const response = await apiClient.post<ProductSpace>('/product-spaces', data);
    return response.data;
  },

  async update(
    id: string,
    data: { name?: string; description?: string; industry?: string }
  ): Promise<ProductSpace> {
    const response = await apiClient.put<ProductSpace>(`/product-spaces/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/product-spaces/${id}`);
  },

  async getCapabilities(id: string, category?: string): Promise<Capability[]> {
    const response = await apiClient.get<Capability[]>(`/product-spaces/${id}/capabilities`, {
      params: { category },
    });
    return response.data;
  },

  async getVendors(id: string): Promise<Vendor[]> {
    const response = await apiClient.get<Vendor[]>(`/product-spaces/${id}/vendors`);
    return response.data;
  },

  async updateCapabilities(
    id: string
  ): Promise<{ productSpaceId: string; suggestions: CapabilityUpdateSuggestion[] }> {
    const response = await apiClient.post<{
      productSpaceId: string;
      suggestions: CapabilityUpdateSuggestion[];
    }>(`/product-spaces/${id}/update-capabilities`);
    return response.data;
  },

  async getCompetitiveIntelligence(id: string): Promise<CompetitiveIntelligenceMatrix> {
    const response = await apiClient.get<CompetitiveIntelligenceMatrix>(
      `/product-spaces/${id}/competitive-intelligence`
    );
    return response.data;
  },
};
