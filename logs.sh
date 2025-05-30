#!/bin/bash
case "$1" in
    scan)
        echo "查看域名扫描日志..."
        tail -f ./logs/scan_$(date +%Y-%m-%d).log
        ;;
    ssl)
        echo "查看SSL扫描日志..."
        tail -f ./logs/ssl_$(date +%Y-%m-%d).log
        ;;
    alert)
        echo "查看告警日志..."
        tail -f ./logs/alert_$(date +%Y-%m-%d).log
        ;;
    *)
        ./dc.sh logs -f $1
        ;;
esac
