#!/bin/bash

# 数据备份脚本
# 定时任务: crontab -e
# 0 2 * * * /path/to/backup.sh

BACKUP_DIR="/data/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="/data/c-store.db"

mkdir -p $BACKUP_DIR

if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_DIR/db_$DATE.db"
    echo "✅ 数据库已备份: db_$DATE.db"
    
    # 只保留最近7天备份
    find $BACKUP_DIR -name "db_*.db" -mtime +7 -delete
    echo "🧹 已清理7天前的旧备份"
else
    echo "⚠️ 数据库文件不存在"
fi
