# Enterprise Capabilities Intelligence Platform

A sophisticated web application for information security consultants to manage product capability matrices, vendor responses, and competitive intelligence analysis, powered by AWS Bedrock Claude AI.

## 🚀 Features

- **Document Ingestion**: Upload Excel/CSV files containing capability matrices
- **AI-Powered Analysis**: Automatic sentiment analysis of vendor responses using AWS Bedrock Claude
- **Competitive Intelligence**: Side-by-side vendor comparison with color-coded sentiment analysis
- **Capability Management**: Organize and categorize product capabilities
- **Vendor Management**: Track vendors with automatic logo fetching
- **RFI Generation**: Generate clean RFI templates for new vendors
- **Export Functionality**: Export matrices to Excel/CSV with formatting
- **AWS Bedrock Integration**: AI-powered capability updates and insights
- **Modern UI**: Built with Mantine UI for a professional, responsive experience

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  React Frontend │────▶│  Express Backend │────▶│   PostgreSQL    │
│  (Mantine UI)   │     │   (TypeScript)   │     │                 │
│                 │     │                  │     └─────────────────┘
└─────────────────┘     └──────────────────┘              │
                                │                          │
                                │                          │
                        ┌───────▼────────┐        ┌───────▼────────┐
                        │                │        │                │
                        │  AWS Bedrock   │        │     Redis      │
                        │  Claude AI     │        │    (Cache)     │
                        │                │        │                │
                        └────────────────┘        └────────────────┘
```

## 📋 Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 16+ (or use Docker)
- Redis 7+ (or use Docker)
- AWS Account with Bedrock access (optional, for AI features)

## 🛠️ Installation

### Option 1: Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd competitivelandscape
```

2. Create environment file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api/v1/health

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database and AWS credentials

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📚 Configuration

### AWS Bedrock Setup

1. Create an AWS account and enable Bedrock access
2. Create IAM credentials with Bedrock permissions
3. Configure in Settings page or environment variables:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

### Database Configuration

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/capabilities_db?schema=public
```

### Optional: Logo APIs

```bash
CLEARBIT_API_KEY=your_clearbit_key
GOOGLE_CUSTOM_SEARCH_API_KEY=your_google_key
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_search_engine_id
```

## 🎯 Usage

### 1. Upload a Capability Matrix

1. Click "Upload Document" on the dashboard
2. Select an Excel or CSV file with the following format:

```
| Category | Capability | Description | Vendor A | Vendor B | Vendor C |
|----------|------------|-------------|----------|----------|----------|
| Security | SSO        | Single Sign-On | Yes | Yes | No |
| Security | MFA        | Multi-factor Auth | Yes | Limited | Yes |
```

3. The system will automatically:
   - Parse capabilities and vendors
   - Create a product space
   - Run AI sentiment analysis (if configured)
   - Fetch vendor logos

### 2. View Competitive Intelligence

1. Navigate to a product space
2. Click "View Competitive Intelligence"
3. See color-coded sentiment analysis:
   - 🟢 Green: Positive response
   - 🔵 Blue: Neutral response
   - 🔴 Red: Negative/Misleading response
   - 🟡 Yellow: Vague response
   - ⚫ Gray: Missing response

### 3. Generate RFI

1. Open a product space
2. Click "Export" → "Generate RFI Template"
3. Select desired capabilities
4. Download clean Excel template for vendors

### 4. AI-Powered Updates

1. Navigate to a product space
2. Click "Update Materials (AI)"
3. Review AI-suggested capability updates
4. Apply improvements to keep capabilities current

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
npm run test:coverage
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 🚢 Deployment

### Kubernetes Deployment

1. Update configuration:
```bash
cd k8s
# Edit configmap.yaml and secrets.yaml with your values
```

2. Apply manifests:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

3. Verify deployment:
```bash
kubectl get pods -n capabilities-platform
kubectl get services -n capabilities-platform
```

## 🔒 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Input sanitization and validation
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Encrypted storage for sensitive credentials
- ✅ Helmet.js security headers

## 📊 API Documentation

### Authentication

```bash
# Register
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword"
}

# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Product Spaces

```bash
# Get all product spaces
GET /api/v1/product-spaces

# Get specific product space
GET /api/v1/product-spaces/:id

# Create product space
POST /api/v1/product-spaces
{
  "name": "Cloud Security Platform",
  "description": "Security capabilities analysis",
  "industry": "Cybersecurity"
}

# Get competitive intelligence
GET /api/v1/product-spaces/:id/competitive-intelligence
```

### Documents

```bash
# Upload document
POST /api/v1/documents/upload
Content-Type: multipart/form-data
{
  "file": <excel/csv file>,
  "productSpaceId": "optional-id",
  "autoAnalyze": true
}
```

### Export

```bash
# Export matrix
POST /api/v1/export/:productSpaceId/matrix
{
  "format": "excel",
  "includeMetadata": true,
  "includeSentiment": true
}

# Export RFI
POST /api/v1/export/:productSpaceId/rfi
{
  "selectedCapabilities": ["cap-id-1", "cap-id-2"]
}
```

## 🛣️ Roadmap

- [ ] SSO integration (Okta, Azure AD)
- [ ] Advanced analytics dashboard
- [ ] Collaboration features (comments, sharing)
- [ ] Version control for capability matrices
- [ ] Custom AI prompts for analysis
- [ ] Batch import from multiple sources
- [ ] Mobile application
- [ ] Integration with JIRA/ServiceNow

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 👥 Authors

- Enterprise Capabilities Platform Team

## 🙏 Acknowledgments

- Built with React, Express, Prisma, and Mantine UI
- Powered by AWS Bedrock Claude AI
- Icons by Tabler Icons
