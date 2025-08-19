# Production Deployment Guide

## Prerequisites

### System Requirements
- Node.js 16+ 
- RAM: 512MB minimum, 1GB recommended
- Storage: 1GB minimum
- Network: Stable internet connection

### Environment Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Create SSL certificates (for production)

## Deployment Options

### 1. Vercel (Recommended for Serverless)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/enhanced-server.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/enhanced-server.js"
    },
    {
      "src": "/(.*)",
      "dest": "public/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2. Docker Deployment

**Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Create logs directory
RUN mkdir -p logs

# Set permissions
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  smartvision-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - smartvision-api
    restart: unless-stopped

volumes:
  logs:
```

### 3. PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'smartvision-api',
    script: 'server/enhanced-server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

## SSL/TLS Configuration

### Let's Encrypt (Free SSL)
```bash
# Install Certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    location / {
        root /app/public;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}

# Rate limiting configuration
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

## Database Integration (Future Enhancement)

### MongoDB Setup
```javascript
// database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### Redis for Caching
```javascript
// redis.js
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = redis;
```

## Monitoring and Alerting

### Health Monitoring
```javascript
// monitoring.js
const prometheus = require('prom-client');

// Metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status']
});

const deviceConnections = new prometheus.Gauge({
  name: 'active_device_connections',
  help: 'Number of active device connections'
});

module.exports = { httpRequestDuration, deviceConnections };
```

### Log Management
```bash
# Logrotate configuration
sudo vim /etc/logrotate.d/smartvision

/app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 node node
    postrotate
        pm2 reload smartvision-api
    endscript
}
```

## Performance Optimization

### 1. Enable Compression
Already included in enhanced server with `compression` middleware.

### 2. Caching Strategy
- API responses cached with `node-cache`
- Static files cached by nginx
- Database queries cached with Redis (future)

### 3. Load Balancing
```javascript
// cluster.js
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  require('./server/enhanced-server.js');
  console.log(`Worker ${process.pid} started`);
}
```

## Security Checklist

- ✅ HTTPS enforced
- ✅ Helmet security headers
- ✅ Rate limiting implemented
- ✅ Input validation
- ✅ CORS configured
- ✅ Environment variables secured
- ✅ Regular security updates
- ✅ API authentication
- ✅ Request logging
- ✅ Error handling without data leakage

## Backup Strategy

### 1. Database Backups
```bash
# MongoDB backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$DATABASE_URL" --out="/backups/mongodb_$DATE"
```

### 2. Log Archival
```bash
# Log archival script
#!/bin/bash
tar -czf "/backups/logs_$(date +%Y%m%d).tar.gz" /app/logs/
```

### 3. Configuration Backup
```bash
# Backup critical configs
cp .env "/backups/env_$(date +%Y%m%d)"
cp ecosystem.config.js "/backups/"
```

## Deployment Commands

```bash
# Production deployment
npm run build
npm start

# With Docker
docker-compose up -d --build

# With PM2
pm2 start ecosystem.config.js --env production

# Health check
curl https://your-domain.com/api/health
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

2. **Memory issues**
   ```bash
   pm2 monit
   # Check memory usage and restart if needed
   pm2 restart smartvision-api
   ```

3. **SSL certificate issues**
   ```bash
   sudo certbot renew --dry-run
   ```

4. **Database connection issues**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod
   
   # Check Redis status
   redis-cli ping
   ```

## Maintenance

### Regular Tasks
- Monitor logs: `tail -f logs/combined.log`
- Check metrics: `curl http://localhost:3000/api/health`
- Update dependencies: `npm audit fix`
- Rotate logs: Automatic with logrotate
- SSL renewal: Automatic with cron job

### Performance Monitoring
```bash
# PM2 monitoring
pm2 monit

# System resources
htop
df -h
free -m

# Network connectivity
ping 8.8.8.8
curl -I https://router.project-osrm.org
```
