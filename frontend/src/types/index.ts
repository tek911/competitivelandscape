export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  preferences?: any;
  createdAt: string;
}

export interface ProductSpace {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  vendorCount?: number;
  _count?: {
    capabilities: number;
    documents: number;
  };
}

export interface Capability {
  id: string;
  productSpaceId: string;
  category: string;
  name: string;
  description?: string;
  importanceLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  productSpace?: {
    id: string;
    name: string;
  };
  _count?: {
    vendorResponses: number;
  };
}

export interface Vendor {
  id: string;
  name: string;
  logoUrl?: string;
  website?: string;
  description?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  _count?: {
    responses: number;
  };
}

export interface VendorResponse {
  id: string;
  vendorId: string;
  capabilityId: string;
  documentId?: string;
  responseText: string;
  sentimentScore?: number;
  sentimentLabel?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'MISLEADING' | 'MISSING' | 'VAGUE';
  sentimentAnalysis?: string;
  confidence?: number;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  vendor?: Vendor;
  capability?: Capability;
}

export interface Document {
  id: string;
  productSpaceId?: string;
  userId?: string;
  type: 'RFI' | 'COMPARISON' | 'CAPABILITY_MATRIX' | 'VENDOR_RESPONSE' | 'OTHER';
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadPath?: string;
  metadata?: any;
  uploadDate: string;
  createdAt: string;
  updatedAt: string;
  productSpace?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CompetitiveIntelligenceMatrix {
  productSpace: {
    id: string;
    name: string;
    description?: string;
  };
  vendors: Array<{
    id: string;
    name: string;
    logoUrl?: string;
    website?: string;
  }>;
  matrix: Array<{
    capabilityId: string;
    category: string;
    name: string;
    description?: string;
    importanceLevel: string;
    responses: Record<
      string,
      {
        responseText: string;
        sentimentScore?: number;
        sentimentLabel?: string;
        sentimentAnalysis?: string;
      } | null
    >;
  }>;
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

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface BedrockConfig {
  region: string;
  modelId: string;
  configured: boolean;
}

export interface CapabilityUpdateSuggestion {
  capabilityId: string;
  suggestedName?: string;
  suggestedDescription?: string;
  reasoning: string;
  confidence: number;
}
