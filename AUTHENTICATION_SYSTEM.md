# Authentication System with Refresh Tokens

## Overview

This document describes the enhanced authentication system implemented with refresh tokens for improved security and user experience.

## Architecture

### Token Types

1. **Access Token**
   - Short-lived (15 minutes by default)
   - Used for API authentication
   - Contains user information and permissions
   - Stored in memory (frontend)

2. **Refresh Token**
   - Long-lived (7 days by default)
   - Used to obtain new access tokens
   - Stored securely in database and Redis
   - Can be revoked individually or globally

### Security Features

- **Token Blacklisting**: Revoked tokens are stored in Redis for quick validation
- **Token Rotation**: Each refresh operation generates new tokens
- **Session Management**: Track multiple user sessions across devices
- **Device Tracking**: Store device information for security monitoring
- **Automatic Cleanup**: Expired tokens are automatically removed

## API Endpoints

### Authentication Endpoints

#### 1. Login Endpoints

```http
POST /api/auth/super-admin/login
POST /api/auth/school-admin/login
POST /api/auth/student/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": false
}
```

**Response:**

```json
{
  "message": "Login successful",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access_token_expires_in": 900,
  "refresh_token_expires_in": 604800,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "role_id",
    "school_id": "school_id"
  }
}
```

#### 2. Refresh Token

```http
POST /api/auth/refresh
```

**Request Body:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "message": "Token refreshed successfully",
  "access_token": "new_access_token",
  "refresh_token": "new_refresh_token",
  "access_token_expires_in": 900,
  "refresh_token_expires_in": 604800
}
```

#### 3. Logout

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 4. Logout All Sessions

```http
POST /api/auth/logout-all
Authorization: Bearer <access_token>
```

#### 5. Get Current User

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

## Environment Variables

### Required Variables

```bash
# JWT Secrets (recommended to use separate secrets)
JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key

# Fallback (if separate secrets not provided)
JWT_SECRET=your_fallback_secret_key

# Token Expiry Times
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
```

### Optional Variables

```bash
# Token Expiry Fallbacks
JWT_EXPIRY=24h  # Legacy support
```

## Database Schema

### Refresh Token Collection

```typescript
interface RefreshToken {
  _id: ObjectId;
  user_id: ObjectId; // Reference to User
  token: string; // Encrypted refresh token
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  expires_at: Date;
  user_agent: string; // Browser/device info
  ip_address: string; // Client IP
  device_info: string; // Device type
  revoked_at?: Date; // When token was revoked
  revoked_reason?: string; // Reason for revocation
  created_at: Date;
  updated_at: Date;
}
```

## Security Features

### 1. Token Blacklisting

- Revoked tokens are stored in Redis with TTL
- Quick validation during token verification
- Automatic cleanup when tokens expire

### 2. Token Rotation

- Each refresh operation generates new tokens
- Old refresh tokens are immediately revoked
- Prevents token reuse attacks

### 3. Session Management

- Track multiple user sessions
- Device information storage
- Individual session revocation
- Global session logout

### 4. Device Tracking

- User agent parsing
- IP address logging
- Device type detection
- Session analytics

## Implementation Details

### Token Generation

```typescript
// Access Token (15 minutes)
const accessToken = jwt.sign(
  {
    id: user.id,
    email: user.email,
    role_id: user.role_id,
    role_name: user.role_name,
    school_id: user.school_id,
    token_type: 'access',
  },
  secret,
  { expiresIn: '15m' },
);

// Refresh Token (7 days)
const tokenId = randomBytes(32).toString('hex');
const refreshToken = jwt.sign(
  {
    id: user.id,
    email: user.email,
    role_id: user.role_id,
    role_name: user.role_name,
    school_id: user.school_id,
    token_type: 'refresh',
    token_id: tokenId,
  },
  secret,
  { expiresIn: '7d' },
);
```

### Token Validation

```typescript
// Verify token type
if (payload.token_type !== 'access') {
  throw new UnauthorizedException('Invalid token type');
}

// Check blacklist
const isBlacklisted = await redisService.isBlacklisted(token);
if (isBlacklisted) {
  throw new UnauthorizedException('Token has been revoked');
}
```

### Refresh Token Flow

1. **Client sends refresh token**
2. **Server validates token signature**
3. **Check token blacklist**
4. **Verify token exists in database**
5. **Check token expiration**
6. **Generate new token pair**
7. **Revoke old refresh token**
8. **Store new refresh token**
9. **Return new tokens to client**

## Frontend Integration

### Token Storage

```javascript
// Store tokens securely
localStorage.setItem('access_token', response.access_token);
localStorage.setItem('refresh_token', response.refresh_token);
localStorage.setItem(
  'token_expiry',
  Date.now() + response.access_token_expires_in * 1000,
);
```

### Automatic Token Refresh

```javascript
// Interceptor for automatic token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post('/api/auth/refresh', {
            refresh_token: refreshToken,
          });

          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);

          // Retry original request
          error.config.headers.Authorization = `Bearer ${response.data.access_token}`;
          return axios(error.config);
        } catch (refreshError) {
          // Redirect to login
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);
```

### Logout Implementation

```javascript
const logout = async () => {
  try {
    await axios.post(
      '/api/auth/logout',
      {
        refresh_token: localStorage.getItem('refresh_token'),
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      },
    );
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.clear();
    window.location.href = '/login';
  }
};
```

## Security Best Practices

### 1. Token Storage

- Store access tokens in memory when possible
- Use secure HTTP-only cookies for refresh tokens
- Implement token rotation on every refresh

### 2. Token Validation

- Always verify token signature
- Check token expiration
- Validate token blacklist
- Verify user status and permissions

### 3. Session Management

- Track user sessions across devices
- Allow users to view and revoke sessions
- Implement automatic session cleanup

### 4. Monitoring and Logging

- Log authentication attempts
- Monitor failed login attempts
- Track token usage patterns
- Alert on suspicious activities

## Migration Guide

### From Old System

1. **Update Environment Variables**

   ```bash
   # Add new JWT secrets
   JWT_ACCESS_SECRET=your_new_access_secret
   JWT_REFRESH_SECRET=your_new_refresh_secret
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   ```

2. **Update Frontend**
   - Implement refresh token logic
   - Update token storage
   - Add automatic token refresh

3. **Database Migration**
   - Create refresh_tokens collection
   - Add indexes for performance

4. **Redis Setup**
   - Configure Redis for token blacklisting
   - Set up session management

## Troubleshooting

### Common Issues

1. **Token Expired**
   - Implement automatic refresh
   - Handle refresh token expiration

2. **Invalid Token**
   - Check token signature
   - Verify token type
   - Validate token blacklist

3. **Redis Connection**
   - Verify Redis configuration
   - Check network connectivity
   - Monitor Redis memory usage

### Performance Optimization

1. **Database Indexes**

   ```javascript
   // Ensure proper indexes
   db.refresh_tokens.createIndex({ user_id: 1, status: 1 });
   db.refresh_tokens.createIndex({ token: 1, status: 1 });
   db.refresh_tokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
   ```

2. **Redis Optimization**
   - Use appropriate TTL values
   - Monitor memory usage
   - Implement connection pooling

3. **Token Cleanup**
   - Regular cleanup of expired tokens
   - Automatic session cleanup
   - Database maintenance scripts

## Monitoring and Analytics

### Key Metrics

1. **Authentication Metrics**
   - Login success/failure rates
   - Token refresh frequency
   - Session duration

2. **Security Metrics**
   - Failed authentication attempts
   - Token revocation events
   - Suspicious activity patterns

3. **Performance Metrics**
   - Token validation latency
   - Redis response times
   - Database query performance

### Logging

```typescript
// Example logging implementation
logger.log(`User ${email} logged in successfully`);
logger.warn(`Failed login attempt for ${email}`);
logger.error(`Token validation failed: ${error.message}`);
```

## Conclusion

This enhanced authentication system provides:

- ✅ **Improved Security**: Short-lived access tokens with refresh capability
- ✅ **Better UX**: Seamless token refresh without user intervention
- ✅ **Session Management**: Multi-device support with individual control
- ✅ **Monitoring**: Comprehensive logging and analytics
- ✅ **Scalability**: Redis-based caching and blacklisting
- ✅ **Flexibility**: Configurable token expiry and security settings

The system is designed to be secure, scalable, and user-friendly while maintaining backward compatibility with existing implementations.
