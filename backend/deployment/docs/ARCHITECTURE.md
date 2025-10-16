# IoT Backend Architecture on Raspberry Pi Cluster

## Overview

This document describes the architecture of the IoT backend deployment on a 6-node Raspberry Pi 5B cluster running K3s (lightweight Kubernetes).

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Hardware Architecture](#hardware-architecture)
3. [Network Topology](#network-topology)
4. [Software Architecture](#software-architecture)
5. [Service Architecture](#service-architecture)
6. [Storage Architecture](#storage-architecture)
7. [High Availability](#high-availability)
8. [Security Architecture](#security-architecture)
9. [Monitoring and Observability](#monitoring-and-observability)
10. [Scalability Considerations](#scalability-considerations)

## System Architecture

### Cluster Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Raspberry Pi K3s Cluster                     │
│                        (6 Nodes Total)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐                                             │
│  │ Master Node   │  (Control Plane + etcd)                     │
│  │ rpi-master    │  192.168.1.100                              │
│  │ 16GB RAM      │  K3s Server                                 │
│  │ 512GB M.2     │  API Server, Scheduler, Controller Manager  │
│  └───────────────┘                                             │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                  Worker Nodes                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │ worker-01│  │ worker-02│  │ worker-03│            │   │
│  │  │.101      │  │.102      │  │.103      │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘            │   │
│  │  ┌──────────┐  ┌──────────┐                          │   │
│  │  │ worker-04│  │ worker-05│                          │   │
│  │  │.104      │  │.105      │                          │   │
│  │  └──────────┘  └──────────┘                          │   │
│  │  Each: 16GB RAM, 512GB M.2 SSD                       │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Resource Efficiency**: Optimized for ARM64 architecture and limited resources
2. **High Availability**: Service replication and automatic failover
3. **Scalability**: Horizontal scaling through pod replication
4. **Observability**: Comprehensive monitoring and logging
5. **Security**: Network policies, RBAC, and encryption
6. **Simplicity**: K3s provides a lightweight Kubernetes distribution

## Hardware Architecture

### Node Specifications

| Component | Master Node | Worker Nodes (x5) |
|-----------|-------------|-------------------|
| CPU | ARM Cortex-A76 (4 cores @ 2.4GHz) | ARM Cortex-A76 (4 cores @ 2.4GHz) |
| RAM | 16GB LPDDR4X | 16GB LPDDR4X |
| Storage | 512GB M.2 NVMe SSD | 512GB M.2 NVMe SSD |
| Network | Gigabit Ethernet | Gigabit Ethernet |
| Power | 5V/5A USB-C | 5V/5A USB-C |

### Total Cluster Resources

- **CPU**: 24 cores (6 nodes × 4 cores)
- **Memory**: 96GB (6 nodes × 16GB)
- **Storage**: 3TB (6 nodes × 512GB)
- **Network**: Gigabit LAN

### Resource Allocation

```
Total Available: 96GB RAM, 24 CPU cores
Reserved: ~12GB RAM, ~4 CPU cores (system + K3s)
Available for Workloads: ~84GB RAM, ~20 CPU cores

Service Allocation:
├── Device Management:    2GB RAM,  1 CPU   (2 replicas)
├── Data Ingestion:       2GB RAM,  2 CPU   (2 replicas)
├── API Service:          1GB RAM,  1 CPU   (2 replicas)
├── Analytics:            2GB RAM,  2 CPU   (2 replicas)
├── InfluxDB:             4GB RAM,  2 CPU   (1 replica)
├── PostgreSQL:           2GB RAM,  1 CPU   (1 replica)
├── Redis:                1GB RAM,  0.5 CPU (1 replica)
├── Mosquitto:            1GB RAM,  0.5 CPU (1 replica)
├── Prometheus:           2GB RAM,  1 CPU   (1 replica)
├── Grafana:              1GB RAM,  0.5 CPU (1 replica)
└── Loki:                 1GB RAM,  0.5 CPU (1 replica)
Total:                   ~19GB RAM, ~12 CPU cores
Remaining:               ~65GB RAM, ~8 CPU cores (for scaling)
```

## Network Topology

### Network Diagram

```
                     ┌──────────────┐
                     │   Internet   │
                     └──────┬───────┘
                            │
                     ┌──────┴───────┐
                     │    Router    │
                     │  192.168.1.1 │
                     └──────┬───────┘
                            │
                ┌───────────┴────────────┐
                │  Gigabit Switch        │
                │  (8-port minimum)      │
                └───┬──┬──┬──┬──┬──┬────┘
                    │  │  │  │  │  │
         ┌──────────┘  │  │  │  │  └──────────┐
         │  ┌──────────┘  │  │  └──────────┐  │
         │  │  ┌──────────┘  └──────────┐  │  │
         │  │  │  ┌───────────────────┐ │  │  │
         │  │  │  │                   │ │  │  │
    ┌────▼──▼──▼──▼──┬──┬──┐         │ │  │  │
    │  Master        │  │  │         │ │  │  │
    │  .100          │  │  │         │ │  │  │
    └────────────────┴──┴──┘         │ │  │  │
    ┌──────────┐ ┌──────────┐        │ │  │  │
    │ Worker-01│ │ Worker-02│◄───────┘ │  │  │
    │ .101     │ │ .102     │          │  │  │
    └──────────┘ └──────────┘          │  │  │
    ┌──────────┐ ┌──────────┐          │  │  │
    │ Worker-03│ │ Worker-04│◄─────────┘  │  │
    │ .103     │ │ .104     │             │  │
    └──────────┘ └──────────┘             │  │
    ┌──────────┐                          │  │
    │ Worker-05│◄─────────────────────────┘  │
    │ .105     │                             │
    └──────────┘                             │
```

### Network Configuration

#### Physical Network
- **Subnet**: 192.168.1.0/24
- **Gateway**: 192.168.1.1
- **DNS**: 8.8.8.8, 8.8.4.4
- **MTU**: 1500 (standard Ethernet)

#### Kubernetes Network (Flannel)
- **Pod CIDR**: 10.42.0.0/16
- **Service CIDR**: 10.43.0.0/16
- **Cluster DNS**: 10.43.0.10 (CoreDNS)
- **CNI Plugin**: Flannel (VXLAN backend)

#### Service Exposure

| Service | Internal Port | External Port | Type | Access |
|---------|--------------|---------------|------|--------|
| API Service | 8082 | 80 | Ingress | api.neurobuildtech.local |
| Grafana | 3000 | 3000 | LoadBalancer | grafana.neurobuildtech.local |
| Mosquitto MQTT | 1883 | 1883 | LoadBalancer | Direct TCP |
| Mosquitto WS | 9001 | 9001 | LoadBalancer | WebSocket |

### Port Allocation

#### K3s System Ports
- 6443: Kubernetes API Server
- 10250: Kubelet API
- 2379-2380: etcd

#### Application Ports
- 8080: Device Management
- 8081: Data Ingestion
- 8082: API Service
- 8083: Analytics
- 8086: InfluxDB
- 5432: PostgreSQL
- 6379: Redis
- 1883: MQTT
- 9001: MQTT WebSocket
- 9090: Prometheus
- 3000: Grafana
- 3100: Loki

## Software Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │   Device     │ │     Data     │ │     API      │   │
│  │  Management  │ │  Ingestion   │ │   Service    │   │
│  └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                   Message Layer                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Mosquitto MQTT Broker (Pub/Sub)               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                             │
│  ┌──────────┐ ┌───────────┐ ┌────────┐ ┌──────────┐  │
│  │InfluxDB  │ │PostgreSQL │ │ Redis  │ │Analytics │  │
│  │(TimeSer.)│ │(Relational│ │(Cache) │ │ Engine   │  │
│  └──────────┘ └───────────┘ └────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│              Orchestration Layer (K3s)                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Kubernetes API, Scheduler, Controller Manager  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                 Infrastructure Layer                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Raspberry Pi OS (64-bit) + Container Runtime   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key Components

1. **K3s**: Lightweight Kubernetes distribution
2. **Flannel**: Container network interface (CNI)
3. **CoreDNS**: Cluster DNS service
4. **Traefik/NGINX**: Ingress controller (NGINX used)
5. **Local-path-provisioner**: Dynamic storage provisioner
6. **Helm**: Package manager for Kubernetes

## Service Architecture

### Service Communication

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTPS
       ▼
┌──────────────────┐
│ Ingress (NGINX)  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐      ┌─────────────┐
│   API Service    │◄────►│   Redis     │
└──────┬───────────┘      │   (Cache)   │
       │                  └─────────────┘
       │ REST/gRPC
       ▼
┌──────────────────┐      ┌─────────────┐
│Device Management │◄────►│ PostgreSQL  │
└──────┬───────────┘      │ (Metadata)  │
       │                  └─────────────┘
       │ MQTT
       ▼
┌──────────────────┐
│    Mosquitto     │
│   (MQTT Broker)  │
└──────┬───────────┘
       │
       │ Subscribe
       ▼
┌──────────────────┐      ┌─────────────┐
│ Data Ingestion   │─────►│  InfluxDB   │
└──────────────────┘      │ (TimeSeries)│
       │                  └─────────────┘
       ▼
┌──────────────────┐
│   Analytics      │
└──────────────────┘
```

### Service Responsibilities

#### Device Management Service
- Device registration and authentication
- Device configuration management
- Device lifecycle management
- Connection state tracking

#### Data Ingestion Service
- Receive IoT data via MQTT
- Validate and transform data
- Store in InfluxDB (time-series)
- Trigger real-time processing

#### API Service
- RESTful API for external access
- Authentication and authorization
- Rate limiting and caching
- Query data from databases

#### Analytics Service
- Real-time data processing
- Aggregations and computations
- Anomaly detection
- Report generation

## Storage Architecture

### Storage Strategy

```
┌──────────────────────────────────────────────────────┐
│              Persistent Storage Layer                 │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │     Local Path Provisioner (Default)        │    │
│  │  - Dynamic PV provisioning                  │    │
│  │  - Node-local storage                       │    │
│  │  - Fast M.2 SSD performance                 │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │  InfluxDB  │ │ PostgreSQL │ │   Redis    │      │
│  │   50GB     │ │   30GB     │ │   10GB     │      │
│  └────────────┘ └────────────┘ └────────────┘      │
│                                                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │ Mosquitto  │ │ Prometheus │ │  Grafana   │      │
│  │    5GB     │ │   20GB     │ │    5GB     │      │
│  └────────────┘ └────────────┘ └────────────┘      │
│                                                       │
│  Total: ~120GB (leaving ~380GB free per node)       │
└──────────────────────────────────────────────────────┘
```

### Storage Classes

1. **local-path** (default): Node-local storage using M.2 SSD
2. **nfs** (optional): Network-attached storage for shared data

### Backup Strategy

- **InfluxDB**: Daily snapshots, 7-day retention
- **PostgreSQL**: Daily pg_dump, 7-day retention
- **etcd**: Hourly snapshots, 24-hour retention
- **Persistent Volumes**: Weekly backups

## High Availability

### Pod Distribution

```
┌────────────────────────────────────────────────────┐
│              Pod Anti-Affinity Rules               │
├────────────────────────────────────────────────────┤
│                                                     │
│  Device Management (2 replicas) → Worker 1, 2     │
│  Data Ingestion (2 replicas)    → Worker 2, 3     │
│  API Service (2 replicas)        → Worker 3, 4     │
│  Analytics (2 replicas)          → Worker 4, 5     │
│                                                     │
│  InfluxDB (1 replica)            → Worker 1        │
│  PostgreSQL (1 replica)          → Worker 2        │
│  Redis (1 replica)               → Worker 3        │
│  Mosquitto (1 replica)           → Worker 4        │
│                                                     │
│  Prometheus (1 replica)          → Worker 5        │
│  Grafana (1 replica)             → Worker 1        │
│  Loki (1 replica)                → Worker 2        │
└────────────────────────────────────────────────────┘
```

### Failure Scenarios

| Scenario | Impact | Recovery |
|----------|--------|----------|
| Worker node failure | Services on that node restart on other workers | Automatic (1-2 minutes) |
| Master node failure | Cluster control plane down | Manual intervention required |
| Service pod crash | Service temporarily unavailable | Automatic restart (10-30 seconds) |
| Database pod crash | Data access temporarily unavailable | Automatic restart, data persists |
| Network partition | Partial cluster isolation | Automatic recovery when network restored |

### Health Checks

- **Liveness Probes**: Restart pods if unhealthy
- **Readiness Probes**: Remove from service if not ready
- **Startup Probes**: Allow time for initialization

## Security Architecture

### Network Security

```
┌──────────────────────────────────────────┐
│         Network Policies                  │
├──────────────────────────────────────────┤
│                                           │
│  Default: Deny all ingress/egress        │
│                                           │
│  Allow:                                   │
│  - API Service → PostgreSQL, Redis       │
│  - Data Ingestion → InfluxDB, Mosquitto │
│  - Device Mgmt → PostgreSQL, Mosquitto   │
│  - Analytics → InfluxDB                   │
│  - All → DNS                              │
│  - Ingress → API Service                 │
│                                           │
└──────────────────────────────────────────┘
```

### Authentication & Authorization

- **Kubernetes RBAC**: Role-based access control
- **Service Accounts**: Per-service identities
- **Secrets Management**: Kubernetes secrets for credentials
- **TLS/SSL**: Encrypted communication (ingress)

### Security Best Practices

1. Minimal base images (Alpine Linux)
2. Non-root container execution
3. Read-only root filesystems where possible
4. Network policies for pod-to-pod communication
5. Regular security updates
6. Secret rotation

## Monitoring and Observability

### Monitoring Stack

```
┌────────────────────────────────────────────────┐
│              Observability Stack                │
├────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐ │
│  │           Grafana (Visualization)        │ │
│  └───────────┬──────────────────────────────┘ │
│              │ Query                           │
│  ┌───────────▼──────────┐  ┌────────────────┐ │
│  │ Prometheus (Metrics) │  │ Loki (Logs)    │ │
│  └───────────┬──────────┘  └────────┬───────┘ │
│              │ Scrape              │ Push      │
│  ┌───────────▼──────────────────────▼────────┐ │
│  │        Applications & Infrastructure      │ │
│  │  - Services (Metrics endpoints)           │ │
│  │  - Node Exporter (Hardware metrics)       │ │
│  │  - Kube-state-metrics (K8s metrics)       │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└────────────────────────────────────────────────┘
```

### Key Metrics

- **Node Metrics**: CPU, Memory, Disk, Network
- **Pod Metrics**: CPU, Memory, Restarts, Status
- **Service Metrics**: Request rate, Latency, Errors
- **Database Metrics**: Connections, Query time, Storage

### Alert Categories

1. **Critical**: Node down, Service down, Database down
2. **Warning**: High resource usage, High latency
3. **Info**: Scaling events, Deployments

## Scalability Considerations

### Horizontal Pod Autoscaling

```yaml
# Example HPA configuration
- Data Ingestion: 2-5 replicas (CPU threshold: 70%)
- API Service: 2-4 replicas (CPU threshold: 70%)
- Analytics: 1-3 replicas (Memory threshold: 80%)
```

### Vertical Scaling

Limited by node resources (16GB RAM, 4 CPU cores per node)

### Cluster Scaling

- Can add more Raspberry Pi worker nodes
- Current: 5 workers
- Maximum recommended: 10-12 workers (K3s limitation)

### Database Scaling

- **InfluxDB**: Scale vertically or shard by measurement
- **PostgreSQL**: Read replicas for scaling reads
- **Redis**: Cluster mode for scaling (if needed)

### Bottlenecks and Limits

1. **Network**: Gigabit Ethernet (125 MB/s theoretical)
2. **Storage I/O**: M.2 SSD limited by USB 3.0 (~400 MB/s)
3. **CPU**: ARM Cortex-A76 @ 2.4GHz
4. **Memory**: 16GB per node (system uses ~2-4GB)

## Disaster Recovery

### Backup Strategy

1. **Daily**: Database backups (PostgreSQL, InfluxDB)
2. **Hourly**: etcd snapshots
3. **Weekly**: Full system backups

### Recovery Procedures

1. **Single Node Failure**: Automatic pod rescheduling
2. **Master Node Failure**: Restore from etcd backup
3. **Data Loss**: Restore from database backups
4. **Full Cluster Failure**: Rebuild from backups and IaC

### RTO/RPO Targets

- **Recovery Time Objective (RTO)**: 1 hour
- **Recovery Point Objective (RPO)**: 24 hours

## Future Enhancements

1. **HA Master Setup**: 3 master nodes for control plane HA
2. **Service Mesh**: Linkerd or Istio for advanced traffic management
3. **GitOps**: ArgoCD or Flux for declarative deployments
4. **Distributed Storage**: Longhorn or Ceph for replicated storage
5. **Edge Integration**: K3s edge nodes for field deployment
6. **GPU Support**: Coral USB accelerators for ML inference

## References

- [K3s Documentation](https://docs.k3s.io/)
- [Kubernetes Architecture](https://kubernetes.io/docs/concepts/architecture/)
- [Raspberry Pi Documentation](https://www.raspberrypi.org/documentation/)
- [Setup Guide](./SETUP.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
