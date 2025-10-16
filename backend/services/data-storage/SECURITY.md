# Security Guidelines

## Overview

This document outlines security best practices for the InfluxDB time-series sensor data storage system.

## Table of Contents

1. [Authentication and Authorization](#authentication-and-authorization)
2. [Encryption](#encryption)
3. [Network Security](#network-security)
4. [Secret Management](#secret-management)
5. [Audit Logging](#audit-logging)
6. [Compliance](#compliance)
7. [Incident Response](#incident-response)

## Authentication and Authorization

### Role-Based Access Control (RBAC)

**Principle of Least Privilege**: Grant users only the permissions they need.

#### Admin Role
Full administrative access:
```bash
influx user create --name admin_user --org neurobuildtech
influx auth create --user admin_user --org neurobuildtech --all-access
```

#### Read-Only Role
Query access only:
```bash
influx user create --name analyst_user --org neurobuildtech
influx auth create \
  --user analyst_user \
  --read-bucket sensor_data \
  --read-bucket sensor_data_1m \
  --read-bucket sensor_data_1h \
  --read-bucket sensor_data_1d
```

#### Write-Only Role
Data ingestion access:
```bash
influx user create --name iot_device --org neurobuildtech
influx auth create \
  --user iot_device \
  --write-bucket sensor_data
```

#### Application Role
Specific bucket access for applications:
```bash
influx user create --name dashboard_app --org neurobuildtech
influx auth create \
  --user dashboard_app \
  --read-bucket sensor_data \
  --read-bucket sensor_data_1h
```

### Token Management

**Best Practices**:
1. Generate unique tokens per application/service
2. Rotate tokens regularly (every 90 days minimum)
3. Revoke unused or compromised tokens immediately
4. Never commit tokens to version control
5. Use token descriptions to track usage

**Generate a token**:
```bash
influx auth create \
  --org neurobuildtech \
  --description "Dashboard App - Created 2025-10-16" \
  --read-bucket sensor_data \
  --write-bucket sensor_data
```

**Revoke a token**:
```bash
influx auth delete --id <auth-id>
```

**List active tokens**:
```bash
influx auth list --org neurobuildtech --json
```

### Password Policies

**Requirements**:
- Minimum 16 characters
- Mix of uppercase, lowercase, numbers, and symbols
- No dictionary words
- No reuse of last 5 passwords
- Change every 90 days

**Generate secure password**:
```bash
openssl rand -base64 32
```

## Encryption

### Encryption in Transit (TLS/HTTPS)

**1. Generate TLS Certificates**:
```bash
# Self-signed certificate (development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/influxdb.key \
  -out /etc/ssl/influxdb.crt

# Production: Use Let's Encrypt or organizational CA
certbot certonly --standalone -d influxdb.yourdomain.com
```

**2. Configure InfluxDB for HTTPS**:
```yaml
# docker-compose.yml
services:
  influxdb:
    environment:
      - INFLUXDB_HTTP_HTTPS_ENABLED=true
      - INFLUXDB_HTTP_HTTPS_CERTIFICATE=/etc/ssl/influxdb.crt
      - INFLUXDB_HTTP_HTTPS_PRIVATE_KEY=/etc/ssl/influxdb.key
    volumes:
      - /etc/ssl/influxdb.crt:/etc/ssl/influxdb.crt:ro
      - /etc/ssl/influxdb.key:/etc/ssl/influxdb.key:ro
    ports:
      - "8086:8086"
```

**3. Force HTTPS Only**:
```yaml
environment:
  - INFLUXDB_HTTP_HTTPS_ENABLED=true
  - INFLUXDB_HTTP_BIND_ADDRESS=:8086
```

### Encryption at Rest

**Option 1: Filesystem Encryption (Recommended)**
```bash
# Linux - LUKS encryption
cryptsetup luksFormat /dev/sdb1
cryptsetup open /dev/sdb1 encrypted_volume
mkfs.ext4 /dev/mapper/encrypted_volume
mount /dev/mapper/encrypted_volume /var/lib/influxdb2
```

**Option 2: Docker Volume Encryption**
```bash
# Use encrypted Docker volumes
docker volume create --driver local \
  --opt type=none \
  --opt device=/encrypted/path \
  --opt o=bind \
  influxdb-data-encrypted
```

**Option 3: Cloud Provider Encryption**
```yaml
# AWS EBS encryption
# Azure Disk Encryption
# GCP Persistent Disk encryption
# Enable at infrastructure level
```

### Data-in-Use Encryption

For highly sensitive environments, consider:
- Confidential Computing (Intel SGX, AMD SEV)
- Homomorphic Encryption for specific queries
- Hardware Security Modules (HSM) for key management

## Network Security

### Firewall Rules

**Host Firewall (iptables/ufw)**:
```bash
# Allow only specific IPs to access InfluxDB
ufw allow from 10.0.0.0/8 to any port 8086 proto tcp
ufw deny 8086

# Allow access from application servers only
iptables -A INPUT -p tcp -s 10.0.1.100 --dport 8086 -j ACCEPT
iptables -A INPUT -p tcp --dport 8086 -j DROP
```

### Docker Network Isolation

**Internal Network (Recommended)**:
```yaml
# docker-compose.yml
networks:
  influxdb_internal:
    internal: true  # No external connectivity
  app_network:
    driver: bridge

services:
  influxdb:
    networks:
      - influxdb_internal
      - app_network
    # No ports exposed externally
```

**Reverse Proxy**:
```yaml
# Use nginx/traefik as reverse proxy
services:
  nginx:
    ports:
      - "443:443"
    networks:
      - app_network
  
  influxdb:
    networks:
      - app_network
    # No direct external access
```

### API Security

**Rate Limiting**:
```nginx
# nginx rate limiting
limit_req_zone $binary_remote_addr zone=influxdb:10m rate=100r/s;

location /api/v2/write {
    limit_req zone=influxdb burst=200;
    proxy_pass http://influxdb:8086;
}
```

**IP Whitelisting**:
```nginx
# Allow specific IPs only
location /api/v2/ {
    allow 10.0.0.0/8;
    allow 192.168.1.0/24;
    deny all;
    
    proxy_pass http://influxdb:8086;
}
```

## Secret Management

### Environment Variables

**Never commit secrets**:
```bash
# .env file (add to .gitignore)
INFLUXDB_ADMIN_TOKEN=$(openssl rand -hex 32)
INFLUXDB_ADMIN_PASSWORD=$(openssl rand -base64 32)
```

### Docker Secrets

**Using Docker Swarm secrets**:
```yaml
# docker-compose.yml
secrets:
  influxdb_admin_token:
    external: true
  influxdb_admin_password:
    external: true

services:
  influxdb:
    secrets:
      - influxdb_admin_token
      - influxdb_admin_password
    environment:
      - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN_FILE=/run/secrets/influxdb_admin_token
      - DOCKER_INFLUXDB_INIT_PASSWORD_FILE=/run/secrets/influxdb_admin_password
```

**Create secrets**:
```bash
echo "your-super-secret-token" | docker secret create influxdb_admin_token -
echo "your-admin-password" | docker secret create influxdb_admin_password -
```

### HashiCorp Vault Integration

**Store secrets in Vault**:
```bash
# Write secret to Vault
vault kv put secret/influxdb \
  admin_token="your-token" \
  admin_password="your-password"

# Read secret from Vault
vault kv get -field=admin_token secret/influxdb
```

**Application integration**:
```python
import hvac

# Authenticate to Vault
client = hvac.Client(url='https://vault.example.com')
client.token = vault_token

# Retrieve InfluxDB credentials
secret = client.secrets.kv.v2.read_secret_version(path='influxdb')
influxdb_token = secret['data']['data']['admin_token']
```

## Audit Logging

### Enable Query Logging

```yaml
# docker-compose.yml
environment:
  - INFLUXDB_DATA_QUERY_LOG_ENABLED=true
  - INFLUXDB_HTTP_LOG_ENABLED=true
```

### Monitor Access Logs

**View logs**:
```bash
# Real-time monitoring
docker-compose logs -f influxdb | grep -E "QUERY|POST|GET"

# Export logs
docker-compose logs --since 24h influxdb > audit_$(date +%Y%m%d).log
```

### Centralized Logging

**Send to syslog/ELK/Splunk**:
```yaml
# docker-compose.yml
services:
  influxdb:
    logging:
      driver: syslog
      options:
        syslog-address: "tcp://logserver:514"
        tag: "influxdb"
```

### Audit Events to Monitor

- Authentication attempts (success/failure)
- Authorization failures
- Data access patterns
- Configuration changes
- User/token creation/deletion
- Bucket operations
- Task modifications

## Compliance

### GDPR Compliance

**Data Minimization**:
- Store only necessary sensor data
- Implement data retention policies
- Provide data export capabilities

**Right to Erasure**:
```flux
// Delete specific device data
from(bucket: "sensor_data")
  |> range(start: -90d)
  |> filter(fn: (r) => r["device_id"] == "device-to-delete")
  |> delete()
```

**Data Portability**:
```bash
# Export user data
influx query "
from(bucket: \"sensor_data\")
  |> range(start: -90d)
  |> filter(fn: (r) => r[\"device_id\"] == \"user-device\")
" --raw > user_data.csv
```

### HIPAA Compliance (if applicable)

- Enable encryption at rest and in transit
- Implement comprehensive audit logging
- Control physical access to servers
- Business Associate Agreements (BAA)
- Regular security assessments

### Data Residency

**Ensure data stays in required geography**:
```yaml
# Deploy in specific regions
# AWS: us-east-1, eu-west-1, ap-southeast-1
# Azure: East US, West Europe, Southeast Asia
# GCP: us-central1, europe-west1, asia-east1
```

## Incident Response

### Security Incident Procedures

**1. Detection**:
- Monitor unusual access patterns
- Alert on failed authentication attempts
- Track data export volumes

**2. Containment**:
```bash
# Immediately revoke compromised tokens
influx auth delete --id <compromised-token-id>

# Disable user account
influx user update --id <user-id> --inactive

# Block IP at firewall
ufw deny from <malicious-ip>
```

**3. Investigation**:
```bash
# Review audit logs
docker-compose logs influxdb --since 24h | grep -i "error\|fail"

# Check active sessions
influx auth list --org neurobuildtech
influx user list
```

**4. Recovery**:
```bash
# Restore from backup if needed
./scripts/restore.sh --file /backups/latest_backup.tar.gz

# Reset all tokens
influx auth list --json | jq -r '.[] | .id' | xargs -I {} influx auth delete --id {}

# Force password reset for all users
# (done manually per user)
```

**5. Post-Incident**:
- Document the incident
- Update security measures
- Conduct security training
- Review and update policies

### Backup Security

**Encrypt backups**:
```bash
# Encrypt backup with GPG
gpg --symmetric --cipher-algo AES256 backup.tar.gz

# Decrypt when needed
gpg --decrypt backup.tar.gz.gpg > backup.tar.gz
```

**Secure backup storage**:
```bash
# Upload to S3 with encryption
aws s3 cp backup.tar.gz.gpg s3://backups/ \
  --sse AES256 \
  --acl private
```

## Security Checklist

### Initial Setup
- [ ] Generate strong admin password
- [ ] Create unique admin token
- [ ] Configure TLS/HTTPS
- [ ] Enable encryption at rest
- [ ] Configure firewall rules
- [ ] Set up network isolation
- [ ] Enable audit logging
- [ ] Configure backup encryption

### Regular Maintenance
- [ ] Rotate tokens quarterly
- [ ] Review user access monthly
- [ ] Update InfluxDB to latest version
- [ ] Review audit logs weekly
- [ ] Test backup restoration monthly
- [ ] Update TLS certificates before expiry
- [ ] Review and update firewall rules
- [ ] Security vulnerability scanning

### Monitoring
- [ ] Alert on failed authentication
- [ ] Monitor unusual query patterns
- [ ] Track data export volumes
- [ ] Monitor system resources
- [ ] Alert on backup failures
- [ ] Track API usage patterns

## Contact

**Security Issues**: Report to security@neurobuildtech.com  
**Urgent Incidents**: Contact the security team immediately

## References

- [InfluxDB Security Best Practices](https://docs.influxdata.com/influxdb/v2.7/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-16
