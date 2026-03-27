# Authentication & Authorization

## Overview

The Masn AAC Platform uses JSON Web Tokens (JWT) for authentication. All API requests must include a valid JWT token in the Authorization header.

## Authentication Flow

1. Obtain an access token by sending credentials to `/auth/token`
2. Include the token in subsequent requests using the Bearer scheme
3. Refresh tokens before expiry to maintain continuous access

## Obtaining Tokens

### Request
```http
POST /auth/token
Content-Type: application/json

{
    "username": "user@example.com",
    "password": "your-password"
}
```

### Response
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiI...",
    "token_type": "Bearer",
    "expires_in": 3600
}
```

## Using Tokens

Include the token in API requests:
```http
GET /api/v1/symbols
Authorization: Bearer eyJhbGciOiJIUzI1NiI...
```

## Token Expiration

- Access tokens expire after 1 hour
- Implement token refresh before expiration
- Monitor the `expires_in` value in the token response

## Authorization Levels

The platform uses role-based access control (RBAC) with the following roles:

### User
- Read access to public symbols and boards
- Create and manage personal boards
- Use speech synthesis

### Editor
- Create and edit symbols
- Manage categories and tags
- Create public boards

### Administrator
- Full system access
- User management
- Usage analytics

## Permission Examples

```javascript
// User permissions
{
    "role": "user",
    "permissions": [
        "symbols:read",
        "boards:read",
        "boards:create",
        "speech:synthesize"
    ]
}

// Editor permissions
{
    "role": "editor",
    "permissions": [
        "symbols:read",
        "symbols:write",
        "boards:read",
        "boards:write",
        "categories:manage"
    ]
}

// Administrator permissions
{
    "role": "admin",
    "permissions": [
        "*:read",
        "*:write",
        "*:manage"
    ]
}
```

## Security Best Practices

1. **Token Storage**
   - Store tokens securely
   - Never expose in URLs or logs
   - Clear on logout

2. **HTTPS**
   - All API requests must use HTTPS
   - Invalid certificates are rejected

3. **Rate Limiting**
   - Implements per-token rate limiting
   - See rate limits documentation for details

4. **Error Handling**
   - 401: Invalid or expired token
   - 403: Insufficient permissions
   - 429: Rate limit exceeded