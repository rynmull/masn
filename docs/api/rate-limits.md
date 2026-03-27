# Rate Limits & Quotas

## Overview

The Masn AAC Platform implements rate limiting to ensure fair usage and system stability. Limits are applied per authentication token and reset hourly.

## REST API Rate Limits

| Endpoint Category | Rate Limit         | Reset Period |
|------------------|-------------------|--------------|
| Authentication   | 5 requests        | Per minute   |
| Symbols API      | 100 requests      | Per minute   |
| Boards API       | 60 requests       | Per minute   |
| Speech API       | 30 requests       | Per minute   |

## WebSocket Limits

| Action           | Limit             | Reset Period |
|------------------|-------------------|--------------|
| Connections      | 3 concurrent      | N/A         |
| Messages         | 60 messages       | Per minute   |
| Subscriptions    | 10 boards        | Per connection|

## Storage Quotas

### Free Tier
- 100 symbols
- 10 boards
- 1GB storage for images
- 100 minutes speech synthesis per month

### Professional Tier
- Unlimited symbols
- Unlimited boards
- 10GB storage for images
- 1000 minutes speech synthesis per month

### Enterprise Tier
- Custom limits
- Dedicated resources
- Priority support

## Rate Limit Headers

Rate limit information is included in API responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1585282800
```

## Handling Rate Limits

### Response Format
When rate limited, the API returns a 429 status code:

```json
{
    "error": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Please try again in 60 seconds.",
    "details": {
        "reset_at": "2026-03-27T00:01:00Z",
        "limit": 100,
        "remaining": 0
    }
}
```

### Best Practices

1. **Implement Backoff**
   - Use exponential backoff when rate limited
   - Start with 1 second, double on each attempt
   - Maximum backoff of 60 seconds

2. **Monitor Usage**
   - Track rate limit headers
   - Pre-emptively slow down when near limits
   - Implement circuit breakers when needed

3. **Optimize Requests**
   - Batch operations where possible
   - Cache responses when appropriate
   - Use WebSocket for real-time updates

## Quota Monitoring

Monitor your usage through the dashboard:
- Current usage
- Historical trends
- Limit warnings
- Upgrade recommendations

## Limit Increases

Need higher limits? Options available:
1. Upgrade to Professional/Enterprise tier
2. Contact support for custom quotas
3. Implement request optimization strategies