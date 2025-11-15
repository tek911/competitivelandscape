import { Request } from 'express';
import { User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BedrockConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  modelId: string;
}

export interface SentimentAnalysisResult {
  score: number;
  label: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MISLEADING' | 'VAGUE' | 'MISSING';
  explanation: string;
  confidence: number;
}

export interface CapabilityUpdateSuggestion {
  capabilityId: string;
  suggestedName?: string;
  suggestedDescription?: string;
  reasoning: string;
  confidence: number;
}

export interface DocumentParseResult {
  productSpace: {
    name: string;
    description?: string;
    industry?: string;
  };
  capabilities: Array<{
    category: string;
    name: string;
    description?: string;
    importanceLevel?: string;
  }>;
  vendors: Array<{
    name: string;
    website?: string;
  }>;
  responses: Array<{
    vendorName: string;
    capabilityName: string;
    responseText: string;
  }>;
}

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv';
  includeMetadata?: boolean;
  includeSentiment?: boolean;
  selectedCapabilities?: string[];
  selectedVendors?: string[];
}

export interface VendorLogoResult {
  url: string;
  source: 'clearbit' | 'google' | 'manual' | 'placeholder';
  cached: boolean;
}
