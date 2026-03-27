# Build System Configuration

## Overview
The Masn AAC platform uses a modern build system based on Node.js and Docker, supporting both development and production environments.

## Prerequisites
- Node.js >= 18.x
- Docker >= 20.x
- Docker Compose >= 2.x
- PostgreSQL >= 14.x
- Redis >= 6.x

## Project Structure
```
masn/
├── client/                 # Frontend application
│   ├── src/
│   ├── public/
│   ├── tests/
│   └── package.json
├── server/                 # Backend services
│   ├── src/
│   ├── tests/
│   └── package.json
├── shared/                 # Shared utilities and types
│   ├── src/
│   └── package.json
├── docker/                 # Docker configuration
│   ├── dev/
│   └── prod/
├── scripts/               # Build and deployment scripts
└── package.json           # Root package.json
```

## Build Scripts

### Root package.json
```json
{
  "scripts": {
    "setup": "node scripts/setup.js",
    "dev": "docker-compose -f docker/dev/docker-compose.yml up",
    "build": "node scripts/build.js",
    "test": "node scripts/test.js",
    "lint": "eslint .",
    "clean": "node scripts/clean.js",
    "deploy": "node scripts/deploy.js"
  }
}
```

### Build Configuration (build.config.js)
```javascript
module.exports = {
  client: {
    entry: './client/src/index.tsx',
    output: './dist/client',
    env: {
      development: {
        sourceMaps: true,
        optimization: false
      },
      production: {
        sourceMaps: false,
        optimization: true
      }
    }
  },
  server: {
    entry: './server/src/index.ts',
    output: './dist/server',
    env: {
      development: {
        sourceMaps: true
      },
      production: {
        sourceMaps: false
      }
    }
  }
};
```

## Docker Configuration

### Development (docker/dev/docker-compose.yml)
```yaml
version: '3.8'

services:
  client:
    build:
      context: ../../
      dockerfile: docker/dev/client.Dockerfile
    volumes:
      - ../../client:/app/client
      - ../../shared:/app/shared
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - API_URL=http://server:4000

  server:
    build:
      context: ../../
      dockerfile: docker/dev/server.Dockerfile
    volumes:
      - ../../server:/app/server
      - ../../shared:/app/shared
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - REDIS_HOST=redis

  postgres:
    image: postgres:14-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=masn
      - POSTGRES_PASSWORD=development
      - POSTGRES_DB=masn_dev

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
```

### Production (docker/prod/docker-compose.yml)
```yaml
version: '3.8'

services:
  client:
    build:
      context: ../../
      dockerfile: docker/prod/client.Dockerfile
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production

  server:
    build:
      context: ../../
      dockerfile: docker/prod/server.Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=masn_prod

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Build Process

### Development Build
1. Install dependencies
```bash
npm install
```

2. Start development environment
```bash
npm run dev
```

3. Access development servers
- Client: http://localhost:3000
- Server: http://localhost:4000

### Production Build
1. Build production artifacts
```bash
npm run build
```

2. Deploy to production
```bash
npm run deploy
```

## Environment Configuration

### .env.example
```bash
# Application
NODE_ENV=development
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=masn
DB_PASSWORD=your_password
DB_NAME=masn_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=24h

# AWS (for production)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

## CI/CD Pipeline Configuration

### .github/workflows/main.yml
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18.x'
      - run: npm ci
      - run: npm run lint
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Docker images
        run: docker-compose -f docker/prod/docker-compose.yml build

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: npm run deploy
```