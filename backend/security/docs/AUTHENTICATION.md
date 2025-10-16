# Authentication Flow Documentation

## Overview

This document describes the authentication and authorization flows for the NeuroBuildTech platform, covering user authentication, device authentication, and API authentication.

## Table of Contents

1. [User Authentication](#user-authentication)
2. [Device Authentication](#device-authentication)
3. [API Authentication](#api-authentication)
4. [Token Management](#token-management)
5. [Session Management](#session-management)
6. [Multi-Factor Authentication](#multi-factor-authentication)
7. [OAuth2/OIDC Integration](#oauth2oidc-integration)

## User Authentication

### JWT Token-Based Authentication Flow

```
┌─────────┐                                        ┌─────────────────┐
│ Client  │                                        │  Auth Service   │
└────┬────┘                                        └────────┬────────┘
     │                                                      │
     │ 1. POST /auth/login                                 │
     │    { username, password }                           │
     ├────────────────────────────────────────────────────▶│
     │                                                      │
     │                              2. Validate credentials│
     │                                  Check user in DB   │
     │                                  Hash password      │
     │                                                      │
     │ 3. Return tokens                                    │
     │    { accessToken, refreshToken, expiresIn }         │
     │◀────────────────────────────────────────────────────┤
     │                                                      │
     │ 4. Store tokens securely                            │
     │    (localStorage/sessionStorage)                    │
     │                                                      │
     │                                                      │
     │ 5. API Request with token                           │
     │    Authorization: Bearer <accessToken>              │
     ├────────────────────────────────────────────────────▶│
     │                                                      │
     │                              6. Validate token      │
     │                                  Verify signature   │
     │                                  Check expiration   │
     │                                  Check blacklist    │
     │                                                      │
     │ 7. Return protected resource                        │
     │◀────────────────────────────────────────────────────┤
     │                                                      │
```

### Login Endpoint

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "user",
    "permissions": ["read", "device:manage"]
  }
}
```

### Token Structure

JWT tokens contain:

```json
{
  "sub": "user-123",
  "role": "user",
  "type": "access",
  "iat": 1697472557,
  "exp": 1697558957,
  "iss": "neurobuildtech",
  "aud": "neurobuildtech-api"
}
```

### Protected Endpoint Usage

**Request:**
```http
GET /api/v1/devices
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "devices": [...]
}
```

**Response (Unauthorized):**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

## Device Authentication

### Certificate-Based Authentication (mTLS)

```
┌─────────┐                                        ┌─────────────────┐
│ Device  │                                        │  MQTT Broker    │
└────┬────┘                                        └────────┬────────┘
     │                                                      │
     │ 1. TLS Handshake                                    │
     ├────────────────────────────────────────────────────▶│
     │                                                      │
     │                              2. Request client cert │
     │◀────────────────────────────────────────────────────┤
     │                                                      │
     │ 3. Send device certificate                          │
     │    + CA-signed certificate                          │
     ├────────────────────────────────────────────────────▶│
     │                                                      │
     │                              4. Verify certificate  │
     │                                  - Check signature  │
     │                                  - Check expiration │
     │                                  - Check CRL        │
     │                                  - Verify CN/SAN    │
     │                                                      │
     │ 5. TLS established                                  │
     │◀────────────────────────────────────────────────────┤
     │                                                      │
     │ 6. MQTT CONNECT                                     │
     │    { clientId: "device-001" }                       │
     ├────────────────────────────────────────────────────▶│
     │                                                      │
     │                              7. Authorize device    │
     │                                  Match cert CN      │
     │                                  Check permissions  │
     │                                                      │
     │ 8. CONNACK                                          │
     │◀────────────────────────────────────────────────────┤
     │                                                      │
```

### Device Provisioning Workflow

#### 1. Device Registration

**Request:**
```http
POST /api/v1/devices/register
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "deviceId": "device-001",
  "deviceType": "sensor",
  "metadata": {
    "location": "Building A, Floor 2",
    "owner": "user-123"
  }
}
```

**Response:**
```json
{
  "deviceId": "device-001",
  "status": "pending",
  "provisioningToken": "temp-token-xyz",
  "expiresAt": "2025-10-17T18:49:17Z"
}
```

#### 2. Certificate Generation

```bash
# Generate device certificate using provided script
./backend/security/certificates/generate-certs.sh generate device-001
```

This creates:
- `device.key` - Private key (keep secure!)
- `device.crt` - Public certificate
- `ca.crt` - CA certificate for verification
- `bundle.crt` - Full certificate chain

#### 3. Device Configuration

Device receives:
```json
{
  "deviceId": "device-001",
  "mqttBroker": "mqtt.neurobuildtech.com",
  "mqttPort": 8883,
  "certificate": "<device.crt>",
  "privateKey": "<device.key>",
  "caCertificate": "<ca.crt>",
  "topics": {
    "telemetry": "devices/device-001/telemetry",
    "commands": "devices/device-001/commands",
    "status": "devices/device-001/status"
  }
}
```

#### 4. First Connection

Device connects to MQTT broker with:
- Client certificate (device.crt)
- Private key (device.key)
- CA certificate (ca.crt)
- Client ID (device-001)

#### 5. Device Activation

After successful connection:
```http
POST /api/v1/devices/device-001/activate
Authorization: Bearer <admin-token>

{
  "status": "active"
}
```

### Certificate Rotation

#### Automated Rotation (30 days before expiry)

1. Backend generates new certificate
2. New certificate pushed to device via secure channel
3. Device loads new certificate
4. Old certificate revoked after grace period

#### Manual Rotation

```bash
# Generate new certificate
./backend/security/certificates/generate-certs.sh generate device-001

# Revoke old certificate
./backend/security/certificates/generate-certs.sh revoke device-001-old
```

## API Authentication

### API Key Authentication

For service-to-service communication:

**Request:**
```http
GET /api/v1/internal/metrics
X-API-Key: nbt_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Response:**
```json
{
  "metrics": [...]
}
```

### API Key Generation

```javascript
const { generateApiKey } = require('./middleware/auth');

const apiKey = generateApiKey('analytics-service', {
  description: 'Analytics service API key',
  permissions: ['metrics:read', 'logs:read']
});

console.log('API Key:', apiKey.key);
console.log('Hash (store this):', apiKey.hash);
```

### API Key Format

```
nbt_<env>_<32-byte-base64url>

Examples:
- nbt_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
- nbt_test_x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6
- nbt_dev_p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6
```

## Token Management

### Token Refresh

When access token expires:

**Request:**
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

### Token Revocation

**Request:**
```http
POST /api/v1/auth/revoke
Authorization: Bearer <token-to-revoke>
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "message": "Token revoked successfully"
}
```

### Logout

**Request:**
```http
POST /api/v1/auth/logout
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

This will:
1. Add access token to blacklist
2. Invalidate refresh token
3. Clear session (if using sessions)

## Session Management

### Session Creation

```javascript
const { sessionManager } = require('./middleware/auth');

const sessionId = sessionManager.createSession(userId, {
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

### Session Validation

```javascript
const session = sessionManager.getSession(sessionId);

if (!session) {
  // Session expired or invalid
  return res.status(401).json({ error: 'Session expired' });
}
```

### Session Configuration

- **Timeout**: 30 minutes of inactivity
- **Max Sessions**: 5 per user
- **Storage**: In-memory (development), Redis (production)

## Multi-Factor Authentication

### MFA Enrollment Flow

```
┌─────────┐                                        ┌─────────────────┐
│  User   │                                        │  Auth Service   │
└────┬────┘                                        └────────┬────────┘
     │                                                      │
     │ 1. POST /auth/mfa/enroll                            │
     ├────────────────────────────────────────────────────▶│
     │                                                      │
     │                              2. Generate secret key │
     │                                  Create QR code     │
     │                                                      │
     │ 3. Return QR code & backup codes                    │
     │◀────────────────────────────────────────────────────┤
     │                                                      │
     │ 4. Scan QR code with authenticator app              │
     │                                                      │
     │ 5. POST /auth/mfa/verify                            │
     │    { code: "123456" }                               │
     ├────────────────────────────────────────────────────▶│
     │                                                      │
     │                              6. Verify TOTP code    │
     │                                                      │
     │ 7. MFA enabled confirmation                         │
     │◀────────────────────────────────────────────────────┤
     │                                                      │
```

### MFA Login Flow

```
┌─────────┐                                        ┌─────────────────┐
│  User   │                                        │  Auth Service   │
└────┬────┘                                        └────────┬────────┘
     │                                                      │
     │ 1. POST /auth/login                                 │
     │    { username, password }                           │
     ├────────────────────────────────────────────────────▶│
     │                                                      │
     │                              2. Validate credentials│
     │                                  Check if MFA enabled│
     │                                                      │
     │ 3. Return MFA challenge                             │
     │    { mfaRequired: true, tempToken: "..." }          │
     │◀────────────────────────────────────────────────────┤
     │                                                      │
     │ 4. POST /auth/mfa/verify                            │
     │    { tempToken, code: "123456" }                    │
     ├────────────────────────────────────────────────────▶│
     │                                                      │
     │                              5. Verify TOTP code    │
     │                                                      │
     │ 6. Return access tokens                             │
     │◀────────────────────────────────────────────────────┤
     │                                                      │
```

## OAuth2/OIDC Integration

### Authorization Code Flow

```
┌─────────┐          ┌─────────────┐          ┌──────────────┐
│  User   │          │  Frontend   │          │   Backend    │
└────┬────┘          └──────┬──────┘          └──────┬───────┘
     │                      │                        │
     │ 1. Click "Login with Provider"               │
     ├─────────────────────▶│                        │
     │                      │                        │
     │                      │ 2. Redirect to OAuth2  │
     │                      │    provider            │
     │◀─────────────────────┤                        │
     │                      │                        │
     │ 3. Authenticate with provider                 │
     │                      │                        │
     │ 4. Authorization granted                      │
     │    Redirect to callback                       │
     │──────────────────────┼───────────────────────▶│
     │                      │                        │
     │                      │ 5. Exchange code       │
     │                      │    for tokens          │
     │                      │                        │
     │                      │ 6. Return JWT tokens   │
     │◀─────────────────────┴────────────────────────┤
     │                                               │
```

### OAuth2 Configuration

```javascript
const oauth2Config = {
  provider: 'keycloak',
  clientId: process.env.OAUTH2_CLIENT_ID,
  clientSecret: process.env.OAUTH2_CLIENT_SECRET,
  issuerUrl: process.env.OAUTH2_ISSUER_URL,
  redirectUri: 'https://app.neurobuildtech.com/auth/callback',
  scopes: ['openid', 'profile', 'email']
};
```

### OAuth2 Endpoints

**Authorization:**
```
GET https://auth.provider.com/oauth2/authorize
  ?client_id=<client-id>
  &redirect_uri=<callback-url>
  &response_type=code
  &scope=openid+profile+email
  &state=<random-state>
```

**Token Exchange:**
```http
POST https://auth.provider.com/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=<authorization-code>
&redirect_uri=<callback-url>
&client_id=<client-id>
&client_secret=<client-secret>
```

## Security Considerations

### Token Storage

**Best Practices:**
- Store access tokens in memory or sessionStorage
- Store refresh tokens in httpOnly cookies
- Never store tokens in localStorage for sensitive apps
- Clear tokens on logout

### Rate Limiting

Authentication endpoints have strict rate limits:
- Login: 5 attempts per 15 minutes per IP
- Token refresh: 10 requests per minute
- Password reset: 3 requests per hour

### Password Requirements

- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Not in common password list
- Password history (last 5 passwords)

### Account Lockout

- Lock account after 5 failed login attempts
- Lockout duration: 30 minutes
- Admin can manually unlock accounts

## Error Handling

### Authentication Errors

```json
{
  "error": "Unauthorized",
  "message": "Invalid credentials",
  "code": "AUTH_001"
}
```

Error Codes:
- `AUTH_001`: Invalid credentials
- `AUTH_002`: Token expired
- `AUTH_003`: Token revoked
- `AUTH_004`: MFA required
- `AUTH_005`: Account locked
- `AUTH_006`: Invalid MFA code

## References

- [Security Architecture](./SECURITY.md)
- [Incident Response Plan](./INCIDENT_RESPONSE.md)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
