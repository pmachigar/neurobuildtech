# Troubleshooting Guide

This guide provides solutions to common issues encountered when running the IoT backend on a Raspberry Pi K3s cluster.

## Table of Contents

1. [K3s Installation Issues](#k3s-installation-issues)
2. [Node Issues](#node-issues)
3. [Pod Issues](#pod-issues)
4. [Network Issues](#network-issues)
5. [Storage Issues](#storage-issues)
6. [Database Issues](#database-issues)
7. [Service Issues](#service-issues)
8. [Performance Issues](#performance-issues)
9. [Monitoring Issues](#monitoring-issues)
10. [Common Error Messages](#common-error-messages)

## K3s Installation Issues

### Issue: K3s fails to install on Raspberry Pi

**Symptoms:**
```bash
[ERROR] Failed to start k3s
```

**Possible Causes:**
1. Insufficient system resources
2. Missing cgroup configuration
3. Incompatible OS version

**Solutions:**

1. Check system requirements:
```bash
# Check OS version (should be 64-bit)
uname -m
# Should output: aarch64

# Check available memory
free -h

# Check disk space
df -h
```

2. Enable cgroups:
```bash
# Check current boot parameters
cat /boot/cmdline.txt

# Add cgroup parameters if missing
sudo sed -i '$ s/$/ cgroup_memory=1 cgroup_enable=memory/' /boot/cmdline.txt

# Reboot
sudo reboot
```

3. Check system logs:
```bash
sudo journalctl -u k3s -f
```

### Issue: K3s service won't start after reboot

**Symptoms:**
```bash
sudo systemctl status k3s
# Status: failed
```

**Solutions:**

1. Check for disk mount issues:
```bash
# Verify M.2 SSD is mounted
df -h | grep /mnt/storage

# If not mounted, check fstab
cat /etc/fstab

# Manually mount and restart
sudo mount -a
sudo systemctl restart k3s
```

2. Check for swap issues:
```bash
# Verify swap is disabled
sudo swapon --show
# Should be empty

# If swap is active
sudo swapoff -a
```

## Node Issues

### Issue: Node shows as NotReady

**Symptoms:**
```bash
kubectl get nodes
# STATUS: NotReady
```

**Diagnosis:**
```bash
# Check node conditions
kubectl describe node <node-name>

# Check kubelet logs
sudo journalctl -u k3s-agent -n 100
```

**Solutions:**

1. Restart kubelet/K3s:
```bash
# On master
sudo systemctl restart k3s

# On worker
sudo systemctl restart k3s-agent
```

2. Check network connectivity:
```bash
# Ping master from worker
ping -c 4 192.168.1.100

# Check if K3s port is open
nc -zv 192.168.1.100 6443
```

3. Check disk pressure:
```bash
# Check disk usage
df -h

# Clean up if needed
sudo apt clean
sudo apt autoremove
docker system prune -a
```

### Issue: High CPU/Memory usage on nodes

**Diagnosis:**
```bash
# Check node resources
kubectl top nodes

# Check which pods are consuming resources
kubectl top pods -A --sort-by=memory
kubectl top pods -A --sort-by=cpu

# Check system processes
top
htop
```

**Solutions:**

1. Adjust pod resource limits:
```bash
# Edit deployment
kubectl edit deployment <deployment-name> -n iot-backend

# Update resources:
resources:
  limits:
    memory: "512Mi"
    cpu: "500m"
```

2. Scale down replicas:
```bash
kubectl scale deployment <deployment-name> -n iot-backend --replicas=1
```

3. Add more worker nodes to distribute load

## Pod Issues

### Issue: Pods stuck in Pending state

**Symptoms:**
```bash
kubectl get pods -n iot-backend
# STATUS: Pending
```

**Diagnosis:**
```bash
# Check pod events
kubectl describe pod <pod-name> -n iot-backend

# Common reasons:
# - Insufficient resources
# - Volume mount issues
# - Node selector constraints
```

**Solutions:**

1. Check resource availability:
```bash
# Check node resources
kubectl top nodes

# Check resource requests
kubectl describe pod <pod-name> -n iot-backend | grep -A 5 "Requests"
```

2. Check for scheduling constraints:
```bash
# Check node labels
kubectl get nodes --show-labels

# Check pod affinity/anti-affinity rules
kubectl get pod <pod-name> -n iot-backend -o yaml | grep -A 10 affinity
```

3. Check storage:
```bash
# Check PVC status
kubectl get pvc -n iot-backend

# Check PV status
kubectl get pv
```

### Issue: Pods in CrashLoopBackOff state

**Symptoms:**
```bash
kubectl get pods -n iot-backend
# STATUS: CrashLoopBackOff
```

**Diagnosis:**
```bash
# Check pod logs
kubectl logs <pod-name> -n iot-backend

# Check previous pod logs (if restarted)
kubectl logs <pod-name> -n iot-backend --previous

# Check pod events
kubectl describe pod <pod-name> -n iot-backend
```

**Solutions:**

1. Check application logs for errors
2. Verify environment variables and secrets:
```bash
# Check secrets
kubectl get secrets -n iot-backend

# Describe secret (base64 encoded)
kubectl get secret <secret-name> -n iot-backend -o yaml
```

3. Check liveness/readiness probes:
```bash
# Edit deployment to adjust probes
kubectl edit deployment <deployment-name> -n iot-backend

# Increase initialDelaySeconds
livenessProbe:
  initialDelaySeconds: 60  # Increase if startup is slow
```

4. Check for OOMKilled:
```bash
# Look for OOMKilled in pod status
kubectl get pod <pod-name> -n iot-backend -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'

# If OOMKilled, increase memory limit
```

### Issue: ImagePullBackOff error

**Symptoms:**
```bash
kubectl get pods -n iot-backend
# STATUS: ImagePullBackOff
```

**Solutions:**

1. Check image name:
```bash
kubectl describe pod <pod-name> -n iot-backend | grep Image

# Verify image exists
# For local images, ensure they're loaded on the node
```

2. For private registries, create image pull secret:
```bash
kubectl create secret docker-registry regcred \
  --docker-server=<registry-url> \
  --docker-username=<username> \
  --docker-password=<password> \
  -n iot-backend

# Add to deployment
kubectl patch serviceaccount default -n iot-backend -p '{"imagePullSecrets": [{"name": "regcred"}]}'
```

## Network Issues

### Issue: Pods cannot communicate with each other

**Diagnosis:**
```bash
# Check pod IPs
kubectl get pods -n iot-backend -o wide

# Test connectivity from one pod to another
kubectl exec -it <pod-1> -n iot-backend -- ping <pod-2-ip>

# Check service endpoints
kubectl get endpoints -n iot-backend
```

**Solutions:**

1. Check network policies:
```bash
# List network policies
kubectl get networkpolicies -n iot-backend

# Temporarily disable network policies for testing
kubectl delete networkpolicy --all -n iot-backend
```

2. Check Flannel status:
```bash
# Check Flannel pods
kubectl get pods -n kube-system | grep flannel

# Check Flannel logs
kubectl logs -n kube-system <flannel-pod-name>
```

3. Restart networking:
```bash
# Restart flannel
kubectl delete pods -n kube-system -l app=flannel

# Restart CoreDNS
kubectl delete pods -n kube-system -l k8s-app=kube-dns
```

### Issue: Cannot access services via Ingress

**Diagnosis:**
```bash
# Check ingress status
kubectl get ingress -n iot-backend

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress logs
kubectl logs -n ingress-nginx <ingress-controller-pod>
```

**Solutions:**

1. Verify ingress configuration:
```bash
# Check ingress details
kubectl describe ingress iot-backend-ingress -n iot-backend

# Verify backend service exists
kubectl get svc <service-name> -n iot-backend
```

2. Check DNS resolution:
```bash
# From local machine
nslookup api.neurobuildtech.local

# Add to /etc/hosts if DNS not configured
echo "192.168.1.100 api.neurobuildtech.local" | sudo tee -a /etc/hosts
```

### Issue: DNS resolution not working in pods

**Diagnosis:**
```bash
# Test DNS from pod
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup kubernetes.default

# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

**Solutions:**

1. Restart CoreDNS:
```bash
kubectl rollout restart deployment coredns -n kube-system
```

2. Check CoreDNS configuration:
```bash
kubectl get configmap coredns -n kube-system -o yaml
```

## Storage Issues

### Issue: PersistentVolumeClaim stuck in Pending

**Diagnosis:**
```bash
# Check PVC status
kubectl get pvc -n iot-backend

# Check PVC events
kubectl describe pvc <pvc-name> -n iot-backend

# Check available PVs
kubectl get pv
```

**Solutions:**

1. Check storage class:
```bash
# List storage classes
kubectl get storageclass

# Verify local-path-provisioner is running
kubectl get pods -n kube-system | grep local-path
```

2. Manually create PV (if using static provisioning):
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: manual-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /mnt/storage/data
  storageClassName: local-path
```

### Issue: Database data lost after pod restart

**Diagnosis:**
```bash
# Check if PVC is bound
kubectl get pvc -n iot-backend

# Check pod volume mounts
kubectl describe pod <pod-name> -n iot-backend | grep -A 5 Mounts
```

**Solutions:**

1. Ensure PVC is configured correctly in deployment
2. Verify data directory in container:
```bash
# Exec into pod
kubectl exec -it <pod-name> -n iot-backend -- ls -la /var/lib/postgresql/data
```

## Database Issues

### Issue: PostgreSQL pod won't start

**Diagnosis:**
```bash
# Check logs
kubectl logs postgresql-xxx -n iot-backend

# Common errors:
# - Permission denied
# - Data directory is not empty
# - Insufficient resources
```

**Solutions:**

1. Fix permissions:
```bash
# Exec into pod
kubectl exec -it postgresql-xxx -n iot-backend -- sh

# Check permissions
ls -la /var/lib/postgresql/data

# Fix if needed (on node)
sudo chown -R 999:999 /mnt/storage/postgresql
```

2. Clear corrupted data (CAUTION: data loss):
```bash
# Delete PVC and recreate
kubectl delete pvc postgresql-pvc -n iot-backend
kubectl apply -f backend/deployment/helm/iot-backend/templates/postgresql-deployment.yaml
```

### Issue: InfluxDB high memory usage

**Diagnosis:**
```bash
# Check InfluxDB metrics
kubectl exec -it influxdb-xxx -n iot-backend -- influx ping

# Check memory usage
kubectl top pod influxdb-xxx -n iot-backend
```

**Solutions:**

1. Adjust cache settings:
```yaml
# Edit ConfigMap
cache-max-memory-size: 268435456  # 256MB
cache-snapshot-memory-size: 13107200  # 12.5MB
```

2. Implement data retention policies:
```bash
# Exec into InfluxDB
kubectl exec -it influxdb-xxx -n iot-backend -- influx

# Set retention policy
influx bucket update --id <bucket-id> --retention 7d
```

### Issue: Redis connection refused

**Diagnosis:**
```bash
# Test Redis connectivity
kubectl exec -it redis-xxx -n iot-backend -- redis-cli ping

# Check Redis logs
kubectl logs redis-xxx -n iot-backend
```

**Solutions:**

1. Check Redis service:
```bash
kubectl get svc redis -n iot-backend

# Test from another pod
kubectl run -it --rm redis-client --image=redis --restart=Never -- redis-cli -h redis.iot-backend.svc.cluster.local ping
```

2. Check password configuration:
```bash
# Verify Redis password in secret
kubectl get secret redis-auth -n iot-backend -o jsonpath='{.data.password}' | base64 -d
```

## Service Issues

### Issue: MQTT broker not receiving messages

**Diagnosis:**
```bash
# Check Mosquitto logs
kubectl logs mosquitto-xxx -n iot-backend

# Test MQTT from client
mosquitto_pub -h <mosquitto-ip> -t test/topic -m "test message"
mosquitto_sub -h <mosquitto-ip> -t test/topic
```

**Solutions:**

1. Check Mosquitto configuration:
```bash
# Check ConfigMap
kubectl get configmap mosquitto-config -n iot-backend -o yaml

# Verify allow_anonymous setting
```

2. Check network access:
```bash
# Verify service type and ports
kubectl get svc mosquitto -n iot-backend

# Test TCP connection
telnet <mosquitto-ip> 1883
```

### Issue: High API latency

**Diagnosis:**
```bash
# Check API service logs
kubectl logs -n iot-backend deployment/api-service

# Check database performance
kubectl exec -it postgresql-xxx -n iot-backend -- psql -U iotuser -d iotdb -c "SELECT * FROM pg_stat_activity;"
```

**Solutions:**

1. Scale API service:
```bash
kubectl scale deployment api-service -n iot-backend --replicas=3
```

2. Check database query performance
3. Verify Redis cache is working
4. Check for slow endpoints in logs

## Performance Issues

### Issue: Cluster running slow

**Diagnosis:**
```bash
# Check overall resource usage
kubectl top nodes
kubectl top pods -A

# Check I/O wait
iostat -x 5

# Check network throughput
iftop
```

**Solutions:**

1. Identify resource-hungry pods:
```bash
# Sort by memory
kubectl top pods -A --sort-by=memory | head -10

# Sort by CPU
kubectl top pods -A --sort-by=cpu | head -10
```

2. Optimize resource requests/limits:
```bash
# Edit deployment
kubectl edit deployment <deployment-name> -n iot-backend

# Set appropriate limits
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

3. Check for swap usage (should be 0):
```bash
free -h
```

### Issue: Slow disk I/O

**Diagnosis:**
```bash
# Check disk performance
sudo hdparm -Tt /dev/sda

# Check for I/O bottlenecks
iostat -xz 5
```

**Solutions:**

1. Optimize mount options:
```bash
# Edit /etc/fstab
/dev/sda1 /mnt/storage ext4 defaults,noatime,nodiratime 0 2

# Remount
sudo mount -o remount /mnt/storage
```

2. Check for disk errors:
```bash
sudo dmesg | grep -i error
sudo smartctl -a /dev/sda
```

## Monitoring Issues

### Issue: Prometheus not scraping metrics

**Diagnosis:**
```bash
# Check Prometheus targets
kubectl port-forward -n iot-backend svc/prometheus 9090:9090
# Open: http://localhost:9090/targets

# Check Prometheus logs
kubectl logs -n iot-backend deployment/prometheus
```

**Solutions:**

1. Verify service annotations:
```yaml
# Services should have:
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8080"
  prometheus.io/path: "/metrics"
```

2. Check ServiceMonitor (if using Prometheus Operator):
```bash
kubectl get servicemonitor -n iot-backend
```

### Issue: Grafana cannot connect to Prometheus

**Diagnosis:**
```bash
# Check Grafana logs
kubectl logs -n iot-backend deployment/grafana

# Verify data source configuration
kubectl get configmap grafana-datasources -n iot-backend -o yaml
```

**Solutions:**

1. Verify Prometheus service name:
```bash
# Should be: http://prometheus.iot-backend.svc.cluster.local:9090
kubectl get svc prometheus -n iot-backend
```

2. Test connectivity from Grafana pod:
```bash
kubectl exec -it grafana-xxx -n iot-backend -- wget -O- http://prometheus:9090/api/v1/status/config
```

## Common Error Messages

### "node(s) had volume node affinity conflict"

**Cause**: PV is bound to a specific node, but pod is scheduled on a different node

**Solution**:
```bash
# Remove node affinity from PV or use distributed storage
kubectl edit pv <pv-name>
# Remove nodeAffinity section
```

### "Back-off pulling image"

**Cause**: Image doesn't exist or can't be pulled

**Solution**:
- Verify image name and tag
- Check image registry access
- For local development, build and load image on all nodes

### "OOMKilled"

**Cause**: Pod exceeded memory limit

**Solution**:
```bash
# Increase memory limits
kubectl set resources deployment <deployment-name> -n iot-backend --limits=memory=1Gi
```

### "Insufficient cpu/memory"

**Cause**: Node doesn't have enough resources

**Solution**:
- Reduce resource requests
- Add more nodes
- Delete unnecessary pods

### "failed to create fsnotify watcher"

**Cause**: Too many open files (inotify watches)

**Solution**:
```bash
# Increase inotify limits
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
echo "fs.inotify.max_user_instances=512" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Debug Tools and Commands

### General Debugging

```bash
# Get cluster info
kubectl cluster-info
kubectl cluster-info dump

# Check cluster health
kubectl get componentstatuses

# Get all resources in namespace
kubectl get all -n iot-backend

# Describe resource
kubectl describe <resource-type> <resource-name> -n iot-backend

# Get logs
kubectl logs <pod-name> -n iot-backend
kubectl logs <pod-name> -n iot-backend --previous
kubectl logs -f <pod-name> -n iot-backend  # Follow logs

# Execute commands in pod
kubectl exec -it <pod-name> -n iot-backend -- /bin/sh

# Port forwarding for debugging
kubectl port-forward <pod-name> 8080:8080 -n iot-backend

# Copy files from pod
kubectl cp iot-backend/<pod-name>:/path/to/file ./local-file
```

### Network Debugging

```bash
# Run debug pod
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- bash

# Test DNS
nslookup kubernetes.default
nslookup <service-name>.iot-backend.svc.cluster.local

# Test connectivity
ping <pod-ip>
curl http://<service-name>:8080/health

# Trace route
traceroute <ip-address>

# Check open ports
netstat -tulpn
```

### Resource Debugging

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -A

# Get resource requests/limits
kubectl describe nodes | grep -A 5 "Allocated resources"

# Check resource quotas
kubectl get resourcequota -n iot-backend
```

## Getting Help

If you can't resolve the issue:

1. Check the [Setup Guide](./SETUP.md) for configuration issues
2. Review the [Architecture Documentation](./ARCHITECTURE.md)
3. Check K3s documentation: https://docs.k3s.io/
4. Check Kubernetes documentation: https://kubernetes.io/docs/
5. Open an issue on GitHub with:
   - Error messages
   - `kubectl get all -n iot-backend` output
   - `kubectl get events -n iot-backend` output
   - Relevant logs

## Preventive Measures

1. **Regular Maintenance**:
   - Update K3s regularly
   - Monitor disk space
   - Review logs for warnings
   - Test backups

2. **Monitoring**:
   - Set up alerts for critical issues
   - Monitor resource usage trends
   - Check application logs regularly

3. **Backup**:
   - Regular database backups
   - etcd snapshots
   - Document configuration changes

4. **Testing**:
   - Test in staging before production
   - Validate backups
   - Practice disaster recovery procedures
