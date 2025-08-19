# Logs Directory

This directory contains application logs:

- `combined.log` - All log levels combined
- `error.log` - Error level logs only
- `access.log` - Request access logs

Logs are rotated automatically and old logs are archived.

## Log Format
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Request processed",
  "service": "family-safety-api",
  "method": "POST",
  "url": "/api/update-location",
  "status": 200,
  "duration": "15ms",
  "deviceId": "ESP32_001"
}
```
