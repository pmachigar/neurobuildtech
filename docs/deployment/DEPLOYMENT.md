# NeuroBuildTech Deployment Guide

## Overview
This guide covers deployment of the NeuroBuildTech platform in different environments: development, staging, and production.

## Prerequisites

### System Requirements
- **Docker**: 20.10+ and Docker Compose 2.0+
- **Node.js**: 18+ (for local development)
- **PostgreSQL**: 15+ (if not using Docker)
- **Redis**: 7+ (if not using Docker)

### Cloud Requirements (Production)
- **Kubernetes**: 1.25+
- **Cloud Provider**: AWS, GCP, or Azure
- **Load Balancer**: NGINX or cloud-native
- **Domain**: SSL certificate for HTTPS

## Environment Setup

### 1. Development Environment

#### Quick Start with Docker Compose
```bash
# Clone repository
git clone https://github.com/pmachigar/neurobuildtech.git
cd neurobuildtech

# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up -d

# Verify services
docker-compose ps
```

#### Service URLs (Development)
```
API Gateway:     http://localhost:3000
Shell App:       http://localhost:3100
Landing MFE:     http://localhost:3001
Services MFE:    http://localhost:3002
GraphQL:         http://localhost:3010/graphql
PostgreSQL:      localhost:5432
Redis:           localhost:6379
n8n:             http://localhost:5678
Prometheus:      http://localhost:9090
Grafana:         http://localhost:3030
```

#### Manual Development Setup
```bash
# Install root dependencies
npm install

# Setup backend services
cd backend/users-service
npm install
npm run start:dev

# Setup frontend micro frontends
cd frontend/mfe-landing
npm install
npm run dev

# Run tests
npm run test:all
```

### 2. Staging Environment

#### Docker Compose for Staging
```bash
# Use staging configuration
docker-compose -f docker-compose.staging.yml up -d

# Monitor logs
docker-compose logs -f
```

#### Environment Variables (Staging)
```bash
NODE_ENV=staging
DB_HOST=staging-postgres.example.com
REDIS_URL=redis://staging-redis.example.com:6379
NEXT_PUBLIC_API_URL=https://api-staging.neurobuildtech.com
```

### 3. Production Environment

#### Kubernetes Deployment

**Create namespace:**
```bash
kubectl create namespace neurobuildtech
```

**Deploy PostgreSQL:**
```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: neurobuildtech
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: neurobuildtech
        - name: POSTGRES_USER
          value: neurobuild
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

**Deploy Backend Services:**
```yaml
# k8s/users-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: users-service
  namespace: neurobuildtech
spec:
  replicas: 3
  selector:
    matchLabels:
      app: users-service
  template:
    metadata:
      labels:
        app: users-service
    spec:
      containers:
      - name: users-service
        image: ghcr.io/pmachigar/neurobuildtech/users-service:latest
        ports:
        - containerPort: 3010
        env:
        - name: DB_HOST
          value: postgres
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        livenessProbe:
          httpGet:
            path: /health
            port: 3010
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3010
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: users-service
  namespace: neurobuildtech
spec:
  selector:
    app: users-service
  ports:
  - port: 3010
    targetPort: 3010
```

**Deploy Frontend Applications:**
```yaml
# k8s/shell-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shell-app
  namespace: neurobuildtech
spec:
  replicas: 2
  selector:
    matchLabels:
      app: shell-app
  template:
    metadata:
      labels:
        app: shell-app
    spec:
      containers:
      - name: shell-app
        image: ghcr.io/pmachigar/neurobuildtech/shell-app:latest
        ports:
        - containerPort: 3100
        env:
        - name: NEXT_PUBLIC_API_URL
          value: https://api.neurobuildtech.com
---
apiVersion: v1
kind: Service
metadata:
  name: shell-app
  namespace: neurobuildtech
spec:
  selector:
    app: shell-app
  ports:
  - port: 80
    targetPort: 3100
```

**Deploy Ingress:**
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: neurobuildtech-ingress
  namespace: neurobuildtech
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - neurobuildtech.com
    - api.neurobuildtech.com
    secretName: neurobuildtech-tls
  rules:
  - host: neurobuildtech.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: shell-app
            port:
              number: 80
  - host: api.neurobuildtech.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 3000
```

## CI/CD Pipeline

### GitHub Actions Workflow
The platform uses automated CI/CD with GitHub Actions:

1. **Trigger**: Push to main branch or pull request
2. **Test**: Run unit tests for all services
3. **Build**: Create Docker images
4. **Security**: Vulnerability scanning
5. **Deploy**: Deploy to staging/production

### Manual Deployment Commands
```bash
# Deploy all services
kubectl apply -f k8s/

# Update a specific service
kubectl set image deployment/users-service users-service=ghcr.io/pmachigar/neurobuildtech/users-service:v1.2.0

# Scale services
kubectl scale deployment users-service --replicas=5

# Check deployment status
kubectl rollout status deployment/users-service
```

## Database Management

### Initial Setup
```sql
-- Create database
CREATE DATABASE neurobuildtech;

-- Create user
CREATE USER neurobuild WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE neurobuildtech TO neurobuild;
```

### Migrations
```bash
# Run migrations for each service
cd backend/users-service
npm run migration:run

# Create new migration
npm run migration:create -- -n AddUserPhone
```

### Backup Strategy
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U neurobuild neurobuildtech > backup_${DATE}.sql

# Upload to cloud storage
aws s3 cp backup_${DATE}.sql s3://neurobuildtech-backups/
```

## Monitoring & Logging

### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'neurobuildtech-services'
    static_configs:
      - targets: 
        - 'users-service:3010'
        - 'services-service:3011'
        - 'api-gateway:3000'
```

### Grafana Dashboards
- **Application Metrics**: Response time, error rates
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Business Metrics**: User registrations, service requests

### Log Management
```bash
# Centralized logging with ELK Stack
kubectl apply -f monitoring/elasticsearch.yaml
kubectl apply -f monitoring/logstash.yaml
kubectl apply -f monitoring/kibana.yaml
```

## Security Configuration

### SSL/TLS Setup
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Create cluster issuer
kubectl apply -f k8s/cluster-issuer.yaml
```

### Network Policies
```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: neurobuildtech
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

### Secrets Management
```bash
# Create secrets
kubectl create secret generic postgres-secret \
  --from-literal=password=secure_password \
  --namespace=neurobuildtech

kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=openai-key=your-openai-key \
  --namespace=neurobuildtech
```

## Performance Optimization

### Database Optimization
- **Connection Pooling**: Configure appropriate pool sizes
- **Indexing**: Create indexes for frequently queried fields
- **Read Replicas**: Use read replicas for scaling reads

### Application Optimization
- **Caching**: Redis for session and data caching
- **CDN**: Use CDN for static assets and micro frontends
- **Load Balancing**: Distribute traffic across multiple instances

### Scaling Configuration
```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: users-service-hpa
  namespace: neurobuildtech
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: users-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check logs
kubectl logs -f deployment/users-service

# Check resource usage
kubectl top pods

# Describe pod for events
kubectl describe pod <pod-name>
```

#### Database Connection Issues
```bash
# Test connectivity
kubectl exec -it <pod-name> -- psql -h postgres -U neurobuild -d neurobuildtech

# Check service endpoints
kubectl get endpoints
```

#### Performance Issues
```bash
# Check resource limits
kubectl describe pod <pod-name>

# Monitor metrics
kubectl proxy &
curl http://localhost:8001/api/v1/nodes/metrics
```

### Health Checks
```bash
# API Gateway health
curl https://api.neurobuildtech.com/health

# Individual service health
curl https://api.neurobuildtech.com/health/users-service
```

## Disaster Recovery

### Backup Procedures
1. **Database**: Daily automated backups to cloud storage
2. **Configuration**: Version-controlled Kubernetes manifests
3. **Secrets**: Encrypted backup of all secrets

### Recovery Procedures
1. **Database Restore**: Restore from latest backup
2. **Application Redeploy**: Deploy from last known good version
3. **DNS Failover**: Switch to backup region if needed

### Testing
- Monthly disaster recovery drills
- Automated backup validation
- RTO/RPO monitoring and reporting

## Maintenance

### Regular Tasks
- **Security Updates**: Monthly OS and dependency updates
- **Performance Review**: Quarterly performance analysis
- **Capacity Planning**: Monthly resource usage review
- **Backup Verification**: Weekly backup integrity checks

### Upgrade Procedures
1. **Testing**: Validate in staging environment
2. **Blue-Green Deployment**: Zero-downtime deployment
3. **Rollback Plan**: Prepared rollback procedure
4. **Communication**: Notify stakeholders of maintenance windows