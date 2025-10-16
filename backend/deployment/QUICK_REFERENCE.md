# Quick Reference Guide

Essential commands and procedures for managing the Raspberry Pi K3s cluster.

## Table of Contents

- [Cluster Management](#cluster-management)
- [Service Management](#service-management)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Backup and Recovery](#backup-and-recovery)
- [Scaling](#scaling)

## Cluster Management

### Check Cluster Status

```bash
# Node status
kubectl get nodes
kubectl get nodes -o wide

# All resources across namespaces
kubectl get all -A

# Cluster information
kubectl cluster-info
```

### Access Cluster from Remote Machine

```bash
# Copy kubeconfig from master
scp pi@192.168.1.100:~/.kube/config ~/.kube/config

# Or via kubectl port-forward
kubectl port-forward -n kube-system svc/kubernetes 6443:443
```

### Add a Worker Node

```bash
# On new node
export MASTER_NODE=192.168.1.100
export K3S_TOKEN=$(ssh pi@192.168.1.100 "sudo cat /var/lib/rancher/k3s/server/node-token")
sudo ./setup.sh worker
```

### Remove a Worker Node

```bash
# Drain node first
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Delete from cluster
kubectl delete node <node-name>

# On the node itself
sudo k3s-agent-uninstall.sh
```

## Service Management

### Deploy/Update Services

```bash
# Initial deployment
helm install iot-backend ./helm/iot-backend -n iot-backend --create-namespace

# Update existing deployment
helm upgrade iot-backend ./helm/iot-backend -n iot-backend

# Update with new values
helm upgrade iot-backend ./helm/iot-backend -n iot-backend -f custom-values.yaml
```

### Check Service Status

```bash
# All resources in namespace
kubectl get all -n iot-backend

# Specific service pods
kubectl get pods -n iot-backend -l app=device-management

# Service endpoints
kubectl get endpoints -n iot-backend

# Ingress status
kubectl get ingress -n iot-backend
```

### View Logs

```bash
# Recent logs
kubectl logs -n iot-backend deployment/api-service --tail=100

# Follow logs
kubectl logs -n iot-backend deployment/api-service -f

# Previous container logs (after crash)
kubectl logs -n iot-backend <pod-name> --previous

# Logs from all pods in deployment
kubectl logs -n iot-backend deployment/data-ingestion --all-containers=true
```

### Restart Services

```bash
# Restart deployment (rolling restart)
kubectl rollout restart deployment/api-service -n iot-backend

# Restart all deployments in namespace
kubectl rollout restart deployment -n iot-backend

# Delete specific pod (will auto-recreate)
kubectl delete pod <pod-name> -n iot-backend
```

### Scale Services

```bash
# Manual scaling
kubectl scale deployment/data-ingestion -n iot-backend --replicas=5

# Check HPA status
kubectl get hpa -n iot-backend

# Edit HPA settings
kubectl edit hpa data-ingestion -n iot-backend
```

### Execute Commands in Pods

```bash
# Interactive shell
kubectl exec -it <pod-name> -n iot-backend -- /bin/sh

# Run single command
kubectl exec <pod-name> -n iot-backend -- ls -la /data

# Access database
kubectl exec -it postgresql-xxx -n iot-backend -- psql -U iotuser iotdb
kubectl exec -it redis-xxx -n iot-backend -- redis-cli
```

### Port Forwarding

```bash
# Forward local port to service
kubectl port-forward -n iot-backend svc/api-service 8080:8082

# Forward to pod
kubectl port-forward -n iot-backend <pod-name> 8080:8080

# Forward Grafana
kubectl port-forward -n iot-backend svc/grafana 3000:3000
```

## Monitoring

### Resource Usage

```bash
# Node resources
kubectl top nodes

# Pod resources (all namespaces)
kubectl top pods -A

# Pod resources (specific namespace)
kubectl top pods -n iot-backend

# Sort by memory
kubectl top pods -n iot-backend --sort-by=memory

# Sort by CPU
kubectl top pods -n iot-backend --sort-by=cpu
```

### Access Monitoring Tools

```bash
# Grafana (via LoadBalancer or port-forward)
kubectl get svc grafana -n iot-backend
# Access at: http://<external-ip>:3000

# Prometheus (requires port-forward)
kubectl port-forward -n iot-backend svc/prometheus 9090:9090
# Access at: http://localhost:9090

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets
```

### Check Events

```bash
# All events in namespace
kubectl get events -n iot-backend

# Watch events
kubectl get events -n iot-backend --watch

# Filter by type
kubectl get events -n iot-backend --field-selector type=Warning
```

## Troubleshooting

### Pod Issues

```bash
# Describe pod (shows events and status)
kubectl describe pod <pod-name> -n iot-backend

# Get pod YAML
kubectl get pod <pod-name> -n iot-backend -o yaml

# Check pod status details
kubectl get pod <pod-name> -n iot-backend -o jsonpath='{.status}'
```

### Network Debugging

```bash
# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup kubernetes.default

# Test service connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl http://api-service.iot-backend.svc.cluster.local:8082/health

# Check service endpoints
kubectl get endpoints -n iot-backend

# Network diagnostic pod
kubectl run -it --rm netshoot --image=nicolaka/netshoot --restart=Never -- bash
```

### Storage Issues

```bash
# Check PVCs
kubectl get pvc -n iot-backend

# Check PVs
kubectl get pv

# Describe PVC
kubectl describe pvc <pvc-name> -n iot-backend

# Check storage class
kubectl get storageclass
```

### Database Access

```bash
# PostgreSQL
kubectl exec -it postgresql-xxx -n iot-backend -- psql -U iotuser -d iotdb

# Common PostgreSQL commands:
# \dt              - List tables
# \d table_name    - Describe table
# \l               - List databases
# \q               - Quit

# Redis
kubectl exec -it redis-xxx -n iot-backend -- redis-cli
# AUTH <password>
# PING
# INFO
# KEYS *

# InfluxDB
kubectl exec -it influxdb-xxx -n iot-backend -- influx
# Use WebUI at: http://<influxdb-service>:8086
```

## Backup and Recovery

### Manual Backups

```bash
# PostgreSQL backup
kubectl exec -n iot-backend postgresql-xxx -- pg_dump -U iotuser iotdb > backup-$(date +%Y%m%d).sql

# PostgreSQL restore
cat backup.sql | kubectl exec -i -n iot-backend postgresql-xxx -- psql -U iotuser iotdb

# InfluxDB backup
kubectl exec -n iot-backend influxdb-xxx -- influx backup /backup/$(date +%Y%m%d)

# etcd snapshot (on master node)
ssh pi@192.168.1.100 "sudo k3s etcd-snapshot save"

# List etcd snapshots
ssh pi@192.168.1.100 "sudo k3s etcd-snapshot ls"
```

### Helm Backup

```bash
# Export current values
helm get values iot-backend -n iot-backend > current-values.yaml

# Export full manifest
helm get manifest iot-backend -n iot-backend > current-manifest.yaml

# List releases
helm list -n iot-backend

# Rollback to previous version
helm rollback iot-backend -n iot-backend
helm rollback iot-backend 1 -n iot-backend  # Specific revision
```

### Disaster Recovery

```bash
# Restore etcd snapshot (on master)
sudo k3s server --cluster-reset --cluster-reset-restore-path=/var/lib/rancher/k3s/server/db/snapshots/<snapshot-name>

# Re-deploy services
helm install iot-backend ./helm/iot-backend -n iot-backend --create-namespace

# Restore database data
# (restore from backups as shown above)
```

## Scaling

### Horizontal Scaling

```bash
# Scale deployment
kubectl scale deployment/<name> -n iot-backend --replicas=<count>

# Auto-scaling with HPA
kubectl autoscale deployment/<name> -n iot-backend --min=2 --max=5 --cpu-percent=70

# Check HPA status
kubectl get hpa -n iot-backend
kubectl describe hpa <name> -n iot-backend
```

### Vertical Scaling

```bash
# Update resource limits
kubectl set resources deployment/<name> -n iot-backend --limits=memory=1Gi,cpu=1

# Or edit deployment
kubectl edit deployment/<name> -n iot-backend
```

## Common Operations Cheat Sheet

| Task | Command |
|------|---------|
| Get all pods | `kubectl get pods -A` |
| Describe pod | `kubectl describe pod <pod> -n iot-backend` |
| View logs | `kubectl logs <pod> -n iot-backend` |
| Get into pod | `kubectl exec -it <pod> -n iot-backend -- sh` |
| Delete pod | `kubectl delete pod <pod> -n iot-backend` |
| Scale deployment | `kubectl scale deploy <name> --replicas=3 -n iot-backend` |
| Check resources | `kubectl top nodes` / `kubectl top pods -n iot-backend` |
| Check services | `kubectl get svc -n iot-backend` |
| Check ingress | `kubectl get ingress -n iot-backend` |
| Port forward | `kubectl port-forward svc/<name> 8080:80 -n iot-backend` |
| Get events | `kubectl get events -n iot-backend` |
| Update deployment | `helm upgrade iot-backend ./helm/iot-backend -n iot-backend` |
| Rollback | `helm rollback iot-backend -n iot-backend` |

## Emergency Procedures

### Node Unresponsive

```bash
# 1. Check node status
kubectl get nodes
kubectl describe node <node-name>

# 2. Try to drain node
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# 3. SSH to node and check K3s
ssh pi@<node-ip>
sudo systemctl status k3s-agent
sudo journalctl -u k3s-agent -n 100

# 4. Restart K3s on node
sudo systemctl restart k3s-agent

# 5. Uncordon node when ready
kubectl uncordon <node-name>
```

### Service Down

```bash
# 1. Check pod status
kubectl get pods -n iot-backend -l app=<service-name>

# 2. Check recent logs
kubectl logs -n iot-backend deployment/<service-name> --tail=100

# 3. Check events
kubectl describe deployment/<service-name> -n iot-backend

# 4. Restart service
kubectl rollout restart deployment/<service-name> -n iot-backend

# 5. Scale down and up if needed
kubectl scale deployment/<service-name> -n iot-backend --replicas=0
kubectl scale deployment/<service-name> -n iot-backend --replicas=2
```

### Database Issues

```bash
# 1. Check pod status
kubectl get pods -n iot-backend -l app=postgresql

# 2. Check logs
kubectl logs -n iot-backend <db-pod-name>

# 3. Check PVC
kubectl get pvc -n iot-backend | grep postgresql

# 4. Access database
kubectl exec -it <db-pod-name> -n iot-backend -- psql -U iotuser iotdb

# 5. Restart if needed
kubectl delete pod <db-pod-name> -n iot-backend
```

## Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgn='kubectl get nodes'
alias kgs='kubectl get svc'
alias kd='kubectl describe'
alias kl='kubectl logs'
alias kx='kubectl exec -it'
alias kpf='kubectl port-forward'
alias kgpa='kubectl get pods -A'
alias ktn='kubectl top nodes'
alias ktp='kubectl top pods'
alias kbb='kubectl get pods -n iot-backend'
alias klb='kubectl logs -n iot-backend'
```

## Additional Resources

- Full Setup Guide: [docs/SETUP.md](docs/SETUP.md)
- Architecture Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Troubleshooting: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- K3s Documentation: https://docs.k3s.io/
- Kubectl Cheat Sheet: https://kubernetes.io/docs/reference/kubectl/cheatsheet/
