# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an enterprise domain management system that provides automated domain and SSL certificate monitoring, alerting, and management capabilities. It's designed to prevent domain expiration and SSL certificate issues through intelligent scanning and notifications.

## Architecture

The system follows a full-stack architecture:

- **Frontend**: React 18 + Tailwind CSS + Vite (port 80)
- **Backend**: Node.js + Express + MongoDB (port 3001) 
- **Database**: MongoDB (port 27017)
- **Deployment**: Docker + Docker Compose
- **Scheduled Tasks**: node-cron for automated scanning and alerts

## Development Commands

### System Management (Primary)
```bash
# Start the entire system (Docker Compose)
./start.sh                    # International servers (default Docker registries)
./build-for-china.sh         # China servers (with mirror acceleration)

# System operations
./manager.sh status          # Check system status
./manager.sh restart         # Restart all services
./manager.sh logs            # View logs
./manager.sh rebuild         # Full rebuild (when docker-compose.yml changes)
./manager.sh cleanup         # Clean Docker resources

# Data operations
./backup.sh                  # Backup database
./stop.sh                    # Stop system
```

### Frontend Development
```bash
cd frontend/
npm run dev                  # Development server (http://localhost:5173)
npm run build               # Production build
npm run preview             # Preview production build
```

### Backend Development
```bash
cd backend/
npm start                   # Start backend server (port 3001)
```

## Core Services & Components

### Backend Services (backend/src/)
- **app.js**: Main application entry point with cron job configuration
- **routes.js**: API endpoints and batch scanning functions
- **models.js**: MongoDB schemas (Domain, SSLCertificate, ScanTask, AlertConfig, etc.)
- **domainScanner.js**: WHOIS domain scanning logic
- **sslChecker.js**: SSL certificate validation
- **alertService.js**: Multi-platform notification system (DingTalk, WeChat Work, Feishu)
- **evaluationService.js**: Smart renewal recommendation engine

### Frontend Pages (frontend/src/pages/)
- **DashboardPage.jsx**: Overview with statistics and charts
- **HomePage.jsx**: Domain management (CRUD, CSV import/export, batch scanning)
- **SSLPage.jsx**: SSL certificate monitoring
- **AlertsPage.jsx**: Notification configuration and history
- **SettingsPage.jsx**: System configuration
- **HelpPage.jsx**: User documentation

### Key Features
1. **Automated Scanning**: Daily WHOIS and SSL certificate checks via cron jobs
2. **Smart Evaluation**: 6-tier renewal recommendations (紧急续费/建议续费/保持续费/请示领导/待评估/不续费)
3. **Multi-channel Alerts**: DingTalk, WeChat Work, Feishu webhook notifications
4. **Batch Operations**: CSV import/export with encoding auto-detection
5. **Real-time Monitoring**: Dashboard with expiration trends and status visualization

## Environment Configuration

Key environment variables (configured in .env):
- `MONGODB_URI`: Database connection string
- `SCAN_ENABLED`: Enable domain scanning (true/false)
- `SCAN_CRON`: Domain scan schedule (default: "30 4 * * *")
- `SSL_SCAN_ENABLED`: Enable SSL scanning (true/false)  
- `SSL_SCAN_CRON`: SSL scan schedule (default: "0 5 * * *")
- `ALERT_ENABLED`: Enable alerts (true/false)
- `ALERT_CRON`: Alert schedule (default: "0 12 * * *")

## Database Schema

### Core Models
- **Domain**: Domain records with expiry dates, renewal suggestions, business metadata
- **SSLCertificate**: SSL certificate details with status tracking
- **ScanTask**: Batch scanning job tracking with progress monitoring
- **AlertConfig**: Multi-platform notification configuration
- **EvaluationConfig**: Smart evaluation rule configuration

## Testing & Validation

```bash
./test.sh                   # System functionality tests
./test.sh alert dingtalk    # Test specific alert channel
```

## Important Development Notes

- The system is designed for Chinese enterprise environments (timezone: Asia/Shanghai)
- Supports Chinese domain extensions (.cn, .com.cn, etc.) with dedicated WHOIS servers
- Multi-language support with Chinese UI text and error messages
- Encoding detection for CSV files to handle Excel/WPS exports
- Rate limiting and batch processing to prevent API overload during scans
- Graceful shutdown handling for cron jobs and database connections

## Data Management

- Logs stored in `/logs/` directory
- Backups stored in `/backups/` directory  
- Scan data persisted in `/data/` directory
- SSL checker utilities in `/ssl-checker/` directory

## Docker Services

The system runs three main containers:
- `frontend`: Nginx serving React build (port 80)
- `backend`: Node.js API server (port 3001)
- `mongodb`: Database with persistent volume storage (port 27017)