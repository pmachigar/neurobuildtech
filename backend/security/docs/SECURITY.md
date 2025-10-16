# Security Architecture Documentation

## Overview

This document outlines the comprehensive security architecture for the NeuroBuildTech IoT platform. The security implementation follows defense-in-depth principles and industry best practices.

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [Encryption](#encryption)
5. [Network Security](#network-security)
6. [Secrets Management](#secrets-management)
7. [Input Validation](#input-validation)
8. [Audit and Compliance](#audit-and-compliance)
9. [Security Monitoring](#security-monitoring)
10. [Backup Security](#backup-security)
11. [Best Practices](#best-practices)

## Security Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTPS/TLS
                 │
┌────────────────▼────────────────────────────────────────────┐
│                    API Gateway (DMZ)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - TLS Termination                                   │   │
│  │  - Rate Limiting                                     │   │
│  │  - DDoS Protection                                   │   │
│  │  - JWT Validation                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ mTLS
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Application Tier (Private Network)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Backend Services                                    │   │
│  │  - Authentication Service                            │   │
│  │  - Device Management                                 │   │
│  │  - Data Ingestion                                    │   │
│  │  - RBAC Enforcement                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Encrypted Connection
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Data Tier (Isolated Network)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - PostgreSQL/TimescaleDB (Encrypted at rest)       │   │
│  │  - Redis (Encrypted)                                 │   │
│  │  - LUKS Encrypted Disks                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Security Zones

1. **DMZ (Demilitarized Zone)**
   - Public-facing services
   - API Gateway
   - Web frontend
   - Heavy rate limiting and DDoS protection

2. **Application Tier**
   - Backend services
   - Authentication service
   - MQTT broker
   - Internal service authentication required

3. **Data Tier**
   - Databases (PostgreSQL, TimescaleDB)
   - Cache (Redis)
   - Storage services
   - Access only from application tier

4. **Management Tier**
   - Monitoring (Prometheus, Grafana)
   - Secrets management (Vault)
   - Administrative tools
   - Restricted access

## Authentication

### User Authentication

#### JWT Token-Based Authentication

- **Access Tokens**: Short-lived (24 hours)
- **Refresh Tokens**: Long-lived (7 days)
- **Token Rotation**: Automatic refresh before expiration
- **Token Revocation**: Blacklist support for compromised tokens

```javascript
// Example: Authenticating a request
const token = generateAccessToken(userId, role);
// Token includes: user ID, role, expiration, issuer
```

#### OAuth2/OIDC Integration

Support for external identity providers:
- Keycloak
- Auth0
- Azure AD
- Google Identity Platform

### Device Authentication

#### Certificate-Based Authentication (X.509)

- Each device has a unique certificate
- Mutual TLS (mTLS) for MQTT connections
- Certificate rotation every 365 days
- Certificate Revocation List (CRL) maintained

```bash
# Generate device certificate
./backend/security/certificates/generate-certs.sh generate device-001
```

#### Device Provisioning Workflow

1. Device registration request with device ID
2. Identity verification
3. Certificate generation and signing by CA
4. Secure certificate delivery
5. Device activation and first connection

### API Key Authentication

For service-to-service authentication:
- SHA-256 hashed API keys
- Key rotation policy (90 days)
- Scoped permissions per API key

## Authorization

### Role-Based Access Control (RBAC)

#### Roles

1. **Admin**
   - Full system access
   - User management
   - System configuration
   - Security settings

2. **User**
   - Read-only access to data
   - Device management (CRUD)
   - Dashboard access
   - Profile management

3. **Device**
   - Data submission only
   - Status updates
   - Configuration retrieval

4. **Read-Only**
   - View data and dashboards
   - No write permissions

5. **Operator**
   - System monitoring
   - Device management
   - Log access

#### Permission Model

Permissions follow the format: `resource:action`

Examples:
- `devices:read`
- `devices:create`
- `data:write`
- `users:delete`
- `system:*` (admin only)

### Kubernetes RBAC

Network policies and service accounts defined in:
- `backend/security/policies/rbac.yaml`
- `backend/security/policies/network-policies.yaml`

## Encryption

### Transport Layer Security (TLS)

- **TLS 1.2/1.3** only
- Strong cipher suites
- Let's Encrypt for SSL certificates
- Automatic certificate renewal
- HSTS enabled

### Data Encryption at Rest

#### Database Encryption

- PostgreSQL: Transparent Data Encryption (TDE)
- Column-level encryption for sensitive fields
- Backup encryption

#### Disk Encryption

- LUKS encryption for M.2 SSDs
- AES-256-XTS encryption
- Secure key management

```bash
# Setup disk encryption
./backend/security/encryption/disk-encryption.sh setup /dev/nvme0n1 secure-data
```

#### Application-Level Encryption

- Transit encryption for sensitive data
- Field-level encryption using Vault
- End-to-end encryption for sensitive communications

### Certificate Management

- Certificate Authority (CA) for device certificates
- Cert-manager for Kubernetes certificate automation
- Certificate rotation and renewal policies

## Network Security

### Network Segmentation

- VLANs for different security zones
- Kubernetes NetworkPolicies
- Firewall rules (iptables/UFW)
- Service mesh (optional: Istio/Linkerd)

### Firewall Rules

Implemented firewall rules:
- Default deny all inbound
- Allow established connections
- SSH with rate limiting (max 4 attempts/minute)
- HTTPS/HTTP with rate limiting
- MQTT over TLS (port 8883)
- Block common attack patterns

```bash
# Apply firewall rules
iptables-restore < backend/security/policies/firewall-rules.conf
```

### DDoS Protection

- Rate limiting per IP
- Request throttling
- Connection limits
- Automatic IP blocking for suspicious activity

### Intrusion Detection

- fail2ban configuration
- Anomaly detection
- Failed authentication monitoring
- Automated incident response

## Secrets Management

### HashiCorp Vault

Centralized secrets storage and management:

#### Configuration

```hcl
# See: backend/security/vault/config.hcl
```

#### Secret Types

1. **Application Secrets**
   - Database credentials
   - API keys
   - Service credentials

2. **Device Secrets**
   - Device certificates
   - Device-specific configuration

3. **Encryption Keys**
   - Transit encryption keys
   - Data encryption keys

#### Access Policies

- Admin: Full access
- Application: Read application secrets
- Device: Read device-specific secrets

### Secrets Rotation

- **Database Passwords**: 90 days
- **API Keys**: 90 days
- **Device Certificates**: 365 days
- **Encryption Keys**: On-demand

### Environment Variables

Secrets injected via:
- Kubernetes Secrets
- Vault Agent Injector
- Sealed Secrets (GitOps)

## Input Validation

### Schema Validation

All API inputs validated against schemas:
- Type checking
- Length validation
- Pattern matching
- Enum validation

```javascript
const userSchema = {
  email: { type: 'string', pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/ },
  name: { type: 'string', minLength: 2, maxLength: 100 },
  role: { type: 'string', enum: ['admin', 'user', 'device'] }
};
```

### Security Protections

1. **SQL Injection Prevention**
   - Parameterized queries
   - Input sanitization
   - Pattern detection

2. **XSS Protection**
   - Input sanitization
   - Output encoding
   - Content Security Policy headers

3. **CSRF Protection**
   - Token-based protection
   - SameSite cookies
   - Double submit cookies

## Audit and Compliance

### Audit Logging

All security-relevant events logged:

1. **Authentication Events**
   - Login attempts (success/failure)
   - Token generation/refresh/revocation
   - Password changes
   - MFA events

2. **Authorization Events**
   - Access denials
   - Permission changes
   - Role assignments

3. **Data Access**
   - Sensitive data queries
   - Data exports
   - Data modifications
   - Data deletions

4. **Configuration Changes**
   - Security settings
   - User permissions
   - System configuration

5. **Security Events**
   - Failed authentication attempts
   - Rate limit violations
   - Blocked IPs
   - Certificate revocations

### Log Format

```json
{
  "timestamp": "2025-10-16T18:49:17Z",
  "event_type": "authentication",
  "action": "login",
  "result": "success",
  "user_id": "user-123",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "metadata": {
    "method": "jwt",
    "mfa_used": true
  }
}
```

### Log Retention

- Security logs: 1 year
- Audit logs: 7 years (compliance)
- Access logs: 90 days
- Application logs: 30 days

### GDPR Compliance

- Data minimization
- Purpose limitation
- Right to access
- Right to erasure
- Data portability
- Consent management
- Data breach notification (72 hours)

## Security Monitoring

### Real-Time Monitoring

- Failed authentication attempts
- Anomalous access patterns
- Rate limit violations
- Certificate expiration
- Unusual data access patterns

### Alerting

Alert conditions:
- 5+ failed login attempts in 5 minutes
- Suspected SQL injection attempts
- DDoS attack patterns
- Certificate expiration within 30 days
- Unusual data export volume
- Unauthorized access attempts

### Vulnerability Scanning

- Container image scanning (Trivy, Clair)
- Dependency scanning (npm audit, Snyk)
- Infrastructure scanning (OpenVAS)
- Penetration testing (quarterly)

## Backup Security

### Encrypted Backups

- All backups encrypted with AES-256
- Separate encryption keys
- Keys stored in Vault

### Backup Strategy

- **Database**: Continuous replication + daily snapshots
- **Configuration**: Daily backups
- **Secrets**: Vault snapshots (encrypted)
- **Application Data**: Incremental backups

### Backup Storage

- Off-site storage
- Geographic redundancy
- Access control
- Integrity verification (checksums)

### Recovery Testing

- Monthly backup restoration tests
- Documented recovery procedures
- RTO: 4 hours
- RPO: 1 hour

## Best Practices

### Development

1. **Never hardcode credentials**
2. **Use parameterized queries**
3. **Validate all inputs**
4. **Apply principle of least privilege**
5. **Keep dependencies updated**
6. **Review security headers**
7. **Implement rate limiting**

### Deployment

1. **Use secrets management**
2. **Enable TLS everywhere**
3. **Apply network policies**
4. **Configure firewall rules**
5. **Enable audit logging**
6. **Implement monitoring**
7. **Regular security updates**

### Operations

1. **Monitor security events**
2. **Review audit logs**
3. **Rotate secrets regularly**
4. **Update certificates**
5. **Patch vulnerabilities promptly**
6. **Test backups regularly**
7. **Conduct security training**

## Security Contacts

- **Security Team**: security@neurobuildtech.com
- **Incident Response**: incident@neurobuildtech.com
- **Vulnerability Reports**: vulnerability@neurobuildtech.com

## References

- [Authentication Flow](./AUTHENTICATION.md)
- [Incident Response Plan](./INCIDENT_RESPONSE.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
