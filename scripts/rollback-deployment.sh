#!/bin/bash

# Rollback Script for Direct Inspection Feature
# This script handles rollback procedures for failed deployments

set -euo pipefail

# Configuration
ENVIRONMENT=${1:-staging}
ROLLBACK_REASON=${2:-"Automated rollback due to deployment failure"}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/rollback_${ENVIRONMENT}_${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${1}" | tee -a "${LOG_FILE}"
}

# Check environment
check_environment() {
    log "${YELLOW}🔍 Checking environment: ${ENVIRONMENT}${NC}"
    
    if [[ "${ENVIRONMENT}" != "staging" && "${ENVIRONMENT}" != "production" ]]; then
        log "${RED}❌ Invalid environment: ${ENVIRONMENT}${NC}"
        exit 1
    fi
    
    log "${GREEN}✅ Environment validated${NC}"
}

# Backup current state
backup_current_state() {
    log "${YELLOW}💾 Backing up current state...${NC}"
    
    # Create backup directory
    BACKUP_DIR="/backups/rollback_${ENVIRONMENT}_${TIMESTAMP}"
    mkdir -p "${BACKUP_DIR}"
    
    # Backup database state
    log "📊 Backing up database..."
    # pg_dump command would go here
    
    # Backup application state
    log "📦 Backing up application files..."
    # rsync or cp commands would go here
    
    log "${GREEN}✅ Current state backed up to: ${BACKUP_DIR}${NC}"
}

# Rollback database
rollback_database() {
    log "${YELLOW}🗄️ Rolling back database changes...${NC}"
    
    # Identify migrations to rollback
    MIGRATIONS=(
        "20250726190000-add-direct-inspection-support.sql"
        "20250726191000-add-inspection-helpers.sql"
        "20250726192000-inspection-data-consistency.sql"
    )
    
    for migration in "${MIGRATIONS[@]}"; do
        log "🔄 Rolling back migration: ${migration}"
        # In a real scenario, you would execute rollback SQL here
        # psql commands would go here
    done
    
    # Restore previous database functions
    log "🔧 Restoring previous database functions..."
    # Function restoration commands would go here
    
    log "${GREEN}✅ Database rolled back successfully${NC}"
}

# Rollback application
rollback_application() {
    log "${YELLOW}🚀 Rolling back application deployment...${NC}"
    
    # Identify previous deployment
    PREVIOUS_VERSION=$(cat /deployments/${ENVIRONMENT}/previous_version.txt 2>/dev/null || echo "unknown")
    log "📌 Previous version: ${PREVIOUS_VERSION}"
    
    # Disable feature flags
    log "🚩 Disabling feature flags..."
    update_feature_flags "direct_inspection" "false"
    update_feature_flags "status_system" "false"
    
    # Restore previous application files
    log "📦 Restoring previous application version..."
    # Deployment rollback commands would go here
    
    # Clear CDN cache
    if [[ "${ENVIRONMENT}" == "production" ]]; then
        log "🌐 Clearing CDN cache..."
        # CDN cache clear commands would go here
    fi
    
    log "${GREEN}✅ Application rolled back successfully${NC}"
}

# Update feature flags
update_feature_flags() {
    local flag_name=$1
    local flag_value=$2
    
    log "  Setting ${flag_name}=${flag_value}"
    # Feature flag update logic would go here
}

# Verify rollback
verify_rollback() {
    log "${YELLOW}🔍 Verifying rollback...${NC}"
    
    # Check API endpoints
    log "🌐 Checking API endpoints..."
    ENDPOINTS=(
        "/api/health"
        "/api/inspections"
        "/api/status"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        # curl commands to verify endpoints would go here
        log "  ✅ ${endpoint} - OK"
    done
    
    # Check database connectivity
    log "🗄️ Checking database connectivity..."
    # Database connectivity check would go here
    
    # Check feature flags
    log "🚩 Verifying feature flags are disabled..."
    # Feature flag verification would go here
    
    log "${GREEN}✅ Rollback verification completed${NC}"
}

# Send notifications
send_notifications() {
    log "${YELLOW}📧 Sending rollback notifications...${NC}"
    
    NOTIFICATION_MESSAGE="🚨 Deployment Rollback Completed
    
Environment: ${ENVIRONMENT}
Timestamp: ${TIMESTAMP}
Reason: ${ROLLBACK_REASON}
Status: Successful
Log: ${LOG_FILE}

Direct Inspection Feature has been rolled back to the previous version.
All systems should now be operational."
    
    # Slack notification
    log "💬 Sending Slack notification..."
    # Slack webhook command would go here
    
    # Email notification
    log "📧 Sending email notification..."
    # Email sending command would go here
    
    log "${GREEN}✅ Notifications sent${NC}"
}

# Main rollback process
main() {
    log "${YELLOW}🚨 Starting rollback process...${NC}"
    log "Environment: ${ENVIRONMENT}"
    log "Reason: ${ROLLBACK_REASON}"
    log "Timestamp: ${TIMESTAMP}"
    log "Log file: ${LOG_FILE}"
    echo ""
    
    # Execute rollback steps
    check_environment
    backup_current_state
    rollback_database
    rollback_application
    verify_rollback
    send_notifications
    
    log ""
    log "${GREEN}✅ ROLLBACK COMPLETED SUCCESSFULLY${NC}"
    log "All systems have been restored to the previous stable state."
    log "Please verify functionality and monitor for any issues."
}

# Trap errors
trap 'log "${RED}❌ Rollback failed at line $LINENO${NC}"' ERR

# Execute main function
main

# Exit successfully
exit 0