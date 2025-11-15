# Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Kubernetes cluster (for production)
- kubectl configured
- AWS account with Bedrock access (optional)
- Domain name and SSL certificate (for production)

## Local Development with Docker Compose

### 1. Clone and Setup

```bash
git clone <repository-url>
cd competitivelandscape
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file:

```bash
# Required
JWT_SECRET=your_secure_random_string_here

# Optional (for AI features)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Encryption
ENCRYPTION_KEY=your_32_character_key_here
```

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Access Application

- Frontend: http://localhost
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/v1/health

### 5. Stop Services

```bash
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

## Production Deployment on Kubernetes

### 1. Prepare Kubernetes Cluster

```bash
# Verify cluster access
kubectl cluster-info

# Create namespace
kubectl apply -f k8s/namespace.yaml
```

### 2. Configure Secrets

Edit `k8s/secrets.yaml` with production values:

```bash
# Or create from command line
kubectl create secret generic capabilities-secrets \
  --from-literal=JWT_SECRET=your_production_secret \
  --from-literal=AWS_ACCESS_KEY_ID=your_key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your_secret \
  --from-literal=ENCRYPTION_KEY=your_32_char_key \
  -n capabilities-platform
```

### 3. Update ConfigMap

Edit `k8s/configmap.yaml`:

```yaml
data:
  CORS_ORIGIN: "https://your-domain.com"
  # Update other values as needed
```

### 4. Build and Push Docker Images

```bash
# Backend
cd backend
docker build -t your-registry/capabilities-backend:latest .
docker push your-registry/capabilities-backend:latest

# Frontend
cd ../frontend
docker build -t your-registry/capabilities-frontend:latest .
docker push your-registry/capabilities-frontend:latest
```

### 5. Update Deployment Manifests

Edit image references in:
- `k8s/backend-deployment.yaml`
- `k8s/frontend-deployment.yaml`

```yaml
spec:
  containers:
    - name: backend
      image: your-registry/capabilities-backend:latest
```

### 6. Deploy to Kubernetes

```bash
# Apply in order
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n capabilities-platform --timeout=120s
kubectl wait --for=condition=ready pod -l app=redis -n capabilities-platform --timeout=120s

# Deploy application
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

### 7. Verify Deployment

```bash
# Check pods
kubectl get pods -n capabilities-platform

# Check services
kubectl get services -n capabilities-platform

# Check ingress
kubectl get ingress -n capabilities-platform

# View logs
kubectl logs -f deployment/backend -n capabilities-platform
```

### 8. Database Migration

```bash
# Run migrations
kubectl exec -it deployment/backend -n capabilities-platform -- npx prisma migrate deploy
```

## SSL/TLS Configuration

### Using cert-manager (Recommended)

1. Install cert-manager:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

2. Create ClusterIssuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

3. Update ingress to use cert-manager (already configured in `k8s/ingress.yaml`)

## Monitoring and Logging

### View Logs

```bash
# All backend logs
kubectl logs -f deployment/backend -n capabilities-platform

# Specific pod
kubectl logs -f pod-name -n capabilities-platform

# Previous pod instance
kubectl logs --previous pod-name -n capabilities-platform
```

### Resource Usage

```bash
# Pod resource usage
kubectl top pods -n capabilities-platform

# Node resource usage
kubectl top nodes
```

### Horizontal Pod Autoscaler Status

```bash
kubectl get hpa -n capabilities-platform
kubectl describe hpa backend-hpa -n capabilities-platform
```

## Scaling

### Manual Scaling

```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n capabilities-platform

# Scale frontend
kubectl scale deployment frontend --replicas=3 -n capabilities-platform
```

### Automatic Scaling

HPA is configured in `k8s/backend-deployment.yaml`:
- Min replicas: 2
- Max replicas: 10
- Target CPU: 70%
- Target Memory: 80%

## Backup and Restore

### Database Backup

```bash
# Create backup
kubectl exec -it deployment/postgres -n capabilities-platform -- \
  pg_dump -U postgres capabilities_db > backup.sql

# Restore from backup
kubectl exec -i deployment/postgres -n capabilities-platform -- \
  psql -U postgres capabilities_db < backup.sql
```

### Automated Backups

Consider using:
- Velero for cluster backups
- PostgreSQL automated backup solutions
- Cloud provider backup services

## Troubleshooting

### Pod Not Starting

```bash
# Describe pod
kubectl describe pod pod-name -n capabilities-platform

# Check events
kubectl get events -n capabilities-platform --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it deployment/backend -n capabilities-platform -- \
  psql postgresql://postgres:postgres@postgres-service:5432/capabilities_db
```

### Application Errors

```bash
# Check application logs
kubectl logs -f deployment/backend -n capabilities-platform

# Execute into pod
kubectl exec -it deployment/backend -n capabilities-platform -- /bin/sh
```

## Health Checks

### Backend Health

```bash
curl http://your-domain.com/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345
}
```

### Database Health

```bash
kubectl exec -it deployment/postgres -n capabilities-platform -- \
  pg_isready -U postgres
```

## Rolling Updates

### Zero-Downtime Deployment

```bash
# Update backend image
kubectl set image deployment/backend \
  backend=your-registry/capabilities-backend:v2.0.0 \
  -n capabilities-platform

# Watch rollout status
kubectl rollout status deployment/backend -n capabilities-platform

# Rollback if needed
kubectl rollout undo deployment/backend -n capabilities-platform
```

## Performance Tuning

### Database Optimization

```yaml
# Increase connection pool size
DATABASE_URL: "postgresql://postgres:postgres@postgres-service:5432/capabilities_db?schema=public&connection_limit=50"
```

### Redis Configuration

```bash
# Increase max memory
kubectl edit deployment redis -n capabilities-platform
# Add: --maxmemory 512mb --maxmemory-policy allkeys-lru
```

## Security Hardening

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: capabilities-platform
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
```

### Pod Security

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  allowPrivilegeEscalation: false
  capabilities:
    drop:
    - ALL
```

## Cost Optimization

1. **Right-size resources**: Monitor and adjust CPU/memory requests
2. **Use spot instances**: For non-critical workloads
3. **Implement autoscaling**: Scale down during low traffic
4. **Optimize images**: Use multi-stage builds and alpine base images
5. **Cache effectively**: Reduce external API calls

## Maintenance

### Regular Tasks

- Weekly: Review logs for errors
- Monthly: Update dependencies
- Quarterly: Review and update resource allocations
- Annually: Security audit and penetration testing
