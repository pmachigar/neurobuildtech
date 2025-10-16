# NeuroBuildTech IoT Backend

This directory contains the complete backend infrastructure for deploying IoT services on a Raspberry Pi cluster.

## 🚀 Quick Start

The fastest way to get started:

```bash
# 1. Navigate to deployment directory
cd backend/deployment

# 2. Read the overview
cat README.md

# 3. Follow the setup guide
open docs/SETUP.md
```

## 📁 What's Included

### `/deployment` - Complete Deployment Infrastructure

This is the main directory containing everything needed to deploy the IoT backend on a 6-node Raspberry Pi 5B cluster:

- **K3s Setup Scripts** - Automated Kubernetes installation
- **Helm Chart** - Complete service deployment configuration
- **Ansible Playbooks** - Full automation of cluster provisioning
- **Monitoring Stack** - Prometheus and Grafana configurations
- **Comprehensive Documentation** - 57,000+ words across 6 guides

## 📖 Documentation

All documentation is located in `deployment/docs/`:

| Document | Description | Words |
|----------|-------------|-------|
| [SETUP.md](deployment/docs/SETUP.md) | Step-by-step setup guide | 9,800 |
| [ARCHITECTURE.md](deployment/docs/ARCHITECTURE.md) | System architecture and design | 19,000 |
| [TROUBLESHOOTING.md](deployment/docs/TROUBLESHOOTING.md) | Common issues and solutions | 17,700 |
| [QUICK_REFERENCE.md](deployment/QUICK_REFERENCE.md) | Essential commands | 10,800 |
| [IMPLEMENTATION_SUMMARY.md](deployment/IMPLEMENTATION_SUMMARY.md) | Implementation overview | 12,800 |
| [README.md](deployment/README.md) | Deployment overview | 10,200 |

## 🎯 Deployment Options

### Option 1: Fully Automated (Recommended)

Use Ansible for complete automation:

```bash
cd deployment/ansible

# Update inventory with your node IPs
vim inventory/hosts.ini

# Run cluster provisioning (10-15 minutes)
ansible-playbook -i inventory/hosts.ini playbooks/cluster-provision.yaml

# Deploy all services (5-10 minutes)
ansible-playbook -i inventory/hosts.ini playbooks/deploy-services.yaml
```

### Option 2: Manual Helm Deployment

For more control over the process:

```bash
# On master node, install K3s
cd deployment/k3s
sudo ./setup.sh master

# On each worker node
export MASTER_NODE=192.168.1.100
export K3S_TOKEN=<token-from-master>
sudo ./setup.sh worker

# Deploy services via Helm
helm install iot-backend deployment/helm/iot-backend \
  --namespace iot-backend --create-namespace
```

### Option 3: Step-by-Step Manual

Follow the detailed setup guide:

```bash
# Read and follow step-by-step
open deployment/docs/SETUP.md
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              Raspberry Pi K3s Cluster                    │
│                   (6 Nodes Total)                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Master Node (Control Plane)                            │
│  └── K3s Server, API, Scheduler, etcd                   │
│                                                          │
│  5 Worker Nodes (Application Workloads)                 │
│  ├── Device Management (2 replicas)                     │
│  ├── Data Ingestion (2 replicas)                        │
│  ├── API Service (2 replicas)                           │
│  ├── Analytics (1-3 replicas)                           │
│  ├── Databases (InfluxDB, PostgreSQL, Redis)            │
│  ├── MQTT Broker (Mosquitto)                            │
│  └── Monitoring (Prometheus, Grafana, Loki)             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Specifications:**
- 6x Raspberry Pi 5B (16GB RAM, 512GB M.2 SSD each)
- Total: 96GB RAM, 24 CPU cores, 3TB storage
- K3s (lightweight Kubernetes)
- Gigabit Ethernet networking

## 🛠️ Technology Stack

- **Orchestration**: K3s (Kubernetes)
- **Container Runtime**: containerd
- **Networking**: Flannel (VXLAN)
- **Ingress**: NGINX Ingress Controller
- **Storage**: Local-path provisioner (M.2 SSD)
- **Package Manager**: Helm 3
- **Automation**: Ansible
- **Monitoring**: Prometheus, Grafana, Loki
- **Databases**: InfluxDB, PostgreSQL, Redis
- **Message Broker**: Eclipse Mosquitto (MQTT)

## 📊 Deployed Services

| Service | Replicas | Resources | Storage |
|---------|----------|-----------|---------|
| Device Management | 2 | 512Mi / 0.5 CPU | - |
| Data Ingestion | 2-5 (HPA) | 1Gi / 1 CPU | - |
| API Service | 2-4 (HPA) | 512Mi / 0.5 CPU | - |
| Analytics | 1-3 (HPA) | 1Gi / 1 CPU | - |
| InfluxDB | 1 | 2Gi / 1 CPU | 50Gi |
| PostgreSQL | 1 | 1Gi / 1 CPU | 30Gi |
| Redis | 1 | 512Mi / 0.5 CPU | 10Gi |
| Mosquitto | 1 | 512Mi / 0.5 CPU | 5Gi |
| Prometheus | 1 | 1Gi / 1 CPU | 20Gi |
| Grafana | 1 | 512Mi / 0.5 CPU | 5Gi |

**Total Allocation**: ~19GB RAM, ~12 CPU cores  
**Available for Scaling**: ~65GB RAM, ~8 CPU cores

## 🎨 Key Features

✅ **High Availability**
- Pod anti-affinity spreads services across nodes
- Automatic pod rescheduling on node failure
- Health checks with auto-restart

✅ **Auto-Scaling**
- Horizontal Pod Autoscaler for data ingestion, API, analytics
- Scales based on CPU and memory usage

✅ **Monitoring & Observability**
- Prometheus metrics collection
- Pre-configured Grafana dashboards
- Log aggregation with Loki
- 10+ alert rules for critical issues

✅ **Security**
- Kubernetes RBAC
- Network policies
- Secret management
- Non-root containers

✅ **Persistent Storage**
- PersistentVolumeClaims for all databases
- Data survives pod restarts
- Leverages fast M.2 SSDs

✅ **Full Automation**
- Ansible playbooks for provisioning
- Helm charts for service deployment
- CI/CD ready

## 🔐 Security Notes

⚠️ **Before production deployment:**

1. Change default passwords in `deployment/helm/iot-backend/values.yaml`:
   - PostgreSQL password
   - InfluxDB admin password
   - Redis password
   - Grafana admin password

2. Configure SSL/TLS certificates for ingress

3. Review and customize network policies

4. Set up regular backup procedures

## 📈 Resource Requirements

**Minimum:**
- 6x Raspberry Pi 5B (or similar ARM64 SBC)
- 16GB RAM per node
- 512GB storage per node (M.2 SSD recommended)
- Gigabit Ethernet network

**Recommended for Production:**
- Dedicated network switch
- UPS for power backup
- Active cooling on all nodes
- Separate backup storage (NFS/S3)

## 🔧 Common Commands

```bash
# Check cluster status
kubectl get nodes
kubectl get pods -n iot-backend

# Access Grafana
kubectl get svc grafana -n iot-backend
# Open: http://<external-ip>:3000

# View logs
kubectl logs -n iot-backend deployment/api-service

# Scale a service
kubectl scale deployment/data-ingestion -n iot-backend --replicas=5

# Update deployment
helm upgrade iot-backend deployment/helm/iot-backend -n iot-backend
```

For more commands, see [QUICK_REFERENCE.md](deployment/QUICK_REFERENCE.md)

## 🆘 Getting Help

1. **Setup Issues**: Check [SETUP.md](deployment/docs/SETUP.md)
2. **Architecture Questions**: Read [ARCHITECTURE.md](deployment/docs/ARCHITECTURE.md)
3. **Problems**: See [TROUBLESHOOTING.md](deployment/docs/TROUBLESHOOTING.md)
4. **Quick Reference**: Check [QUICK_REFERENCE.md](deployment/QUICK_REFERENCE.md)

## 📝 Next Steps

After deployment:

1. ✅ **Verify Installation**
   ```bash
   kubectl get all -n iot-backend
   kubectl top nodes
   ```

2. ✅ **Access Monitoring**
   - Open Grafana dashboard
   - Review pre-configured dashboards
   - Set up alerts

3. ✅ **Configure Backups**
   - Set up database backup storage
   - Test restore procedures
   - Document backup locations

4. ✅ **Build Your Services**
   - Create Docker images for your IoT services
   - Push to container registry
   - Update Helm values with real image names

5. ✅ **Set Up CI/CD**
   - Configure GitHub Actions
   - Automate deployments
   - Set up testing pipelines

## 🎓 Learning Resources

- [K3s Documentation](https://docs.k3s.io/)
- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Raspberry Pi Cluster Guide](https://www.raspberrypi.org/documentation/)

## 🤝 Contributing

Contributions are welcome! Please:
1. Read the documentation
2. Test your changes
3. Submit a pull request

## 📄 License

Copyright © 2025 NeuroBuildTech

## 🎉 Acknowledgments

Built with best practices from:
- Kubernetes community
- K3s project
- Helm community
- Raspberry Pi foundation

---

**Ready to deploy?** Start with [deployment/README.md](deployment/README.md)
