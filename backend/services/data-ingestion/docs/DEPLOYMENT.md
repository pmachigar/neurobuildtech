# Deployment Guide

Production deployment guide for the Data Ingestion Service.

## Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] TLS/SSL certificates obtained
- [ ] Database schema created
- [ ] Monitoring configured
- [ ] Backup strategy defined
- [ ] Disaster recovery plan documented
- [ ] Security audit completed
- [ ] Load testing performed

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file:

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# MQTT
MQTT_BROKER_URL=mqtts://mqtt.neurobuild.com:8883
MQTT_CLIENT_ID=data-ingestion-prod
MQTT_USERNAME=prod_user
MQTT_PASSWORD=secure_password

# Redis
REDIS_HOST=redis.neurobuild.com
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password
REDIS_DB=0

# WebSocket
WS_PORT=3001

# Queue
QUEUE_NAME=sensor-data-prod
DLQ_NAME=sensor-data-dlq-prod
MAX_RETRY_ATTEMPTS=5
RETRY_DELAY_MS=2000

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=10
CIRCUIT_BREAKER_TIMEOUT_MS=120000

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json

# Metrics
METRICS_PORT=9090
METRICS_PATH=/metrics
```

## Docker Deployment

### Build Production Image

```bash
# Build the image
docker build -t neurobuild/data-ingestion:1.0.0 .

# Tag as latest
docker tag neurobuild/data-ingestion:1.0.0 neurobuild/data-ingestion:latest

# Push to registry
docker push neurobuild/data-ingestion:1.0.0
docker push neurobuild/data-ingestion:latest
```

### Docker Compose Production

```yaml
version: '3.8'

services:
  mosquitto:
    image: eclipse-mosquitto:2
    restart: always
    ports:
      - "1883:1883"
      - "8883:8883"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/certs:/mosquitto/certs
      - mosquitto-data:/mosquitto/data
      - mosquitto-logs:/mosquitto/log
    networks:
      - neurobuild-net

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - neurobuild-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  data-ingestion:
    image: neurobuild/data-ingestion:1.0.0
    restart: always
    ports:
      - "3000:3000"
      - "3001:3001"
      - "127.0.0.1:9090:9090"
    environment:
      - NODE_ENV=production
      - MQTT_BROKER_URL=mqtt://mosquitto:1883
      - REDIS_HOST=redis
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    depends_on:
      redis:
        condition: service_healthy
      mosquitto:
        condition: service_started
    networks:
      - neurobuild-net
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - data-ingestion
    networks:
      - neurobuild-net

networks:
  neurobuild-net:
    driver: bridge

volumes:
  mosquitto-data:
  mosquitto-logs:
  redis-data:
```

### NGINX Configuration

```nginx
# nginx/nginx.conf
upstream data_ingestion_http {
    least_conn;
    server data-ingestion:3000 max_fails=3 fail_timeout=30s;
}

upstream data_ingestion_ws {
    least_conn;
    server data-ingestion:3001 max_fails=3 fail_timeout=30s;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

server {
    listen 80;
    server_name api.neurobuild.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.neurobuild.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/data-ingestion-access.log;
    error_log /var/log/nginx/data-ingestion-error.log;
    
    # HTTP API
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_conn conn_limit 10;
        
        proxy_pass http://data_ingestion_http;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
        
        # Error handling
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    }
    
    # WebSocket
    location /ws/ {
        proxy_pass http://data_ingestion_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # WebSocket timeouts
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
    
    # Health check
    location /health {
        proxy_pass http://data_ingestion_http;
        access_log off;
    }
    
    # Metrics (restricted to internal network)
    location /metrics {
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        deny all;
        
        proxy_pass http://data_ingestion_http;
    }
}
```

## Kubernetes Deployment

### Namespace Creation

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: neurobuild
```

### ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: data-ingestion-config
  namespace: neurobuild
data:
  NODE_ENV: "production"
  MQTT_BROKER_URL: "mqtt://mosquitto:1883"
  REDIS_HOST: "redis"
  LOG_LEVEL: "warn"
  METRICS_PORT: "9090"
```

### Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: data-ingestion-secrets
  namespace: neurobuild
type: Opaque
stringData:
  MQTT_USERNAME: "prod_user"
  MQTT_PASSWORD: "secure_password"
  REDIS_PASSWORD: "secure_redis_password"
```

### Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-ingestion
  namespace: neurobuild
  labels:
    app: data-ingestion
    version: v1.0.0
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: data-ingestion
  template:
    metadata:
      labels:
        app: data-ingestion
        version: v1.0.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: data-ingestion
        image: neurobuild/data-ingestion:1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3000
          name: http
          protocol: TCP
        - containerPort: 3001
          name: websocket
          protocol: TCP
        - containerPort: 9090
          name: metrics
          protocol: TCP
        envFrom:
        - configMapRef:
            name: data-ingestion-config
        - secretRef:
            name: data-ingestion-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
```

### Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: data-ingestion
  namespace: neurobuild
  labels:
    app: data-ingestion
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 3000
    targetPort: 3000
    protocol: TCP
  - name: websocket
    port: 3001
    targetPort: 3001
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: 9090
    protocol: TCP
  selector:
    app: data-ingestion
```

### HorizontalPodAutoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: data-ingestion-hpa
  namespace: neurobuild
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: data-ingestion
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 30
      selectPolicy: Max
```

### Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: data-ingestion-ingress
  namespace: neurobuild
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.neurobuild.com
    secretName: data-ingestion-tls
  rules:
  - host: api.neurobuild.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: data-ingestion
            port:
              number: 3000
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: data-ingestion
            port:
              number: 3001
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Create secrets
kubectl apply -f secrets.yaml

# Create configmap
kubectl apply -f configmap.yaml

# Deploy the application
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f hpa.yaml
kubectl apply -f ingress.yaml

# Verify deployment
kubectl get pods -n neurobuild
kubectl get svc -n neurobuild
kubectl get hpa -n neurobuild

# Check logs
kubectl logs -f deployment/data-ingestion -n neurobuild

# Test the service
kubectl port-forward svc/data-ingestion 3000:3000 -n neurobuild
curl http://localhost:3000/health
```

## Monitoring Setup

### Prometheus ServiceMonitor

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: data-ingestion
  namespace: neurobuild
  labels:
    app: data-ingestion
spec:
  selector:
    matchLabels:
      app: data-ingestion
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

### Grafana Dashboard

Import dashboard JSON:

```json
{
  "dashboard": {
    "title": "Data Ingestion Service",
    "panels": [
      {
        "title": "Ingestion Rate",
        "targets": [
          {
            "expr": "rate(sensor_data_ingested_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(sensor_data_errors_total[5m])"
          }
        ]
      },
      {
        "title": "Processing Latency (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(sensor_data_processing_latency_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

## Backup and Recovery

### Redis Backup

```bash
# Create backup script
#!/bin/bash
BACKUP_DIR="/backups/redis"
DATE=$(date +%Y%m%d_%H%M%S)

# Trigger BGSAVE
docker exec redis redis-cli BGSAVE

# Wait for save to complete
while [ $(docker exec redis redis-cli LASTSAVE) -eq $(docker exec redis redis-cli LASTSAVE) ]; do
    sleep 1
done

# Copy dump file
docker cp redis:/data/dump.rdb ${BACKUP_DIR}/dump_${DATE}.rdb

# Compress
gzip ${BACKUP_DIR}/dump_${DATE}.rdb

# Clean old backups (keep last 7 days)
find ${BACKUP_DIR} -name "dump_*.rdb.gz" -mtime +7 -delete
```

### Restore from Backup

```bash
#!/bin/bash
BACKUP_FILE=$1

# Stop Redis
docker-compose stop redis

# Restore dump file
gunzip -c ${BACKUP_FILE} > /tmp/dump.rdb
docker cp /tmp/dump.rdb redis:/data/dump.rdb

# Start Redis
docker-compose start redis
```

## Load Balancing

### HAProxy Configuration

```
global
    maxconn 4096
    log stdout local0

defaults
    mode http
    log global
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend http_front
    bind *:80
    default_backend http_back

backend http_back
    balance leastconn
    option httpchk GET /health
    server server1 data-ingestion-1:3000 check
    server server2 data-ingestion-2:3000 check
    server server3 data-ingestion-3:3000 check

frontend ws_front
    bind *:3001
    default_backend ws_back

backend ws_back
    balance leastconn
    option httpchk GET /health
    server server1 data-ingestion-1:3001 check
    server server2 data-ingestion-2:3001 check
    server server3 data-ingestion-3:3001 check
```

## Troubleshooting

### Common Issues

**Service won't start**
```bash
# Check logs
docker-compose logs data-ingestion

# Check dependencies
docker-compose ps

# Verify configuration
docker-compose config
```

**High memory usage**
```bash
# Check memory usage
docker stats data-ingestion

# Increase memory limit in docker-compose.yml
services:
  data-ingestion:
    deploy:
      resources:
        limits:
          memory: 1G
```

**Redis connection issues**
```bash
# Test Redis connection
docker exec -it redis redis-cli ping

# Check Redis logs
docker logs redis

# Verify network connectivity
docker network inspect neurobuild-net
```

## Security Hardening

### Network Policies (Kubernetes)

```yaml
# networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: data-ingestion-netpol
  namespace: neurobuild
spec:
  podSelector:
    matchLabels:
      app: data-ingestion
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx-ingress
    ports:
    - protocol: TCP
      port: 3000
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to:
    - podSelector:
        matchLabels:
          app: mosquitto
    ports:
    - protocol: TCP
      port: 1883
```

## Performance Tuning

### Node.js Configuration

```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096"

# Enable cluster mode for multi-core
# Update src/index.ts to use cluster module
```

### Redis Configuration

```
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## Rollback Procedure

```bash
# Kubernetes
kubectl rollout undo deployment/data-ingestion -n neurobuild

# Docker Compose
docker-compose stop data-ingestion
docker-compose pull data-ingestion:previous-version
docker-compose up -d data-ingestion
```

## Support

For deployment support:
- Review deployment logs
- Check system resources
- Verify network connectivity
- Contact DevOps team
- Open an issue on GitHub
