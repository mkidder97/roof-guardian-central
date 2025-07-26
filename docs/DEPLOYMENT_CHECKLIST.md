# Direct Inspection Feature - Deployment Checklist

## Pre-Deployment Checklist

### Code Validation
- [ ] All unit tests passing (`npm run test:unit`)
- [ ] Direct inspection tests passing (`npm run test:direct-inspection`)
- [ ] Status transition tests passing (`npm run test:status-transitions`)
- [ ] Integration tests passing (`npm run test:integration`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Database consistency tests passing (`npm run test:consistency`)
- [ ] Linting passing (`npm run lint`)
- [ ] Type checking passing (`npx tsc --noEmit`)

### Database Preparation
- [ ] All migrations reviewed and tested
- [ ] Database backup created
- [ ] Migration rollback scripts prepared
- [ ] Database functions validated:
  - [ ] `create_direct_inspection`
  - [ ] `transition_inspection_status`
  - [ ] `get_active_inspection_session`
  - [ ] `validate_status_transition`
  - [ ] `get_inspection_session_status`

### Frontend Components
- [ ] BuildingDetailsDialog tested on mobile devices
- [ ] InspectionSchedulingModal functionality verified
- [ ] Status transitions UI working correctly
- [ ] Offline mode functionality tested
- [ ] Autosave feature validated

### API Endpoints
- [ ] `/api/inspections/direct/create` tested
- [ ] `/api/inspections/direct/status` tested
- [ ] `/api/inspections/sessions/active` tested
- [ ] `/api/inspections/transitions/validate` tested
- [ ] Error handling verified for all endpoints

### Infrastructure
- [ ] Staging environment configured
- [ ] Production environment configured
- [ ] Feature flags set correctly:
  - [ ] `VITE_FEATURE_DIRECT_INSPECTION=true`
  - [ ] `VITE_ENABLE_STATUS_SYSTEM=true`
- [ ] Monitoring configured
- [ ] Alerting thresholds set
- [ ] Rollback procedures tested

## Deployment Process

### 1. Staging Deployment
```bash
# Run staging deployment
git checkout feature/inspector-interface
git pull origin feature/inspector-interface

# Trigger staging deployment
gh workflow run deploy.yml -f environment=staging -f run_migrations=true

# Verify staging deployment
curl https://staging.roof-guardian.com/api/health
```

### 2. Staging Validation
- [ ] Direct inspection creation working
- [ ] Status transitions functioning
- [ ] Inspector interface accessible
- [ ] Performance metrics acceptable
- [ ] No errors in logs

### 3. Production Deployment
```bash
# Create PR to main branch
gh pr create --title "Deploy Direct Inspection Feature" \
  --body "Deploying direct inspection scheduling workflow"

# After PR approval and merge
git checkout main
git pull origin main

# Trigger production deployment
gh workflow run deploy.yml -f environment=production -f run_migrations=true
```

### 4. Production Validation
- [ ] All staging validation checks
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Monitoring dashboards active
- [ ] Performance within SLAs

## Post-Deployment Tasks

### Monitoring
- [ ] API response times < 200ms (p95)
- [ ] Database query times < 100ms
- [ ] Error rate < 0.5%
- [ ] Frontend performance metrics:
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1

### Documentation
- [ ] User documentation updated
- [ ] API documentation updated
- [ ] Database schema documentation updated
- [ ] Runbook updated with new procedures

### Communication
- [ ] Deployment notification sent
- [ ] Feature announcement prepared
- [ ] Support team briefed
- [ ] Customer success team notified

## Rollback Procedures

If issues are detected:

1. **Immediate Rollback**
   ```bash
   ./scripts/rollback-deployment.sh production "Issue detected with direct inspection"
   ```

2. **Manual Rollback Steps**
   - Disable feature flags
   - Restore previous application version
   - Rollback database migrations
   - Clear CDN cache
   - Verify system health

3. **Post-Rollback**
   - Document issue
   - Create incident report
   - Plan remediation
   - Schedule retry

## Environment-Specific Notes

### Staging
- Lower performance thresholds acceptable
- Debug logging enabled
- Feature flag UI visible
- Extended session timeouts

### Production
- Strict performance requirements
- Error logging only
- Feature flags hidden
- Standard session timeouts
- CDN enabled

## Contact Information

- **DevOps Lead**: devops@roof-guardian.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Escalation**: engineering-leads@roof-guardian.com

## Appendix

### Useful Commands

```bash
# Check deployment status
gh run list --workflow=deploy.yml

# View deployment logs
gh run view <run-id> --log

# Monitor application health
curl https://app.roof-guardian.com/api/health

# Check feature flags
curl https://app.roof-guardian.com/api/features

# Database connection test
psql $DATABASE_URL -c "SELECT version();"
```

### Performance Benchmarks

| Metric | Target | Critical |
|--------|---------|----------|
| API Response Time (p95) | < 200ms | > 500ms |
| DB Query Time | < 100ms | > 300ms |
| Frontend Load Time | < 2s | > 5s |
| Error Rate | < 0.5% | > 2% |
| Uptime | > 99.9% | < 99.5% |