# Raspberry Pi Cluster Setup Guide

This guide provides step-by-step instructions for setting up a 6-node Raspberry Pi 5B cluster for the IoT backend deployment.

## Table of Contents

1. [Hardware Requirements](#hardware-requirements)
2. [Initial Hardware Setup](#initial-hardware-setup)
3. [Operating System Installation](#operating-system-installation)
4. [Network Configuration](#network-configuration)
5. [K3s Cluster Installation](#k3s-cluster-installation)
6. [Service Deployment](#service-deployment)
7. [Monitoring Setup](#monitoring-setup)
8. [Verification](#verification)

## Hardware Requirements

### Cluster Nodes
- **6x Raspberry Pi 5B** with the following specs:
  - 16GB RAM
  - 512GB M.2 NVMe SSD
  - ARM64 architecture (aarch64)
  
### Additional Hardware
- **Network Switch**: Gigabit Ethernet switch (minimum 8 ports)
- **Power Supply**: Individual 5V/5A USB-C power supplies or powered USB hub
- **Cooling**: Active cooling (fans) for each Pi
- **Network Cables**: CAT6 Ethernet cables
- **SD Cards**: 32GB+ microSD cards for boot (if not using network boot)
- **Optional**: UPS for power backup

### Cluster Configuration
- **1 Master Node**: Control plane + etcd
- **5 Worker Nodes**: Application workloads

## Initial Hardware Setup

### 1. Physical Assembly

```bash
# Recommended node naming convention:
# - rpi-master (192.168.1.100)
# - rpi-worker-01 (192.168.1.101)
# - rpi-worker-02 (192.168.1.102)
# - rpi-worker-03 (192.168.1.103)
# - rpi-worker-04 (192.168.1.104)
# - rpi-worker-05 (192.168.1.105)
```

1. Mount all Raspberry Pis in a rack or case with proper ventilation
2. Attach M.2 NVMe SSDs to each Pi via USB 3.0 adapter or HAT
3. Install active cooling on each unit
4. Connect all nodes to the network switch
5. Connect power supplies

### 2. Storage Setup

The M.2 SSDs should be mounted as the primary storage:

```bash
# Format the M.2 SSD (on each node)
sudo mkfs.ext4 /dev/sda1

# Create mount point
sudo mkdir -p /mnt/storage

# Mount the SSD
sudo mount /dev/sda1 /mnt/storage

# Add to fstab for automatic mounting
echo '/dev/sda1 /mnt/storage ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
```

## Operating System Installation

### 1. Download Raspberry Pi OS

Use **Raspberry Pi OS 64-bit Lite** (Debian-based) for optimal performance:

```bash
# Download from: https://www.raspberrypi.com/software/operating-systems/
# Choose: Raspberry Pi OS Lite (64-bit)
```

### 2. Flash OS to SD Cards

Using Raspberry Pi Imager:

```bash
# Install Raspberry Pi Imager
# macOS: brew install raspberry-pi-imager
# Ubuntu: sudo snap install rpi-imager

# Flash each SD card with:
# - Raspberry Pi OS Lite (64-bit)
# - Enable SSH
# - Set hostname (rpi-master, rpi-worker-01, etc.)
# - Configure WiFi (optional, Ethernet recommended)
# - Set username: pi
# - Set password (or use SSH keys)
```

### 3. Initial Boot and Configuration

For each node:

```bash
# SSH into the node
ssh pi@<node-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Set hostname
sudo hostnamectl set-hostname <node-name>

# Configure timezone
sudo timerctl set-timezone UTC

# Install essential packages
sudo apt install -y curl git vim htop net-tools

# Reboot
sudo reboot
```

## Network Configuration

### 1. Static IP Assignment

Edit `/etc/dhcpcd.conf` on each node:

```bash
# Master node (192.168.1.100)
sudo tee -a /etc/dhcpcd.conf << EOF
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
EOF

# Worker nodes (adjust IP accordingly)
# rpi-worker-01: 192.168.1.101
# rpi-worker-02: 192.168.1.102
# etc.
```

### 2. Hosts File Configuration

On all nodes, update `/etc/hosts`:

```bash
sudo tee -a /etc/hosts << EOF
192.168.1.100   rpi-master master.local
192.168.1.101   rpi-worker-01
192.168.1.102   rpi-worker-02
192.168.1.103   rpi-worker-03
192.168.1.104   rpi-worker-04
192.168.1.105   rpi-worker-05
EOF
```

### 3. SSH Key Setup

From your control machine:

```bash
# Generate SSH key if not exists
ssh-keygen -t rsa -b 4096

# Copy SSH key to all nodes
for i in {100..105}; do
  ssh-copy-id pi@192.168.1.$i
done
```

## K3s Cluster Installation

### Method 1: Manual Installation (Recommended for Learning)

#### 1. Install K3s on Master Node

```bash
# SSH to master node
ssh pi@192.168.1.100

# Run the setup script
cd /path/to/deployment/k3s
sudo ./setup.sh master

# Save the node token displayed
# It will be in: /var/lib/rancher/k3s/server/node-token
```

#### 2. Join Worker Nodes

```bash
# On each worker node
ssh pi@192.168.1.101  # Adjust IP for each worker

# Set environment variables
export MASTER_NODE=192.168.1.100
export K3S_TOKEN=<token-from-master>

# Run the setup script
cd /path/to/deployment/k3s
sudo ./setup.sh worker
```

#### 3. Verify Cluster

From the master node:

```bash
kubectl get nodes
# Should show all 6 nodes (1 master, 5 workers)

kubectl get nodes -o wide
# Shows detailed node information
```

### Method 2: Automated Installation with Ansible

#### 1. Setup Ansible

On your control machine:

```bash
# Install Ansible
pip3 install ansible

# Update inventory
cd backend/deployment/ansible
vim inventory/hosts.ini
# Update IP addresses to match your cluster
```

#### 2. Run Provisioning Playbook

```bash
# Run the cluster provisioning playbook
cd backend/deployment/ansible
ansible-playbook -i inventory/hosts.ini playbooks/cluster-provision.yaml

# This will:
# - Prepare all nodes
# - Install K3s on master
# - Join all workers
# - Configure kubectl
```

#### 3. Verify Installation

```bash
# SSH to master node
ssh pi@192.168.1.100

# Check cluster status
kubectl get nodes
kubectl cluster-info
```

## Service Deployment

### Method 1: Using Helm (Recommended)

#### 1. Install Helm on Master Node

```bash
# SSH to master node
ssh pi@192.168.1.100

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation
helm version
```

#### 2. Deploy IoT Backend Services

```bash
# Create namespace
kubectl create namespace iot-backend

# Deploy with Helm
cd backend/deployment/helm
helm install iot-backend ./iot-backend --namespace iot-backend

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod --all -n iot-backend --timeout=10m
```

#### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -n iot-backend

# Check services
kubectl get svc -n iot-backend

# Check persistent volumes
kubectl get pvc -n iot-backend
```

### Method 2: Using Ansible

```bash
# From your control machine
cd backend/deployment/ansible
ansible-playbook -i inventory/hosts.ini playbooks/deploy-services.yaml
```

## Monitoring Setup

### 1. Deploy Prometheus

```bash
# Apply Prometheus configuration
kubectl apply -f backend/deployment/monitoring/prometheus.yaml

# Verify Prometheus is running
kubectl get pods -n iot-backend -l app=prometheus
```

### 2. Deploy Grafana

```bash
# Apply Grafana configuration
kubectl apply -f backend/deployment/monitoring/grafana.yaml

# Get Grafana service IP
kubectl get svc grafana -n iot-backend

# Access Grafana (default: admin/changeme)
# URL: http://<grafana-service-ip>:3000
```

### 3. Configure Dashboards

```bash
# Grafana dashboards are pre-configured
# Access the following dashboards:
# 1. Raspberry Pi Cluster Overview
# 2. IoT Services Overview
# 3. Database Metrics
# 4. MQTT Broker Metrics
```

## Verification

### 1. Cluster Health Check

```bash
# Check node status
kubectl get nodes

# Check system pods
kubectl get pods -A

# Check cluster component status
kubectl get componentstatuses
```

### 2. Service Health Check

```bash
# Check all services
kubectl get all -n iot-backend

# Check logs of a specific service
kubectl logs -n iot-backend deployment/device-management

# Check resource usage
kubectl top nodes
kubectl top pods -n iot-backend
```

### 3. Network Connectivity

```bash
# Test internal DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup kubernetes.default

# Test service connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl http://api-service.iot-backend.svc.cluster.local:8082/health
```

### 4. Storage Verification

```bash
# Check persistent volumes
kubectl get pv

# Check persistent volume claims
kubectl get pvc -n iot-backend

# Check storage class
kubectl get storageclass
```

## Post-Installation Tasks

### 1. Secure the Cluster

```bash
# Change default passwords
kubectl edit secret -n iot-backend grafana-credentials
kubectl edit secret -n iot-backend postgresql-auth
kubectl edit secret -n iot-backend influxdb-auth

# Enable network policies
kubectl get networkpolicies -n iot-backend
```

### 2. Setup Backups

```bash
# Configure automated backups (see MAINTENANCE.md)
# Setup daily backups of:
# - etcd snapshots
# - PostgreSQL databases
# - InfluxDB data
# - Persistent volume data
```

### 3. Configure Alerts

```bash
# Review and customize Prometheus alerts
kubectl edit configmap prometheus-rules -n iot-backend

# Configure Alertmanager (optional)
# See monitoring/alertmanager.yaml
```

## Troubleshooting

For common issues and solutions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Next Steps

1. Configure your application services
2. Setup CI/CD pipelines (see GitHub Actions integration)
3. Configure external access (port forwarding, VPN, or Tailscale)
4. Implement backup and disaster recovery procedures
5. Monitor and optimize resource usage

## Additional Resources

- [K3s Documentation](https://docs.k3s.io/)
- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Raspberry Pi Documentation](https://www.raspberrypi.org/documentation/)
- [Architecture Overview](./ARCHITECTURE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
