# IoT Backend Deployment on Raspberry Pi Cluster

This directory contains all the configuration files, scripts, and documentation needed to deploy the IoT backend services on a 6-node Raspberry Pi 5B cluster running K3s (lightweight Kubernetes).

## Directory Structure

```
deployment/
├── k3s/                    # K3s cluster setup scripts and configurations
│   ├── setup.sh           # Automated installation script for K3s
│   ├── master-init.yaml   # Master node configuration
│   └── worker-join.yaml   # Worker node configuration
├── helm/                   # Helm charts for service deployment
│   └── iot-backend/       # Main Helm chart for IoT backend services
│       ├── Chart.yaml     # Chart metadata
│       ├── values.yaml    # Configuration values
│       └── templates/     # Kubernetes resource templates
├── ansible/               # Ansible playbooks for automation
│   ├── inventory/         # Cluster inventory
│   ├── playbooks/         # Automation playbooks
│   │   ├── cluster-provision.yaml   # Cluster setup automation
│   │   └── deploy-services.yaml     # Service deployment automation
│   └── roles/             # Reusable Ansible roles
├── monitoring/            # Monitoring and observability configurations
│   ├── prometheus.yaml    # Prometheus metrics collection
│   └── grafana.yaml       # Grafana visualization dashboards
└── docs/                  # Documentation
    ├── SETUP.md           # Step-by-step setup guide
    ├── ARCHITECTURE.md    # System architecture overview
    └── TROUBLESHOOTING.md # Common issues and solutions
```

## Quick Start

### Prerequisites

- 6x Raspberry Pi 5B (16GB RAM, 512GB M.2 SSD each)
- Gigabit Ethernet network
- Raspberry Pi OS 64-bit Lite installed on all nodes
- SSH access configured

### Option 1: Automated Setup (Recommended)

Using Ansible for full automation:

```bash
# 1. Update inventory with your node IPs
cd ansible
vim inventory/hosts.ini

# 2. Run cluster provisioning
ansible-playbook -i inventory/hosts.ini playbooks/cluster-provision.yaml

# 3. Deploy services
ansible-playbook -i inventory/hosts.ini playbooks/deploy-services.yaml
```

### Option 2: Manual Setup

For step-by-step control:

```bash
# 1. Install K3s on master node
ssh pi@192.168.1.100
cd /path/to/deployment/k3s
sudo ./setup.sh master

# 2. Join worker nodes (on each worker)
ssh pi@192.168.1.101
export MASTER_NODE=192.168.1.100
export K3S_TOKEN=<token-from-master>
sudo ./setup.sh worker

# 3. Deploy services (from master)
helm install iot-backend helm/iot-backend --namespace iot-backend --create-namespace

# 4. Deploy monitoring
kubectl apply -f monitoring/prometheus.yaml
kubectl apply -f monitoring/grafana.yaml
```

## Deployed Services

The deployment includes the following services:

### Core Services
- **Device Management** (2 replicas): Device registration and lifecycle management
- **Data Ingestion** (2 replicas): IoT data collection and processing
- **API Service** (2 replicas): RESTful API for external access
- **Analytics** (2 replicas): Real-time data analytics and processing

### Data Layer
- **InfluxDB**: Time-series database for IoT sensor data
- **PostgreSQL**: Relational database for metadata and configuration
- **Redis**: Cache and message queue
- **Mosquitto**: MQTT broker for device communication

### Monitoring Stack
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation

## Resource Allocation

Total cluster resources (6 nodes):
- **CPU**: 24 cores (4 cores × 6 nodes)
- **Memory**: 96GB (16GB × 6 nodes)
- **Storage**: 3TB (512GB × 6 nodes)

Service allocation:
- Core services: ~6GB RAM, ~4 CPU cores
- Databases: ~7GB RAM, ~3 CPU cores
- Monitoring: ~4GB RAM, ~2 CPU cores
- **Available for scaling**: ~73GB RAM, ~15 CPU cores

## Cluster Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Master Node                          │
│  - K3s Control Plane (API Server, Scheduler, etcd)    │
│  - No application workloads (tainted)                  │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐  ┌────────▼───────┐  ┌──────▼─────────┐
│  Worker 01    │  │  Worker 02     │  │  Worker 03     │
│  Application  │  │  Application   │  │  Application   │
│  Workloads    │  │  Workloads     │  │  Workloads     │
└───────────────┘  └────────────────┘  └────────────────┘
┌───────────────┐  ┌────────────────┐
│  Worker 04    │  │  Worker 05     │
│  Application  │  │  Application   │
│  Workloads    │  │  Workloads     │
└───────────────┘  └────────────────┘
```

## High Availability Features

- **Pod Anti-Affinity**: Services distributed across nodes
- **Health Checks**: Automatic pod restart on failure
- **Horizontal Pod Autoscaling**: Automatic scaling based on load
- **Rolling Updates**: Zero-downtime deployments
- **Persistent Storage**: Data persistence across pod restarts
- **Backup Strategy**: Automated daily backups

## Accessing Services

### Internal Access (from within cluster)

Services are accessible via Kubernetes DNS:
```
http://device-management.iot-backend.svc.cluster.local:8080
http://data-ingestion.iot-backend.svc.cluster.local:8081
http://api-service.iot-backend.svc.cluster.local:8082
```

### External Access

Via Ingress Controller:
```
http://api.neurobuildtech.local        → API Service
http://grafana.neurobuildtech.local    → Grafana Dashboard
```

MQTT Broker (direct TCP):
```
mqtt://192.168.1.100:1883              → MQTT Protocol
ws://192.168.1.100:9001                → WebSocket Protocol
```

## Monitoring and Observability

### Grafana Dashboards

Access Grafana at: `http://grafana.neurobuildtech.local:3000`
- Default credentials: `admin` / `changeme` (change after first login)

Pre-configured dashboards:
1. **Raspberry Pi Cluster Overview**: Node resources, CPU, memory, disk
2. **IoT Services Overview**: Service health, request rates, latencies
3. **Database Metrics**: Database performance and connections
4. **MQTT Broker Metrics**: Message throughput and client connections

### Prometheus

Access Prometheus at: `http://prometheus:9090` (port-forward required)
```bash
kubectl port-forward -n iot-backend svc/prometheus 9090:9090
```

### Alerts

Configured alerts:
- Node down (critical)
- High CPU/Memory usage (warning)
- Service down (critical)
- Database connection issues (warning)
- Disk space low (warning)

## Configuration

### Customizing Values

Edit `helm/iot-backend/values.yaml` to customize:
- Resource limits (CPU, memory)
- Replica counts
- Storage sizes
- Service ports
- Database credentials (change defaults!)
- Enable/disable services

### Scaling Services

```bash
# Scale manually
kubectl scale deployment data-ingestion -n iot-backend --replicas=5

# Or edit values.yaml and upgrade
helm upgrade iot-backend helm/iot-backend -n iot-backend
```

## Security Considerations

⚠️ **Important**: Change default passwords before production use!

```bash
# Update database passwords
kubectl edit secret postgresql-auth -n iot-backend
kubectl edit secret influxdb-auth -n iot-backend
kubectl edit secret grafana-credentials -n iot-backend

# Enable network policies
# Already configured in values.yaml (networkPolicy.enabled: true)
```

## Backup and Recovery

### Automated Backups

Backup strategy (configured but requires storage setup):
- **Daily**: Database backups (PostgreSQL, InfluxDB)
- **Hourly**: etcd snapshots (K3s state)
- **Weekly**: Full persistent volume backups

### Manual Backup

```bash
# PostgreSQL backup
kubectl exec -n iot-backend postgresql-xxx -- pg_dump -U iotuser iotdb > backup.sql

# InfluxDB backup
kubectl exec -n iot-backend influxdb-xxx -- influx backup /backup

# etcd snapshot (on master node)
sudo k3s etcd-snapshot save
```

## Maintenance

### Regular Tasks

1. **Update K3s** (monthly):
```bash
sudo k3s-killall.sh
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=<new-version> sh -
```

2. **Update Services** (as needed):
```bash
helm upgrade iot-backend helm/iot-backend -n iot-backend
```

3. **Clean up resources**:
```bash
# Remove unused images
docker system prune -a

# Clean apt cache
sudo apt clean
```

4. **Monitor disk space**:
```bash
kubectl get pvc -n iot-backend
df -h
```

## Documentation

- **[SETUP.md](docs/SETUP.md)**: Detailed step-by-step setup instructions
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**: System architecture and design decisions
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**: Common issues and solutions

## Troubleshooting

Quick diagnostics:

```bash
# Check cluster health
kubectl get nodes
kubectl get pods -A

# Check service status
kubectl get all -n iot-backend

# Check logs
kubectl logs -n iot-backend deployment/api-service

# Check resources
kubectl top nodes
kubectl top pods -n iot-backend
```

For detailed troubleshooting, see [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## CI/CD Integration

### GitHub Actions Integration

Example workflow for automated deployment:

```yaml
name: Deploy to K3s Cluster
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy with Helm
        run: |
          helm upgrade --install iot-backend \
            ./backend/deployment/helm/iot-backend \
            --namespace iot-backend
```

See `.github/workflows/` for complete CI/CD examples.

## Support and Contributing

- **Issues**: Report bugs or request features on GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions
- **Pull Requests**: Contributions are welcome!

## License

Copyright © 2025 NeuroBuildTech

## Additional Resources

- [K3s Documentation](https://docs.k3s.io/)
- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Raspberry Pi Cluster Guide](https://www.raspberrypi.org/documentation/)
- [InfluxDB Documentation](https://docs.influxdata.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Mosquitto MQTT Documentation](https://mosquitto.org/documentation/)
