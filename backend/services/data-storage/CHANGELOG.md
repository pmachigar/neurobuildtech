# Changelog

All notable changes to the time-series sensor data storage system will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-16

### Added - Initial Release

#### Infrastructure
- Docker Compose configuration for InfluxDB 2.7
- Chronograf visualization tool integration
- Health checks for containers
- Volume management for persistent storage
- Network isolation configuration

#### Database Schema
- **LD2410 Presence Sensor Schema**
  - Measurement: `ld2410_presence`
  - Tags: device_id, location, zone, firmware_ver
  - Fields: presence_detected, motion_detected, distance_cm, energy levels, RSSI, battery_level
  - Full schema documentation in `schemas/ld2410-presence-sensor.md`

- **PIR Motion Sensor Schema**
  - Measurement: `pir_motion`
  - Tags: device_id, location, zone, sensor_type, firmware_ver
  - Fields: motion_detected, event_duration_ms, trigger_count, ambient_temp_c, RSSI, battery_level
  - Full schema documentation in `schemas/pir-motion-sensor.md`

- **MQ134 Gas Sensor Schema**
  - Measurement: `mq134_gas`
  - Tags: device_id, location, zone, calibration, firmware_ver
  - Fields: concentration_ppm, gas_type, alarm_triggered, temperature_c, humidity_percent, RSSI, battery_level
  - Full schema documentation in `schemas/mq134-gas-sensor.md`

#### Data Retention Policies
- **Raw Data**: 30 days retention
- **1-Minute Aggregates**: 90 days retention
- **1-Hour Aggregates**: 365 days retention
- **Daily Aggregates**: 5 years (1825 days) retention
- Automated setup script: `scripts/setup-retention-policies.sh`

#### Downsampling Tasks
- 1-minute aggregation task (runs every minute)
- 1-hour aggregation task (runs every hour)
- Daily aggregation task (runs daily)
- Motion event counter task
- Gas concentration peak tracking task
- Occupancy rate calculator task
- Task deployment via migrations or setup script

#### Query Examples
- 100+ example Flux queries across all sensor types
- Basic queries (time-range, device filtering, current status)
- Aggregation queries (averages, counts, statistics)
- Real-time monitoring queries
- Pattern detection queries
- Device health monitoring queries
- Files: `queries/ld2410-examples.flux`, `queries/pir-motion-examples.flux`, `queries/mq134-gas-examples.flux`

#### Backup and Restore
- **Backup Script** (`scripts/backup.sh`)
  - Automated backup with compression
  - Configurable retention period (default 90 days)
  - Backup manifest generation
  - Old backup cleanup
  - Support for scheduled execution

- **Restore Script** (`scripts/restore.sh`)
  - List available backups
  - Selective restore from backup
  - Confirmation prompts for safety
  - Verification after restore

#### Security Features
- Role-based access control (RBAC) support
- Token-based authentication
- Environment variable configuration
- Encryption at rest support
- TLS/HTTPS configuration options
- Audit logging enabled
- Network isolation
- Comprehensive security documentation in `SECURITY.md`

#### Documentation
- **README.md**: Complete system documentation
  - Architecture overview
  - Getting started guide
  - Schema documentation
  - Retention policies
  - Query examples
  - Backup/restore procedures
  - Security guidelines
  - Monitoring and maintenance
  - Troubleshooting guide
  - Performance tuning basics

- **QUICKSTART.md**: 5-minute setup guide
  - Step-by-step installation
  - Environment setup
  - Data write/query examples
  - Verification checklist
  - Common issues and solutions

- **SECURITY.md**: Security best practices
  - Authentication and authorization
  - Encryption (at rest, in transit, in use)
  - Network security
  - Secret management
  - Audit logging
  - Compliance (GDPR, HIPAA)
  - Incident response procedures

- **PERFORMANCE.md**: Performance optimization guide
  - Write performance optimization
  - Query performance best practices
  - Resource allocation guidelines
  - Schema design recommendations
  - Cardinality management
  - Hardware recommendations
  - Monitoring and benchmarking

#### Migration Scripts
- `migrations/001_initial_setup.flux`: Initial bucket creation and configuration
- `migrations/002_setup_downsampling.flux`: Downsampling task definitions

#### Configuration
- `.env.example`: Environment variable template
- Configurable parameters:
  - Admin credentials
  - Organization and bucket names
  - Retention periods
  - Backup settings
  - Host and port configuration

### Technical Specifications

#### Performance Targets
- Write throughput: 10,000+ points/second
- Write latency: < 100ms (p99)
- Query latency (1h range): < 500ms
- Query latency (24h range): < 2s
- Success rate: > 99.9%

#### Storage Efficiency
- Raw data: ~1KB per point
- Compressed: ~250 bytes per point
- Automatic compression enabled
- Efficient time-series storage format

#### Scalability
- Horizontal scaling ready
- Support for clustering (future)
- Partition management
- Automatic data lifecycle management

### Dependencies

#### Runtime Dependencies
- Docker 20.10+
- Docker Compose 2.0+
- InfluxDB 2.7
- Chronograf 1.10

#### Optional Dependencies
- InfluxDB CLI tools (for management)
- Python influxdb-client (for application integration)
- curl (for testing)

### Configuration Files

```
backend/services/data-storage/
├── docker-compose.yml       # Container orchestration
├── .env.example             # Environment template
├── README.md                # Main documentation
├── QUICKSTART.md            # Quick setup guide
├── SECURITY.md              # Security guidelines
├── PERFORMANCE.md           # Performance tuning
├── CHANGELOG.md             # This file
├── schemas/                 # Data schema documentation
├── migrations/              # Database migrations
├── queries/                 # Query examples
└── scripts/                 # Utility scripts
```

### File Counts
- Documentation files: 5
- Schema definitions: 3
- Query example files: 3
- Migration files: 2
- Utility scripts: 3
- Configuration files: 2

### Total Lines of Code
- Documentation: ~3,000 lines
- Queries: ~6,900 lines
- Scripts: ~500 lines
- Configuration: ~200 lines
- **Total**: ~10,600 lines

## Future Enhancements (Planned)

### Version 1.1.0 (Planned)
- [ ] Grafana integration for dashboards
- [ ] Alerting system for threshold breaches
- [ ] Anomaly detection queries
- [ ] Data export utilities
- [ ] Performance monitoring dashboard

### Version 1.2.0 (Planned)
- [ ] High Availability (HA) configuration
- [ ] Multi-node clustering support
- [ ] Automated failover
- [ ] Load balancing configuration
- [ ] Disaster recovery automation

### Version 2.0.0 (Planned)
- [ ] Machine learning integration
- [ ] Predictive analytics
- [ ] Advanced data correlation
- [ ] Multi-tenancy support
- [ ] REST API gateway

## Upgrade Notes

### From None (Initial Installation)
This is the initial release. Follow the [QUICKSTART.md](QUICKSTART.md) guide for installation.

### Database Migration Path
1. Install InfluxDB 2.7 via Docker Compose
2. Run initial setup migration (001_initial_setup.flux)
3. Run downsampling setup (002_setup_downsampling.flux)
4. Configure retention policies via setup script

## Known Issues

### Current Limitations
- Single-node deployment only (clustering support planned for v1.2.0)
- Manual task deployment (automation planned)
- Basic alerting (advanced alerting planned for v1.1.0)

### Compatibility
- Tested with InfluxDB 2.7.x
- Compatible with Flux query language v0.x
- Requires Docker Compose v2.0+

## Support

- **Documentation**: See README.md for comprehensive documentation
- **Issues**: Report issues on GitHub repository
- **Security**: Report security issues to security@neurobuildtech.com
- **Community**: Join discussions in project repository

## Contributors

- NeuroBuild Tech Team - Initial implementation

## License

This project is part of the NeuroBuild Tech platform.

---

For more information, see the [README.md](README.md) file.
