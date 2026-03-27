# WebSocket Events Documentation

The Masn AAC Platform uses WebSocket connections for real-time communication features. Connect to `wss://api.masn.io/v1/ws` with your authentication token.

## Connection

To establish a WebSocket connection:

1. Obtain a valid JWT token through the REST API
2. Connect to the WebSocket endpoint
3. Send an authentication message

```json
{
    "type": "auth",
    "token": "your.jwt.token"
}
```

## Events

### Incoming Events (Server → Client)

#### symbol.update
Sent when a symbol is updated in real-time.
```json
{
    "type": "symbol.update",
    "data": {
        "id": "symbol-uuid",
        "name": "Updated Symbol Name",
        "imageUrl": "https://...",
        "category": "category",
        "tags": ["tag1", "tag2"],
        "updatedAt": "2026-03-27T00:00:00Z"
    }
}
```

#### board.update
Sent when a board is modified.
```json
{
    "type": "board.update",
    "data": {
        "id": "board-uuid",
        "name": "Board Name",
        "layout": {
            "rows": 4,
            "columns": 5
        },
        "symbols": ["symbol-uuid-1", "symbol-uuid-2"],
        "updatedAt": "2026-03-27T00:00:00Z"
    }
}
```

#### speech.start
Indicates speech synthesis has started.
```json
{
    "type": "speech.start",
    "data": {
        "id": "speech-uuid",
        "text": "Hello world",
        "startedAt": "2026-03-27T00:00:00Z"
    }
}
```

#### speech.end
Indicates speech synthesis has completed.
```json
{
    "type": "speech.end",
    "data": {
        "id": "speech-uuid",
        "duration": 2.5
    }
}
```

### Outgoing Events (Client → Server)

#### symbol.request
Request symbol updates.
```json
{
    "type": "symbol.request",
    "data": {
        "id": "symbol-uuid"
    }
}
```

#### board.subscribe
Subscribe to board updates.
```json
{
    "type": "board.subscribe",
    "data": {
        "id": "board-uuid"
    }
}
```

#### speech.synthesize
Request speech synthesis.
```json
{
    "type": "speech.synthesize",
    "data": {
        "text": "Hello world",
        "voice": "default",
        "speed": 1.0
    }
}
```

## Connection Lifecycle

1. The server may send a `ping` message periodically
2. Clients must respond with a `pong` message
3. If no `pong` is received after 3 `ping` attempts, the connection will be closed
4. Clients should implement reconnection logic with exponential backoff

## Error Handling

Error events follow this format:
```json
{
    "type": "error",
    "code": 4001,
    "message": "Authentication failed",
    "details": {}
}
```

Common error codes:
- 4001: Authentication failed
- 4002: Invalid message format
- 4003: Rate limit exceeded
- 4004: Resource not found