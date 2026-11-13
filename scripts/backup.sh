#!/usr/bin/env bash
set -euo pipefail

# Namma Dina - Automated PostgreSQL Database Backup Script
# Usage: ./scripts/backup.sh [output_dir]

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/nammadina_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "==> Starting Namma Dina database backup..."

if [ -n "${DATABASE_URL:-}" ]; then
  pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"
elif command -v docker &> /dev/null && docker ps | grep -q nammadina-db; then
  echo "==> Backing up from local Docker PostgreSQL container..."
  docker exec -t nammadina-db-1 pg_dump -U postgres nammadina | gzip > "${BACKUP_FILE}"
else
  echo "Error: Neither DATABASE_URL is set nor is nammadina-db Docker container running." >&2
  exit 1
fi

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "==> Backup completed successfully: ${BACKUP_FILE} (${FILE_SIZE})"

# Retention: keep last 7 daily backups
echo "==> Pruning backups older than 7 days in ${BACKUP_DIR}..."
find "${BACKUP_DIR}" -type f -name "nammadina_*.sql.gz" -mtime +7 -delete

echo "==> Done."

