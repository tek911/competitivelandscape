# Architecture Documentation

## System Architecture

### Overview

The Enterprise Capabilities Intelligence Platform follows a modern three-tier architecture with microservices principles, containerization, and cloud-native design patterns.

```mermaid
graph TB
    subgraph "Client Layer"
        A[React SPA]
    end

    subgraph "API Layer"
        B[Express API]
        C[Auth Middleware]
        D[Rate Limiter]
    end

    subgraph "Service Layer"
        E[Bedrock Service]
        F[Document Parser]
        G[Export Service]
        H[Logo Service]
    end

    subgraph "Data Layer"
        I[PostgreSQL]
        J[Redis Cache]
        K[File Storage]
    end

    subgraph "External Services"
        L[AWS Bedrock]
        M[Clearbit API]
        N[Google Custom Search]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    D --> F
    D --> G
    D --> H
    E --> I
    F --> I
    G --> I
    H --> J
    E --> L
    H --> M
    H --> N
    I -.-> K
```

## Components

### Frontend (React + TypeScript + Mantine UI)

**Technology Stack:**
- React 18 with TypeScript
- Mantine UI v7 for components
- Tanstack Query for data fetching
- Zustand for state management
- React Router for navigation

**Key Features:**
- Server-side state synchronization
- Optimistic UI updates
- Real-time data refresh
- Responsive design
- Dark/light theme support

**Pages:**
1. **Dashboard** - Product space overview with cards
2. **Product Space Detail** - Capability management
3. **Competitive Intelligence** - Comparison matrix
4. **Settings** - AWS Bedrock configuration

### Backend (Node.js + Express + TypeScript)

**Technology Stack:**
- Express.js for HTTP server
- TypeScript for type safety
- Prisma ORM for database access
- Pino for structured logging
- JWT for authentication

**Layered Architecture:**

```
Controllers (HTTP handlers)
    ↓
Services (Business logic)
    ↓
Repositories (Data access via Prisma)
    ↓
Database (PostgreSQL)
```

**Key Services:**

1. **Bedrock Service**
   - AWS SDK integration
   - Sentiment analysis
   - Capability update suggestions
   - Result caching

2. **Document Parser Service**
   - Excel/CSV parsing
   - Intelligent column detection
   - Data normalization
   - Error handling

3. **Export Service**
   - Matrix generation
   - RFI template creation
   - Format conversion (Excel/CSV)

4. **Vendor Logo Service**
   - Multi-source logo fetching
   - Clearbit integration
   - Google Custom Search fallback
   - Placeholder generation
   - Redis caching

### Database Schema

```mermaid
erDiagram
    User ||--o{ Document : uploads
    ProductSpace ||--o{ Capability : contains
    ProductSpace ||--o{ Document : has
    Capability ||--o{ VendorResponse : receives
    Vendor ||--o{ VendorResponse : provides

    User {
        uuid id PK
        string email UK
        string name
        string passwordHash
        enum role
        json preferences
    }

    ProductSpace {
        uuid id PK
        string name
        string description
        string industry
        json metadata
    }

    Capability {
        uuid id PK
        uuid productSpaceId FK
        string category
        string name
        string description
        enum importanceLevel
    }

    Vendor {
        uuid id PK
        string name UK
        string logoUrl
        string website
    }

    VendorResponse {
        uuid id PK
        uuid vendorId FK
        uuid capabilityId FK
        uuid documentId FK
        string responseText
        float sentimentScore
        enum sentimentLabel
        string sentimentAnalysis
    }
```

### Caching Strategy

**Redis Implementation:**

1. **Sentiment Analysis Results**
   - Key: `sentiment:{hash(capability:vendor:response)}`
   - TTL: 24 hours
   - Invalidation: Manual or on re-upload

2. **Vendor Logos**
   - Key: `vendor-logo:{hash(vendorName)}`
   - TTL: 30 days
   - Invalidation: Manual refresh

3. **Capability Update Suggestions**
   - Key: `capability-updates:{hash(productSpaceId)}`
   - TTL: 1 hour
   - Invalidation: On capability change

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant DB as Database

    C->>API: POST /auth/login {email, password}
    API->>DB: Find user by email
    DB-->>API: User data
    API->>API: Verify password (bcrypt)
    API->>API: Generate JWT token
    API-->>C: {user, token}

    C->>API: GET /api/resource (Authorization: Bearer token)
    API->>API: Verify JWT
    API->>DB: Fetch resource
    DB-->>API: Resource data
    API-->>C: Resource response
```

### Security Layers

1. **Network Layer**
   - HTTPS/TLS encryption
   - CORS configuration
   - Rate limiting

2. **Application Layer**
   - JWT authentication
   - Role-based authorization
   - Input validation (Joi/Zod)
   - SQL injection prevention (Prisma)
   - XSS protection

3. **Data Layer**
   - Encrypted credentials storage
   - Password hashing (bcrypt)
   - Secure session management

## Deployment Architecture

### Kubernetes Architecture

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Ingress"
            I[NGINX Ingress]
        end

        subgraph "Application Pods"
            F1[Frontend Pod 1]
            F2[Frontend Pod 2]
            B1[Backend Pod 1]
            B2[Backend Pod 2]
            B3[Backend Pod 3]
        end

        subgraph "Stateful Services"
            P[(PostgreSQL)]
            R[(Redis)]
        end

        subgraph "Storage"
            PV1[Postgres PVC]
            PV2[Redis PVC]
        end
    end

    Internet --> I
    I --> F1
    I --> F2
    I --> B1
    I --> B2
    I --> B3
    B1 --> P
    B2 --> P
    B3 --> P
    B1 --> R
    B2 --> R
    B3 --> R
    P --> PV1
    R --> PV2
```

### Scaling Strategy

**Horizontal Pod Autoscaling:**
- Backend: 2-10 pods based on CPU/Memory
- Frontend: 2-5 pods based on traffic
- Database: Single instance with replication (future)

**Resource Allocation:**
```yaml
Backend:
  Requests: 512Mi memory, 500m CPU
  Limits: 1Gi memory, 1000m CPU

Frontend:
  Requests: 128Mi memory, 100m CPU
  Limits: 256Mi memory, 200m CPU
```

## Performance Optimization

### Frontend Optimizations

1. **Code Splitting**
   - Route-based splitting
   - Vendor bundle separation
   - Lazy loading

2. **Caching**
   - React Query caching
   - Browser cache headers
   - Service Worker (future)

3. **Bundle Optimization**
   - Tree shaking
   - Minification
   - Gzip compression

### Backend Optimizations

1. **Database**
   - Indexed queries
   - Connection pooling
   - Query optimization

2. **Caching**
   - Redis for expensive operations
   - In-memory caching
   - CDN for static assets

3. **API**
   - Response compression
   - Pagination
   - Selective field loading

## Monitoring & Observability

### Logging

**Structured Logging with Pino:**
```typescript
{
  level: 'info',
  timestamp: '2024-01-01T00:00:00.000Z',
  msg: 'Request completed',
  req: { method: 'GET', url: '/api/v1/product-spaces' },
  res: { statusCode: 200 },
  responseTime: 45
}
```

### Health Checks

- `/api/v1/health` - Application health
- Database connectivity check
- Redis connectivity check
- Liveness probe: Every 30s
- Readiness probe: Every 10s

## Disaster Recovery

### Backup Strategy

1. **Database Backups**
   - Daily automated backups
   - 30-day retention
   - Point-in-time recovery

2. **Configuration Backups**
   - Version-controlled (Git)
   - Secret management (Kubernetes Secrets)

3. **Recovery Procedures**
   - Database restore: < 1 hour RPO
   - Full system restore: < 4 hours RTO

## Future Enhancements

1. **Microservices Migration**
   - Split backend into domain services
   - API Gateway pattern
   - Service mesh (Istio)

2. **Advanced Analytics**
   - Time-series data
   - Historical trending
   - Predictive analytics

3. **Real-time Features**
   - WebSocket integration
   - Live collaboration
   - Real-time notifications
