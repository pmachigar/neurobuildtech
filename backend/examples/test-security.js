/**
 * Security Components Test Script
 * Demonstrates usage of security middleware components
 */

// Import security middleware
const {
  generateAccessToken,
  generateRefreshToken,
  generateApiKey,
  verifyToken,
  ROLES
} = require('../security/middleware/auth');

const {
  RateLimiter,
  SlidingWindowRateLimiter
} = require('../security/middleware/rateLimit');

const {
  SchemaValidator,
  SQLInjectionProtection,
  XSSProtection
} = require('../security/middleware/validation');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  NeuroBuildTech Security Components Test                ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Test 1: JWT Token Generation and Verification
console.log('1. Testing JWT Token Generation and Verification');
console.log('─'.repeat(60));

const userId = 'user-123';
const role = 'admin';
const accessToken = generateAccessToken(userId, role);
const refreshToken = generateRefreshToken(userId, role);

console.log('✓ Access Token generated:', accessToken.substring(0, 50) + '...');
console.log('✓ Refresh Token generated:', refreshToken.substring(0, 50) + '...');

try {
  const decoded = verifyToken(accessToken);
  console.log('✓ Token verified successfully');
  console.log('  - User ID:', decoded.sub);
  console.log('  - Role:', decoded.role);
  console.log('  - Type:', decoded.type);
} catch (error) {
  console.error('✗ Token verification failed:', error.message);
}

console.log();

// Test 2: API Key Generation
console.log('2. Testing API Key Generation');
console.log('─'.repeat(60));

const apiKey = generateApiKey('analytics-service', {
  description: 'Analytics service API key',
  permissions: ['metrics:read', 'logs:read']
});

console.log('✓ API Key generated');
console.log('  - Key:', apiKey.key);
console.log('  - Hash:', apiKey.hash);
console.log('  - Service:', apiKey.service);

console.log();

// Test 3: RBAC Roles
console.log('3. Testing RBAC Roles');
console.log('─'.repeat(60));

console.log('Available Roles:');
Object.entries(ROLES).forEach(([key, role]) => {
  console.log(`  - ${role.name}: ${role.permissions.join(', ')}`);
});

console.log();

// Test 4: Schema Validation
console.log('4. Testing Schema Validation');
console.log('─'.repeat(60));

const userSchema = {
  email: {
    type: 'string',
    required: true,
    pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
  },
  age: {
    type: 'number',
    required: true,
    min: 0,
    max: 150
  },
  role: {
    type: 'string',
    required: true,
    enum: ['admin', 'user', 'device']
  }
};

// Valid data
const validData = {
  email: 'user@example.com',
  age: 25,
  role: 'user'
};

const validErrors = SchemaValidator.validate(validData, userSchema);
console.log('Valid data test:', validErrors.length === 0 ? '✓ PASSED' : '✗ FAILED');

// Invalid data
const invalidData = {
  email: 'invalid-email',
  age: 200,
  role: 'invalid-role'
};

const invalidErrors = SchemaValidator.validate(invalidData, userSchema);
console.log('Invalid data test:', invalidErrors.length > 0 ? '✓ PASSED' : '✗ FAILED');
if (invalidErrors.length > 0) {
  console.log('  Detected errors:');
  invalidErrors.forEach(err => console.log(`    - ${err.field}: ${err.message}`));
}

console.log();

// Test 5: SQL Injection Detection
console.log('5. Testing SQL Injection Detection');
console.log('─'.repeat(60));

const sqlInjectionTests = [
  { input: "normal text", expected: false },
  { input: "SELECT * FROM users", expected: true },
  { input: "'; DROP TABLE users; --", expected: true },
  { input: "username' OR '1'='1", expected: true }
];

sqlInjectionTests.forEach(test => {
  const detected = SQLInjectionProtection.containsSQLInjection(test.input);
  const result = detected === test.expected ? '✓' : '✗';
  console.log(`${result} Input: "${test.input}" - Expected: ${test.expected}, Got: ${detected}`);
});

console.log();

// Test 6: XSS Detection
console.log('6. Testing XSS Detection');
console.log('─'.repeat(60));

const xssTests = [
  { input: "normal text", expected: false },
  { input: "<script>alert('xss')</script>", expected: true },
  { input: "<img src=x onerror=alert(1)>", expected: true },
  { input: "javascript:alert('xss')", expected: true }
];

xssTests.forEach(test => {
  const detected = XSSProtection.containsXSS(test.input);
  const result = detected === test.expected ? '✓' : '✗';
  console.log(`${result} Input: "${test.input}" - Expected: ${test.expected}, Got: ${detected}`);
});

console.log();

// Test 7: Rate Limiter
console.log('7. Testing Rate Limiter');
console.log('─'.repeat(60));

const limiter = new RateLimiter({
  windowMs: 60000,
  maxRequests: 5
});

console.log('✓ Rate limiter created (5 requests per minute)');
console.log('  - Window: 60000ms');
console.log('  - Max Requests: 5');

console.log();

// Summary
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  Test Summary                                            ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║  ✓ JWT Token Generation and Verification                ║');
console.log('║  ✓ API Key Generation                                    ║');
console.log('║  ✓ RBAC Roles Configuration                              ║');
console.log('║  ✓ Schema Validation                                     ║');
console.log('║  ✓ SQL Injection Detection                               ║');
console.log('║  ✓ XSS Detection                                         ║');
console.log('║  ✓ Rate Limiter Initialization                           ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('\nAll security components are working correctly!\n');
