# NeuroBuildTech Backend Security

Comprehensive security implementation for the NeuroBuildTech IoT platform, covering authentication, authorization, encryption, secrets management, and network security.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Directory Structure](#directory-structure)
- [Quick Start](#quick-start)
- [Components](#components)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Security Best Practices](#security-best-practices)
- [Documentation](#documentation)

## 🔒 Overview

This backend security implementation provides enterprise-grade security features including:

- **Authentication**: JWT, OAuth2/OIDC, certificate-based (mTLS)
- **Authorization**: Role-Based Access Control (RBAC)
- **Encryption**: TLS/SSL, data encryption at rest, disk encryption
- **Secrets Management**: HashiCorp Vault integration
- **Network Security**: Network policies, firewall rules, DDoS protection
- **Input Validation**: Schema validation, SQL injection prevention, XSS/CSRF protection
- **Audit & Compliance**: Comprehensive logging, GDPR compliance
- **Monitoring**: Security event monitoring and alerting

## ✨ Features

### Device Authentication and Onboarding
- ✅ Secure device provisioning workflow
- ✅ X.509 certificate management
- ✅ API key generation and rotation
- ✅ Device identity verification
- ✅ Mutual TLS (mTLS) for MQTT
- ✅ Secure credential storage

### API Authentication and Authorization
- ✅ JWT token-based authentication
- ✅ OAuth2/OIDC integration support
- ✅ Role-based access control (RBAC)
  - Admin: full access
  - User: read-only + device management
  - Device: data submission only
- ✅ API key authentication for service-to-service
- ✅ Token refresh and revocation
- ✅ Session management

### Encryption
- ✅ TLS/SSL for all communications
- ✅ End-to-end encryption support
- ✅ Data encryption at rest
  - Database encryption
  - LUKS disk encryption for M.2 SSDs
  - Secrets encryption
- ✅ Certificate management scripts

### Secrets Management
- ✅ HashiCorp Vault configuration
- ✅ Kubernetes Secrets integration
- ✅ Environment variable injection
- ✅ Secrets rotation policies
- ✅ No hardcoded credentials

### Network Security
- ✅ Network segmentation policies
- ✅ Firewall rules (iptables, UFW)
- ✅ Internal service authentication
- ✅ API rate limiting
- ✅ DDoS protection
- ✅ Intrusion detection support

### Input Validation and Sanitization
- ✅ Schema validation for all inputs
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Security headers (HSTS, CSP, etc.)

### Audit and Compliance
- ✅ Comprehensive audit logging
- ✅ Authentication and access tracking
- ✅ Configuration change logging
- ✅ Security event monitoring
- ✅ GDPR compliance support

## 📁 Directory Structure

```
backend/
├── security/
│   ├── certificates/
│   │   ├── ca/                          # Certificate Authority (gitignored)
│   │   ├── devices/                     # Device certificates (gitignored)
│   │   └── generate-certs.sh           # Certificate generation script
│   ├── policies/
│   │   ├── rbac.yaml                    # RBAC policies
│   │   └── network-policies.yaml       # Network security policies
│   ├── vault/
│   │   ├── config.hcl                   # Vault configuration
│   │   └── policies/                    # Vault access policies
│   │       ├── admin-policy.hcl
│   │       ├── app-policy.hcl
│   │       └── device-policy.hcl
│   ├── encryption/
│   │   └── disk-encryption.sh          # LUKS disk encryption script
│   ├── middleware/
│   │   ├── auth.js                      # Authentication middleware
│   │   ├── rateLimit.js                 # Rate limiting middleware
│   │   └── validation.js                # Input validation middleware
│   └── docs/
│       ├── SECURITY.md                  # Security architecture
│       ├── AUTHENTICATION.md            # Authentication flows
│       └── INCIDENT_RESPONSE.md         # Incident response plan
├── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for middleware)
- OpenSSL (for certificate generation)
- cryptsetup (for disk encryption)
- HashiCorp Vault (for secrets management)

### Installation

1. **Install Node.js dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up certificates:**
   ```bash
   cd security/certificates
   ./generate-certs.sh init
   ```

3. **Configure Vault (optional):**
   ```bash
   vault server -config=security/vault/config.hcl
   ```

4. **Set environment variables:**
   ```bash
   export JWT_SECRET="your-secret-key"
   export JWT_EXPIRES_IN="24h"
   export OAUTH2_CLIENT_ID="your-client-id"
   export OAUTH2_CLIENT_SECRET="your-client-secret"
   ```

## 🔧 Components

### 1. Authentication Middleware

```javascript
const { authenticate, authorize, ROLES } = require('./security/middleware/auth');

// Protect routes with JWT authentication
app.get('/api/devices', authenticate, (req, res) => {
  // req.user contains authenticated user info
  res.json({ devices: [] });
});

// Restrict access by role
app.post('/api/admin/settings', 
  authenticate, 
  authorize('admin'), 
  (req, res) => {
    // Only admins can access
  }
);
```

### 2. Rate Limiting

```javascript
const { createRateLimiter } = require('./security/middleware/rateLimit');

// Apply rate limiting to routes
const limiter = createRateLimiter('moderate');
app.use('/api', limiter.middleware());

// Strict rate limiting for auth endpoints
const authLimiter = createRateLimiter('auth');
app.use('/api/auth', authLimiter.middleware());
```

### 3. Input Validation

```javascript
const { SchemaValidator, SecurityHeaders } = require('./security/middleware/validation');

// Apply security headers
app.use(SecurityHeaders.middleware());

// Validate request body
const userSchema = {
  email: { type: 'string', pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/ },
  name: { type: 'string', minLength: 2, maxLength: 100 },
  role: { type: 'string', enum: ['admin', 'user', 'device'] }
};

app.post('/api/users', 
  SchemaValidator.middleware(userSchema, { body: true }),
  (req, res) => {
    // Input is validated
  }
);
```

### 4. Certificate Management

```bash
# Initialize Certificate Authority
./security/certificates/generate-certs.sh init

# Generate device certificate
./security/certificates/generate-certs.sh generate device-001

# Verify certificate
./security/certificates/generate-certs.sh verify ./devices/device-001/device.crt

# Revoke certificate
./security/certificates/generate-certs.sh revoke device-001
```

### 5. Disk Encryption

```bash
# Setup LUKS encryption on device
sudo ./security/encryption/disk-encryption.sh setup /dev/nvme0n1 encrypted-data

# Open encrypted device
sudo ./security/encryption/disk-encryption.sh open /dev/nvme0n1 encrypted-data

# Mount encrypted device
sudo ./security/encryption/disk-encryption.sh mount encrypted-data /mnt/secure

# Backup LUKS header
sudo ./security/encryption/disk-encryption.sh backup-header /dev/nvme0n1 header-backup.img
```

## ⚙️ Configuration

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# OAuth2 Configuration
OAUTH2_ENABLED=true
OAUTH2_PROVIDER=keycloak
OAUTH2_CLIENT_ID=your-client-id
OAUTH2_CLIENT_SECRET=your-client-secret
OAUTH2_ISSUER_URL=https://auth.provider.com

# Vault Configuration
VAULT_ADDR=https://vault.neurobuildtech.local:8200
VAULT_TOKEN=your-vault-token

# Security Settings
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Kubernetes RBAC

Apply RBAC policies:
```bash
kubectl apply -f security/policies/rbac.yaml
```

### Network Policies

Apply network policies:
```bash
kubectl apply -f security/policies/network-policies.yaml
```

### Vault Policies

Initialize Vault and apply policies:
```bash
vault policy write admin security/vault/policies/admin-policy.hcl
vault policy write app security/vault/policies/app-policy.hcl
vault policy write device security/vault/policies/device-policy.hcl
```

## 📖 Usage Examples

### Complete Express.js Integration

```javascript
const express = require('express');
const { authenticate, authorize } = require('./security/middleware/auth');
const { createRateLimiter, DDoSProtection } = require('./security/middleware/rateLimit');
const { SecurityHeaders, SQLInjectionProtection, XSSProtection } = require('./security/middleware/validation');

const app = express();

// Apply security headers
app.use(SecurityHeaders.middleware());

// Apply DDoS protection
const ddos = new DDoSProtection();
app.use(ddos.middleware());

// Apply rate limiting
const limiter = createRateLimiter('moderate');
app.use('/api', limiter.middleware());

// Apply input sanitization
app.use(SQLInjectionProtection.middleware());
app.use(XSSProtection.middleware());

// Public endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Protected endpoint - requires authentication
app.get('/api/devices', authenticate, (req, res) => {
  res.json({ devices: [] });
});

// Admin-only endpoint
app.post('/api/admin/users', authenticate, authorize('admin'), (req, res) => {
  res.json({ message: 'User created' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Device Authentication Example

```javascript
const mqtt = require('mqtt');
const fs = require('fs');

// Connect with mTLS
const options = {
  host: 'mqtt.neurobuildtech.com',
  port: 8883,
  protocol: 'mqtts',
  clientId: 'device-001',
  cert: fs.readFileSync('./security/certificates/devices/device-001/device.crt'),
  key: fs.readFileSync('./security/certificates/devices/device-001/device.key'),
  ca: fs.readFileSync('./security/certificates/ca/ca.crt'),
  rejectUnauthorized: true
};

const client = mqtt.connect(options);

client.on('connect', () => {
  console.log('Connected with mTLS');
  client.publish('devices/device-001/telemetry', JSON.stringify({
    temperature: 25.5,
    timestamp: Date.now()
  }));
});
```

## 🛡️ Security Best Practices

### For Developers

1. **Never commit secrets** - Use environment variables or Vault
2. **Always validate input** - Use schema validation middleware
3. **Use parameterized queries** - Prevent SQL injection
4. **Apply rate limiting** - Protect against abuse
5. **Enable authentication** - Protect all sensitive endpoints
6. **Use HTTPS/TLS** - Encrypt all communications
7. **Keep dependencies updated** - Regularly run `npm audit`

### For Operators

1. **Rotate secrets regularly** - Follow rotation policies
2. **Monitor security events** - Review audit logs
3. **Apply security patches** - Keep systems updated
4. **Test backups** - Ensure recovery procedures work
5. **Conduct security audits** - Regular vulnerability assessments
6. **Train staff** - Security awareness training
7. **Document incidents** - Follow incident response plan

### For Administrators

1. **Principle of least privilege** - Grant minimal necessary permissions
2. **Enable MFA** - Require multi-factor authentication
3. **Review access logs** - Regular audit reviews
4. **Manage certificates** - Track expiration and renewal
5. **Backup encryption keys** - Secure key storage
6. **Test disaster recovery** - Regular recovery drills
7. **Maintain documentation** - Keep security docs updated

## 📚 Documentation

- [Security Architecture](./security/docs/SECURITY.md) - Comprehensive security overview
- [Authentication Flow](./security/docs/AUTHENTICATION.md) - Authentication implementation details
- [Incident Response Plan](./security/docs/INCIDENT_RESPONSE.md) - Security incident procedures

## 🔐 Security Contacts

- **Security Team**: security@neurobuildtech.com
- **Incident Response**: incident@neurobuildtech.com
- **Vulnerability Reports**: vulnerability@neurobuildtech.com

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Security contributions are welcome! Please:
1. Review security documentation
2. Follow secure coding practices
3. Test thoroughly
4. Document security implications
5. Report vulnerabilities privately

---

**Last Updated**: 2025-10-16  
**Version**: 1.0.0
