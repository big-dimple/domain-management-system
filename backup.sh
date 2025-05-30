#!/bin/bash
echo "备份数据库..."
timestamp=$(date +%Y%m%d_%H%M%S)
./dc.sh exec -T mongodb mongodump --archive > "./backups/backup_$timestamp.gz"
echo "备份完成: ./backups/backup_$timestamp.gz"
