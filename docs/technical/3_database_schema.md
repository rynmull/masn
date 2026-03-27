# Database Schema Details

## Overview
The Masn AAC platform uses PostgreSQL as its primary database, with Redis for caching and session management. This document details the database schema and relationships.

## Core Tables

### Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);
```

### Symbols
```sql
CREATE TABLE symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label VARCHAR(100) NOT NULL,
    image_url VARCHAR(255),
    category_id UUID REFERENCES categories(id),
    pronunciation_hint VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_label UNIQUE (label)
);

CREATE INDEX idx_symbols_category ON symbols(category_id);
```

### Categories
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    parent_id UUID REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_category_name UNIQUE (name)
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
```

### User_Preferences
```sql
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    grid_size JSON NOT NULL DEFAULT '{"rows": 4, "columns": 4}',
    voice_settings JSON NOT NULL DEFAULT '{"pitch": 1.0, "rate": 1.0, "volume": 1.0}',
    theme VARCHAR(20) DEFAULT 'light',
    symbol_size VARCHAR(20) DEFAULT 'medium',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Symbol_Sets
```sql
CREATE TABLE symbol_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_set_name UNIQUE (user_id, name)
);

CREATE INDEX idx_symbol_sets_user ON symbol_sets(user_id);
```

### Symbol_Set_Items
```sql
CREATE TABLE symbol_set_items (
    set_id UUID REFERENCES symbol_sets(id),
    symbol_id UUID REFERENCES symbols(id),
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (set_id, symbol_id),
    CONSTRAINT unique_position_per_set UNIQUE (set_id, position)
);

CREATE INDEX idx_symbol_set_items_set ON symbol_set_items(set_id);
```

## Usage Analytics Tables

### Usage_Logs
```sql
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    symbol_id UUID REFERENCES symbols(id),
    action_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_logs_user_time ON usage_logs(user_id, timestamp);
```

### Symbol_Combinations
```sql
CREATE TABLE symbol_combinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    symbols JSON NOT NULL, -- Array of symbol IDs
    frequency INTEGER DEFAULT 1,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_symbol_combinations_user ON symbol_combinations(user_id);
```

## Sync Management Tables

### Sync_Status
```sql
CREATE TABLE sync_status (
    user_id UUID REFERENCES users(id),
    device_id VARCHAR(255),
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sync_token VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, device_id)
);
```

### Change_Log
```sql
CREATE TABLE change_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    changes JSON NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_change_log_user_time ON change_log(user_id, timestamp);
```

## Redis Schema

### Session Storage
```
Key: session:{sessionId}
Type: Hash
Fields:
- userId
- deviceId
- lastAccess
- data (JSON string)
Expiry: 24 hours
```

### Symbol Cache
```
Key: symbol:{symbolId}
Type: String (JSON)
Fields: Serialized symbol data
Expiry: 1 hour
```

### Rate Limiting
```
Key: ratelimit:{userId}:{endpoint}
Type: String (counter)
Expiry: Varies by endpoint
```