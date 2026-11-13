# Database Backup and Disaster Recovery Guide

This document describes the backup procedure and step-by-step restoration workflow for Namma Dina.

---

## 1. Automated Backups

### Production (Neon / Render PostgreSQL)
Run the automated backup script with `DATABASE_URL` configured in your environment:

```bash
DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/nammadina?sslmode=require" ./scripts/backup.sh /path/to/backup/storage
```

The script:
- Dumps the complete schema and data with `pg_dump`.
- Compresses the output with `gzip` (`nammadina_YYYYMMDD_HHMMSS.sql.gz`).
- Automatically prunes archives older than 7 days.

### Local Development (Docker)
Ensure Docker is running and execute:

```bash
# Linux / macOS
./scripts/backup.sh

# Windows PowerShell
./scripts/backup.ps1
```

---

## 2. Restoration Procedure

### From Compressed SQL Archive (.sql.gz)

1. Uncompress the archive:
   ```bash
   gunzip -k nammadina_20261113_230000.sql.gz
   ```

2. Restore to PostgreSQL:
   ```bash
   # Production target
   psql "$DATABASE_URL" < nammadina_20261113_230000.sql

   # Local Docker target
   docker exec -i nammadina-db-1 psql -U postgres nammadina < nammadina_20261113_230000.sql
   ```

3. Run migrations to ensure schema consistency:
   ```bash
   npm run db:deploy
   ```

4. Verify database health:
   ```bash
   curl -I https://api.yourdomain.com/api/health
   ```

---

## 3. Recommended Schedule

Set up a daily cron job on your deployment server or worker:

```cron
0 3 * * * cd /opt/namma-dina && ./scripts/backup.sh /var/backups/nammadina >> /var/log/namma-backup.log 2>&1
```

