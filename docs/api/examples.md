# API Examples

## Authentication

### Get Access Token
```bash
curl -X POST https://api.masn.io/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "your-password"
  }'
```

## Symbols API

### List Symbols
```bash
curl https://api.masn.io/v1/symbols \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Create Symbol
```bash
curl -X POST https://api.masn.io/v1/symbols \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hello",
    "imageUrl": "https://example.com/hello.png",
    "category": "Greetings",
    "tags": ["welcome", "basic"]
  }'
```

### Update Symbol
```bash
curl -X PUT https://api.masn.io/v1/symbols/symbol-uuid \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Hello",
    "tags": ["welcome", "basic", "greeting"]
  }'
```

## Boards API

### Create Board
```bash
curl -X POST https://api.masn.io/v1/boards \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Basic Communication",
    "layout": {
      "rows": 3,
      "columns": 4
    },
    "symbols": [
      "symbol-uuid-1",
      "symbol-uuid-2",
      "symbol-uuid-3"
    ]
  }'
```

### Get Board Details
```bash
curl https://api.masn.io/v1/boards/board-uuid \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## WebSocket Examples

### Connect and Authenticate (JavaScript)
```javascript
const ws = new WebSocket('wss://api.masn.io/v1/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'YOUR_TOKEN'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Subscribe to Board Updates
```javascript
ws.send(JSON.stringify({
  type: 'board.subscribe',
  data: {
    id: 'board-uuid'
  }
}));
```

### Request Speech Synthesis
```javascript
ws.send(JSON.stringify({
  type: 'speech.synthesize',
  data: {
    text: 'Hello, how are you?',
    voice: 'default',
    speed: 1.0
  }
}));
```

## Python Examples

### Basic API Client
```python
import requests

class MasnClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://api.masn.io/v1'
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

    def list_symbols(self, page=1, limit=20):
        response = requests.get(
            f'{self.base_url}/symbols',
            headers=self.headers,
            params={'page': page, 'limit': limit}
        )
        return response.json()

    def create_board(self, name, layout, symbols):
        response = requests.post(
            f'{self.base_url}/boards',
            headers=self.headers,
            json={
                'name': name,
                'layout': layout,
                'symbols': symbols
            }
        )
        return response.json()

# Usage
client = MasnClient('YOUR_TOKEN')
symbols = client.list_symbols()
print(symbols)
```

## Error Handling Examples

### Handle Rate Limits
```python
import time

def make_request_with_retry(client, method, *args, **kwargs):
    max_retries = 3
    retry_count = 0
    base_delay = 1  # 1 second

    while retry_count < max_retries:
        try:
            response = method(*args, **kwargs)
            return response
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:  # Rate limit exceeded
                retry_after = int(e.response.headers.get('Retry-After', base_delay))
                time.sleep(retry_after)
                retry_count += 1
            else:
                raise
    
    raise Exception("Max retries exceeded")
```

### WebSocket Reconnection
```javascript
class MasnWebSocket {
    constructor(token) {
        this.token = token;
        this.reconnectAttempts = 0;
        this.connect();
    }

    connect() {
        this.ws = new WebSocket('wss://api.masn.io/v1/ws');
        
        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.authenticate();
        };

        this.ws.onclose = () => {
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), delay);
        };
    }

    authenticate() {
        this.ws.send(JSON.stringify({
            type: 'auth',
            token: this.token
        }));
    }
}
```