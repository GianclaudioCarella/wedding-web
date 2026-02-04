# Wedding-Web Full Migration Plan

> **Migration from Vercel + Supabase to Self-Hosted Infrastructure**  
> Status: Planning Phase  
> Last Updated: February 4, 2026

---

## 📋 Table of Contents

- [Overview](#overview)
- [Current Architecture](#current-architecture)
- [Target Architecture](#target-architecture)
- [Migration Phases](#migration-phases)
- [Detailed Steps](#detailed-steps)
- [Rollback Strategy](#rollback-strategy)
- [Testing Checklist](#testing-checklist)
- [Cost Analysis](#cost-analysis)
- [Timeline](#timeline)

---

## Overview

### Goals
- Decouple AI chat functionality from wedding-specific code
- Migrate from Supabase to self-hosted PostgreSQL
- Integrate with existing allerac-one infrastructure
- Reduce monthly operational costs
- Improve development workflow and code maintainability

### Why Migrate?
1. **Cost Efficiency**: Reduce from ~$45/mo to ~$10/mo
2. **Better Architecture**: Separate concerns (chat vs. wedding)
3. **Unified Infrastructure**: One Docker setup for all services
4. **Full Control**: Own your data and infrastructure
5. **Scalability**: Easier to add new features and services

---

## Current Architecture

### Hosting
- **Frontend**: Vercel (Next.js 16)
- **Database**: Supabase (PostgreSQL + Auth)
- **File Storage**: Supabase Storage
- **Email**: Resend API

### Code Structure
```
wedding-web/
├── app/
│   ├── admin/chat/          ❌ Tightly coupled to wedding
│   │   ├── services/        ❌ Mixed with wedding logic
│   │   └── tools/           ❌ Wedding-specific
│   ├── rsvp/                ✅ Wedding-specific (keep)
│   └── api/                 ✅ Wedding APIs (keep)
├── lib/
│   └── supabase.ts          ❌ Needs replacement
└── database/                ✅ SQL migrations (reuse)
```

### Problems
- ❌ Chat code duplicated with allerac-one
- ❌ Hard to maintain two similar chat systems
- ❌ Supabase coupling makes local dev difficult
- ❌ Can't easily share improvements between projects

---

## Target Architecture

### Hosting
- **Infrastructure**: Docker Compose on home server
- **Database**: PostgreSQL (single instance)
- **Reverse Proxy**: Nginx with SSL
- **Email**: Resend API (unchanged)

### Services Layout
```
home-server/
├── docker-compose.yml
├── services/
│   ├── allerac-one/         # Chat + AI (Port 3000)
│   │   └── tools/
│   │       └── wedding/     # Wedding tools as plugins
│   ├── wedding-web/         # Wedding pages (Port 3001)
│   │   ├── app/
│   │   │   ├── rsvp/        # RSVP forms
│   │   │   ├── admin/       # Admin dashboard
│   │   │   └── api/         # Backend APIs
│   │   └── components/
│   └── postgres/            # Shared database
└── nginx/                   # Reverse proxy config
```

### Domain Routing
```
chat.yourdomain.com    → allerac-one:3000
wedding.yourdomain.com → wedding-web:3001
```

---

## Migration Phases

### Phase 1: Infrastructure Setup (Days 1-2)
Set up server environment, Docker, and networking

### Phase 2: Database Migration (Days 3-4)
Export from Supabase, import to PostgreSQL

### Phase 3: Code Refactoring (Days 5-8)
Replace Supabase client, merge chat functionality

### Phase 4: Integration (Days 9-10)
Connect wedding-web with allerac-one chat

### Phase 5: Deployment (Days 11-12)
Configure Docker, Nginx, SSL certificates

### Phase 6: Testing & Cutover (Days 13-15)
Parallel testing, final migration, monitoring

---

## Detailed Steps

## Phase 1: Infrastructure Setup

### 1.1 Server Requirements
```yaml
Minimum Hardware:
  - CPU: 4 cores
  - RAM: 8GB
  - Storage: 100GB SSD
  - Network: Stable internet with port forwarding

Software:
  - Ubuntu 22.04 LTS or similar
  - Docker 24+
  - Docker Compose 2.20+
```

### 1.2 Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 1.3 Network Configuration

**Option A: Port Forwarding (Simple)**
```
Router Configuration:
  Port 80  → Server IP:80  (HTTP)
  Port 443 → Server IP:443 (HTTPS)
```

**Option B: Cloudflare Tunnel (Recommended)**
```bash
# No port forwarding needed
# Zero-trust security
# Free tier available
cloudflared tunnel create wedding
cloudflared tunnel route dns wedding wedding.yourdomain.com
cloudflared tunnel route dns wedding chat.yourdomain.com
```

### 1.4 Domain Setup
```
DNS Records (if using port forwarding):
  A     chat.yourdomain.com     → Your_Public_IP
  A     wedding.yourdomain.com  → Your_Public_IP

DNS Records (if using Cloudflare Tunnel):
  CNAME chat.yourdomain.com     → <tunnel-id>.cfargotunnel.com
  CNAME wedding.yourdomain.com  → <tunnel-id>.cfargotunnel.com
```

---

## Phase 2: Database Migration

### 2.1 Export from Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Export database schema
supabase db dump -f schema.sql --schema public

# Export data
supabase db dump -f data.sql --data-only
```

### 2.2 Tables to Migrate

```sql
-- Core Tables
guests
events
event_guests
planning_tasks

-- Documents & RAG
documents
document_chunks

-- Chat (if wedding-specific conversations exist)
chat_conversations
chat_messages
chat_settings

-- Auth
users (migrate to allerac-one's auth system)

-- Cache & Settings
tavily_cache
user_settings
```

### 2.3 Create PostgreSQL Database

```bash
# Connect to PostgreSQL container
docker exec -it postgres psql -U postgres

# Create databases
CREATE DATABASE wedding_db;
CREATE DATABASE allerac_db; -- if not exists

# Create user
CREATE USER wedding_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE wedding_db TO wedding_user;
```

### 2.4 Import Data

```bash
# Import schema
docker exec -i postgres psql -U postgres -d wedding_db < schema.sql

# Import data
docker exec -i postgres psql -U postgres -d wedding_db < data.sql

# Verify import
docker exec -i postgres psql -U postgres -d wedding_db -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  FROM pg_tables 
  WHERE schemaname = 'public';
"
```

### 2.5 Data Validation

```sql
-- Check row counts
SELECT 'guests' as table_name, COUNT(*) FROM guests
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'event_guests', COUNT(*) FROM event_guests
UNION ALL
SELECT 'documents', COUNT(*) FROM documents;

-- Verify relationships
SELECT 
  e.name as event_name,
  COUNT(eg.guest_id) as guest_count
FROM events e
LEFT JOIN event_guests eg ON e.id = eg.event_id
GROUP BY e.name;
```

---

## Phase 3: Code Refactoring

### 3.1 Replace Supabase Client

**Current: `lib/supabase.ts`**
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**New: `lib/db.ts`**
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

### 3.2 Update Query Patterns

**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('guests')
  .select('*')
  .eq('attending', 'yes');
```

**After (PostgreSQL):**
```typescript
const result = await pool.query(
  'SELECT * FROM guests WHERE attending = $1',
  ['yes']
);
const data = result.rows;
```

### 3.3 Create Database Service Layer

```typescript
// lib/services/database.service.ts
import pool from '@/lib/db';

export class DatabaseService {
  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Query executed', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error', { text, error });
      throw error;
    }
  }

  async getGuests(filter?: string) {
    let query = 'SELECT * FROM guests';
    const params: any[] = [];

    if (filter) {
      query += ' WHERE attending = $1';
      params.push(filter);
    }

    query += ' ORDER BY name';
    const result = await this.query(query, params);
    return result.rows;
  }

  async getGuestById(id: string) {
    const result = await this.query(
      'SELECT * FROM guests WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  async updateGuest(id: string, data: any) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    const result = await this.query(
      `UPDATE guests SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  }
}
```

### 3.4 Migrate Auth

**Decision Point: Choose One**

**Option A: Use Allerac-One Auth (Recommended)**
- Unified user management
- Share sessions across apps
- Less code duplication

**Option B: Separate Auth**
- Independent user bases
- More isolation
- Requires JWT sharing for chat access

**Implementation (Option A):**
```typescript
// wedding-web/lib/auth.ts
export async function getSession() {
  // Proxy to allerac-one auth
  const response = await fetch('http://allerac-one:3000/api/auth/session', {
    credentials: 'include',
  });
  return response.json();
}
```

### 3.5 Remove Chat Code from Wedding-Web

**Files to Delete:**
```bash
rm -rf app/admin/chat/services/llm.service.ts
rm -rf app/admin/chat/services/metrics*.ts
rm -rf app/admin/chat/services/cache.service.ts
rm -rf app/admin/chat/components/
# Keep only the page.tsx that redirects to allerac-one
```

**Update `app/admin/chat/page.tsx`:**
```typescript
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChatRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to allerac-one chat with wedding context
    window.location.href = 'https://chat.yourdomain.com?context=wedding';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to chat...</p>
    </div>
  );
}
```

---

## Phase 4: Integration

### 4.1 Wedding Tools for Allerac-One

Create wedding-specific tools as plugins:

```typescript
// allerac-one/app/tools/wedding/guest-management.tool.ts
import pool from '@/app/clients/db';

export const guestManagementTool = {
  name: 'get_guest_statistics',
  description: 'Get statistics about wedding guests (RSVPs, attendance, etc.)',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async () => {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_guests,
        SUM(total_guests) as total_people,
        COUNT(*) FILTER (WHERE attending = 'yes') as confirmed,
        COUNT(*) FILTER (WHERE attending = 'no') as declined,
        COUNT(*) FILTER (WHERE attending = 'perhaps') as maybe,
        COUNT(*) FILTER (WHERE attending IS NULL) as no_response
      FROM guests
    `);
    return result.rows[0];
  },
};

export const listGuestsTool = {
  name: 'list_wedding_guests',
  description: 'List all wedding guests with their RSVP status',
  parameters: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        enum: ['all', 'confirmed', 'declined', 'maybe', 'no_response'],
        description: 'Filter guests by RSVP status',
      },
    },
  },
  execute: async (args: { filter?: string }) => {
    let query = 'SELECT id, name, email, total_guests, attending FROM guests';
    
    if (args.filter && args.filter !== 'all') {
      const filterMap: Record<string, string> = {
        confirmed: "attending = 'yes'",
        declined: "attending = 'no'",
        maybe: "attending = 'perhaps'",
        no_response: "attending IS NULL",
      };
      query += ` WHERE ${filterMap[args.filter]}`;
    }
    
    query += ' ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  },
};
```

```typescript
// allerac-one/app/tools/wedding/event-planning.tool.ts
export const eventPlanningTool = {
  name: 'get_wedding_events',
  description: 'Get list of wedding events (ceremony, reception, etc.)',
  parameters: { type: 'object', properties: {} },
  execute: async () => {
    const result = await pool.query(`
      SELECT 
        e.id,
        e.name,
        e.event_date,
        e.location,
        COUNT(eg.guest_id) as guest_count
      FROM events e
      LEFT JOIN event_guests eg ON e.id = eg.event_id
      GROUP BY e.id, e.name, e.event_date, e.location
      ORDER BY e.event_date
    `);
    return result.rows;
  },
};

export const planningTasksTool = {
  name: 'get_planning_tasks',
  description: 'Get wedding planning tasks and their status',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['all', 'pending', 'in_progress', 'completed'],
      },
    },
  },
  execute: async (args: { status?: string }) => {
    let query = 'SELECT * FROM planning_tasks';
    
    if (args.status && args.status !== 'all') {
      query += ` WHERE status = $1`;
      const result = await pool.query(query, [args.status]);
      return result.rows;
    }
    
    const result = await pool.query(query + ' ORDER BY priority DESC, due_date');
    return result.rows;
  },
};
```

### 4.2 Register Wedding Tools

```typescript
// allerac-one/app/tools/wedding/index.ts
import { guestManagementTool, listGuestsTool } from './guest-management.tool';
import { eventPlanningTool, planningTasksTool } from './event-planning.tool';

export const WEDDING_TOOLS = [
  guestManagementTool,
  listGuestsTool,
  eventPlanningTool,
  planningTasksTool,
];
```

```typescript
// allerac-one/app/tools/tools.ts
import { WEDDING_TOOLS } from './wedding';

// Conditionally load wedding tools based on user role or context
export function getToolsForUser(user: any, context?: string) {
  const baseTools = [
    searchWebTool,
    // ... other default tools
  ];

  if (context === 'wedding' || user.role === 'wedding_admin') {
    return [...baseTools, ...WEDDING_TOOLS];
  }

  return baseTools;
}
```

### 4.3 Context-Aware Chat

```typescript
// allerac-one/app/page.tsx
export default function AdminChat() {
  const searchParams = useSearchParams();
  const context = searchParams.get('context'); // 'wedding' or null

  const tools = useMemo(() => {
    return getToolsForUser(user, context);
  }, [user, context]);

  // Show wedding-specific UI elements
  const isWeddingContext = context === 'wedding';

  return (
    <div>
      {isWeddingContext && (
        <div className="bg-pink-50 p-4 border-b">
          <p>💒 Wedding Planning Mode - Access guest lists, events, and tasks</p>
        </div>
      )}
      {/* ... rest of chat UI */}
    </div>
  );
}
```

---

## Phase 5: Deployment

### 5.1 Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_MULTIPLE_DATABASES: allerac_db,wedding_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init-multiple-databases.sh:/docker-entrypoint-initdb.d/init-multiple-databases.sh
    ports:
      - "5432:5432"
    networks:
      - app_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  allerac-one:
    build:
      context: ./allerac-one
      dockerfile: Dockerfile
    container_name: allerac-one
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/allerac_db
      WEDDING_DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/wedding_db
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      TAVILY_API_KEY: ${TAVILY_API_KEY}
      OLLAMA_BASE_URL: ${OLLAMA_BASE_URL:-http://host.docker.internal:11434}
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app_network
    volumes:
      - allerac_uploads:/app/uploads

  wedding-web:
    build:
      context: ./wedding-web
      dockerfile: Dockerfile
    container_name: wedding-web
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/wedding_db
      RESEND_API_KEY: ${RESEND_API_KEY}
      NEXT_PUBLIC_CHAT_URL: https://chat.yourdomain.com
      NODE_ENV: production
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app_network

  nginx:
    image: nginx:alpine
    container_name: nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - allerac-one
      - wedding-web
    networks:
      - app_network

networks:
  app_network:
    driver: bridge

volumes:
  postgres_data:
  allerac_uploads:
```

### 5.2 Wedding-Web Dockerfile

```dockerfile
# wedding-web/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

**Update `next.config.ts`:**
```typescript
const nextConfig = {
  output: 'standalone',
  // ... other config
};

export default nextConfig;
```

### 5.3 Nginx Configuration

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream allerac-one {
        server allerac-one:3000;
    }

    upstream wedding-web {
        server wedding-web:3001;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

    # Chat subdomain
    server {
        listen 80;
        server_name chat.yourdomain.com;
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name chat.yourdomain.com;

        ssl_certificate /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        client_max_body_size 50M;

        location / {
            limit_req zone=general burst=20 nodelay;
            proxy_pass http://allerac-one;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # Wedding subdomain
    server {
        listen 80;
        server_name wedding.yourdomain.com;
        
        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name wedding.yourdomain.com;

        ssl_certificate /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        client_max_body_size 10M;

        location / {
            limit_req zone=general burst=20 nodelay;
            proxy_pass http://wedding-web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        location /api/ {
            limit_req zone=api burst=50 nodelay;
            proxy_pass http://wedding-web;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 5.4 SSL Certificate Setup

```bash
# Using Certbot
sudo apt install certbot

# Get certificates
sudo certbot certonly --standalone \
  -d chat.yourdomain.com \
  -d wedding.yourdomain.com \
  --email your@email.com \
  --agree-tos \
  --no-eff-email

# Copy to nginx folder
sudo cp /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem ./nginx/certs/
sudo cp /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem ./nginx/certs/

# Set permissions
sudo chown $USER:$USER ./nginx/certs/*
chmod 644 ./nginx/certs/fullchain.pem
chmod 600 ./nginx/certs/privkey.pem

# Auto-renewal (add to crontab)
0 0 1 * * certbot renew --quiet && docker compose restart nginx
```

### 5.5 Environment Variables

```bash
# .env (root directory)

# PostgreSQL
POSTGRES_PASSWORD=your_secure_password_here

# Allerac-One
GITHUB_TOKEN=your_github_token
TAVILY_API_KEY=your_tavily_key
OLLAMA_BASE_URL=http://host.docker.internal:11434

# Wedding-Web
RESEND_API_KEY=your_resend_key

# Optional: Monitoring
GRAFANA_PASSWORD=admin_password
```

### 5.6 Start Services

```bash
# Clone repositories
mkdir ~/home-server && cd ~/home-server
git clone https://github.com/Allerac/allerac-one.git
git clone https://github.com/yourusername/wedding-web.git

# Create .env file
nano .env
# (paste environment variables)

# Start all services
docker compose up -d

# Check logs
docker compose logs -f

# Check service health
docker compose ps
```

---

## Phase 6: Testing & Cutover

### 6.1 Pre-Migration Testing Checklist

```bash
# Test database connectivity
docker exec -it postgres psql -U postgres -d wedding_db -c "SELECT COUNT(*) FROM guests;"

# Test allerac-one
curl https://chat.yourdomain.com/api/health

# Test wedding-web
curl https://wedding.yourdomain.com/api/health

# Test wedding tools in chat
# 1. Open https://chat.yourdomain.com?context=wedding
# 2. Ask: "How many guests have confirmed?"
# 3. Verify it uses get_guest_statistics tool
```

### 6.2 Functional Testing

**RSVP Flow:**
- [ ] Guest can access RSVP page in all languages (EN, PT, ES)
- [ ] Guest can submit RSVP form
- [ ] Confirmation email is sent
- [ ] Data is saved to PostgreSQL
- [ ] Admin can see updated guest list

**Admin Chat:**
- [ ] Admin can access chat at chat.yourdomain.com?context=wedding
- [ ] Chat loads wedding tools automatically
- [ ] Can query guest statistics
- [ ] Can list guests by filter
- [ ] Can check event details
- [ ] Can view planning tasks

**Admin Dashboard:**
- [ ] Events page loads guest lists
- [ ] Metrics page shows data
- [ ] Planning tasks are editable

**Email System:**
- [ ] RSVP confirmation emails work
- [ ] Email templates render correctly
- [ ] Multi-language emails work

### 6.3 Performance Testing

```bash
# Load test RSVP endpoint
ab -n 1000 -c 10 https://wedding.yourdomain.com/api/rsvp

# Monitor resource usage
docker stats

# Check PostgreSQL performance
docker exec -it postgres psql -U postgres -d wedding_db -c "
  SELECT 
    schemaname,
    tablename,
    pg_total_relation_size(schemaname||'.'||tablename) as size
  FROM pg_tables 
  WHERE schemaname = 'public'
  ORDER BY size DESC;
"
```

### 6.4 Migration Cutover Process

**Day Before Migration:**
1. [ ] Announce maintenance window to users
2. [ ] Backup current Supabase data
3. [ ] Verify staging environment works perfectly
4. [ ] Prepare rollback plan

**Migration Day:**

```bash
# T-60 minutes: Final data sync
./scripts/sync-from-supabase.sh

# T-30 minutes: Enable maintenance mode on Vercel
# Create app/maintenance.tsx page

# T-15 minutes: Final database sync
./scripts/sync-from-supabase.sh

# T-0: Update DNS
# Change A records to point to your server IP

# T+15: Monitor logs
docker compose logs -f

# T+30: Test all functionality
./scripts/run-tests.sh

# T+60: Disable maintenance mode
# Remove maintenance.tsx

# T+120: Monitor for issues
# Check error logs, user reports
```

### 6.5 Post-Migration Monitoring

```bash
# Monitor logs
docker compose logs -f --tail=100

# Check error rates
docker exec postgres psql -U postgres -d wedding_db -c "
  SELECT 
    date_trunc('hour', timestamp) as hour,
    COUNT(*) FILTER (WHERE success = false) as errors
  FROM api_logs
  WHERE timestamp > NOW() - INTERVAL '24 hours'
  GROUP BY hour
  ORDER BY hour DESC;
"

# Monitor disk usage
df -h

# Monitor memory
free -h

# Monitor Docker containers
docker compose ps
docker stats --no-stream
```

---

## Rollback Strategy

### When to Rollback
- Critical functionality broken
- Data integrity issues
- Performance degradation > 50%
- Unable to resolve issues within 2 hours

### Rollback Process

```bash
# Step 1: Update DNS back to Vercel
# Change A records back to Vercel IPs

# Step 2: Verify Vercel deployment is live
curl https://wedding-web.vercel.app/api/health

# Step 3: Sync any new data from self-hosted to Supabase
./scripts/sync-to-supabase.sh

# Step 4: Communicate to users
# "Service restored. Working on improvements."

# Step 5: Analyze what went wrong
docker compose logs > migration-logs.txt
```

### Data Sync Script

```bash
#!/bin/bash
# scripts/sync-to-supabase.sh

echo "Syncing data back to Supabase..."

# Export from PostgreSQL
docker exec postgres pg_dump -U postgres -d wedding_db \
  --data-only \
  --table=guests \
  --table=event_guests \
  > rollback-data.sql

# Import to Supabase
psql $SUPABASE_DATABASE_URL < rollback-data.sql

echo "Sync complete!"
```

---

## Testing Checklist

### Infrastructure Tests
- [ ] All Docker containers running
- [ ] PostgreSQL accepting connections
- [ ] Nginx routing correctly
- [ ] SSL certificates valid
- [ ] DNS resolving correctly

### Application Tests
- [ ] Next.js apps build successfully
- [ ] Environment variables loaded
- [ ] Database migrations applied
- [ ] Authentication working
- [ ] File uploads working

### Feature Tests
- [ ] RSVP submission (all languages)
- [ ] Email sending
- [ ] Admin chat with wedding tools
- [ ] Guest list management
- [ ] Event management
- [ ] Document upload (chat)
- [ ] Web search (chat)
- [ ] Conversation memory (chat)

### Performance Tests
- [ ] Page load time < 3s
- [ ] API response time < 500ms
- [ ] Chat response time < 2s
- [ ] No memory leaks
- [ ] CPU usage < 70%

### Security Tests
- [ ] HTTPS enforced
- [ ] SQL injection protected
- [ ] XSS protected
- [ ] CSRF tokens working
- [ ] Rate limiting active
- [ ] Sensitive data encrypted

---

## Cost Analysis

### Current Costs (Vercel + Supabase)

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Vercel | Hobby/Pro | $0-20 |
| Supabase | Free/Pro | $0-25 |
| Resend | Free | $0 |
| **Total** | | **$0-45** |

### New Costs (Self-Hosted)

| Item | Cost |
|------|------|
| Electricity (~50W 24/7) | ~$5-10/mo |
| Internet (existing) | $0 |
| Domain (existing) | ~$1/mo |
| Resend | $0 |
| **Total Monthly** | **~$6-11/mo** |

**Initial Investment:**
| Item | Cost |
|------|------|
| Server (if needed) | $0-500 (one-time) |
| Mini PC / NUC | $200-400 |
| Or use existing hardware | $0 |

### Annual Savings

**Vercel/Supabase:** $180-540/year  
**Self-Hosted:** $72-132/year  
**Savings:** $108-408/year

### ROI Analysis

If purchasing a $300 Mini PC:
- Payback period: 9-12 months
- 2-year savings: $216-816
- 5-year savings: $540-2040

---

## Timeline

### Conservative Estimate (Part-Time Work)

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Infrastructure Setup | 2 days | Day 2 |
| Database Migration | 2 days | Day 4 |
| Code Refactoring | 4 days | Day 8 |
| Integration | 2 days | Day 10 |
| Deployment Setup | 2 days | Day 12 |
| Testing & Cutover | 3 days | Day 15 |
| **Total** | **15 days** | |

### Aggressive Estimate (Full-Time Focus)

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Infrastructure + DB | 2 days | Day 2 |
| Code Refactoring | 3 days | Day 5 |
| Integration + Deploy | 1 day | Day 6 |
| Testing & Cutover | 1 day | Day 7 |
| **Total** | **7 days** | |

### Realistic Timeline

**Working 2-3 hours per day:**
- Week 1: Infrastructure + Database
- Week 2: Code Refactoring
- Week 3: Integration + Testing
- Week 4: Final testing and cutover

**Total: 3-4 weeks**

---

## Maintenance Plan

### Daily Tasks
- [ ] Check Docker container health
- [ ] Monitor disk space
- [ ] Review error logs

### Weekly Tasks
- [ ] Database backup
- [ ] Security updates
- [ ] Performance review

### Monthly Tasks
- [ ] SSL certificate renewal check
- [ ] Full system backup
- [ ] Dependency updates
- [ ] Cost analysis

### Backup Strategy

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup PostgreSQL
docker exec postgres pg_dumpall -U postgres > "$BACKUP_DIR/postgres_$DATE.sql"

# Backup docker volumes
docker run --rm \
  -v postgres_data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/volumes_$DATE.tar.gz" /data

# Keep last 30 days
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

**Add to crontab:**
```bash
0 2 * * * /home/user/scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

## Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Test connection
docker exec -it postgres psql -U postgres -c "SELECT 1;"

# Fix: Restart container
docker compose restart postgres
```

**2. Nginx 502 Bad Gateway**
```bash
# Check if backend services are running
docker compose ps allerac-one wedding-web

# Check if ports are accessible
curl http://localhost:3000
curl http://localhost:3001

# Check nginx logs
docker compose logs nginx

# Fix: Restart services
docker compose restart allerac-one wedding-web nginx
```

**3. SSL Certificate Issues**
```bash
# Check certificate expiry
openssl x509 -in nginx/certs/fullchain.pem -noout -dates

# Renew certificate
certbot renew

# Restart nginx
docker compose restart nginx
```

**4. Out of Disk Space**
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Clean old logs
truncate -s 0 nginx/logs/*.log
```

**5. Memory Issues**
```bash
# Check memory usage
docker stats

# Increase PostgreSQL memory limit in docker-compose.yml
services:
  postgres:
    deploy:
      resources:
        limits:
          memory: 2G

# Restart
docker compose up -d
```

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Set up development environment** to test migration locally
3. **Create backup** of current Supabase data
4. **Begin Phase 1** infrastructure setup
5. **Document any deviations** from this plan

---

## Additional Resources

- [Allerac-One Repository](https://github.com/Allerac/allerac-one)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Migration Guide](https://www.postgresql.org/docs/current/migration.html)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [Let's Encrypt SSL Guide](https://letsencrypt.org/getting-started/)

---

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-04 | Initial | Created migration plan document |

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** February 4, 2026
