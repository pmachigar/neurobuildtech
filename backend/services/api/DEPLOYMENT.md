# Deployment Guide

## 🐳 Docker Deployment

### Build the Docker Image

```bash
cd backend/services/api
docker build -t neurobuildtech-api:latest .
```

### Run with Docker

```bash
docker run -d \
  --name neurobuildtech-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-super-secret-key \
  -e CORS_ORIGIN=https://yourdomain.com \
  neurobuildtech-api:latest
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build: ./backend/services/api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

Run with:
```bash
docker-compose up -d
```

## ☁️ Cloud Deployment

### AWS ECS / Fargate

1. Push image to ECR:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URL
docker tag neurobuildtech-api:latest YOUR_ECR_URL/neurobuildtech-api:latest
docker push YOUR_ECR_URL/neurobuildtech-api:latest
```

2. Create ECS Task Definition with environment variables
3. Deploy to ECS/Fargate cluster

### Google Cloud Run

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT/neurobuildtech-api

# Deploy to Cloud Run
gcloud run deploy neurobuildtech-api \
  --image gcr.io/YOUR_PROJECT/neurobuildtech-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,JWT_SECRET=your-secret
```

### Azure Container Instances

```bash
az container create \
  --resource-group myResourceGroup \
  --name neurobuildtech-api \
  --image YOUR_REGISTRY/neurobuildtech-api:latest \
  --dns-name-label neurobuildtech-api \
  --ports 3000 \
  --environment-variables NODE_ENV=production JWT_SECRET=your-secret
```

### Kubernetes

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neurobuildtech-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: neurobuildtech-api
  template:
    metadata:
      labels:
        app: neurobuildtech-api
    spec:
      containers:
      - name: api
        image: neurobuildtech-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: jwt-secret
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: neurobuildtech-api
spec:
  selector:
    app: neurobuildtech-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f k8s-deployment.yaml
```

## 🔒 Production Checklist

### Environment Variables
- [ ] Set strong `JWT_SECRET` (min 32 characters)
- [ ] Configure `CORS_ORIGIN` to your domain
- [ ] Set `NODE_ENV=production`
- [ ] Configure `REDIS_URL` for distributed rate limiting
- [ ] Set appropriate rate limiting values

### Security
- [ ] Enable HTTPS/TLS
- [ ] Set up firewall rules
- [ ] Configure security groups/network policies
- [ ] Enable DDoS protection
- [ ] Set up WAF (Web Application Firewall)
- [ ] Regular security updates

### Monitoring
- [ ] Set up health check monitoring
- [ ] Configure log aggregation (e.g., ELK, CloudWatch)
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure performance monitoring (e.g., New Relic, Datadog)
- [ ] Set up alerts for critical issues

### Database
- [ ] Replace in-memory storage with persistent database
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Set up read replicas if needed

### High Availability
- [ ] Deploy multiple instances
- [ ] Set up load balancer
- [ ] Configure auto-scaling
- [ ] Set up Redis cluster for distributed caching
- [ ] Configure health checks

### CI/CD
- [ ] Set up automated testing
- [ ] Configure deployment pipeline
- [ ] Implement blue-green or canary deployments
- [ ] Set up automatic rollbacks

## 📈 Scaling Recommendations

### Horizontal Scaling
- Deploy multiple API instances behind a load balancer
- Use Redis for shared rate limiting across instances
- Use session storage in Redis for JWT token management

### Vertical Scaling
- Monitor memory and CPU usage
- Adjust container resources based on load
- Consider separating heavy operations to worker processes

### Database Optimization
- Add read replicas for read-heavy workloads
- Implement caching layer (Redis)
- Add database indexes for frequently queried fields
- Consider database sharding for large datasets

## 🔍 Monitoring Endpoints

- Health: `GET /api/v1/health`
- Metrics: `GET /api/v1/metrics` (requires auth)
- Status: `GET /api/v1/status` (requires admin auth)

Set up monitoring to check these endpoints regularly.

## 🆘 Troubleshooting

### Container won't start
- Check environment variables are set correctly
- Verify port 3000 is available
- Check Docker logs: `docker logs neurobuildtech-api`

### API returns 503 Service Unavailable
- Check if Redis is accessible (if configured)
- Verify database connection (when using persistent storage)
- Check resource limits (memory/CPU)

### High response times
- Check Redis connection
- Monitor database query performance
- Review rate limiting configuration
- Check for memory leaks

### Authentication failures
- Verify JWT_SECRET matches across instances
- Check token expiration times
- Verify API keys in database

## 📞 Support

For deployment issues, check the logs and health endpoints first. Review the README.md for API documentation.
