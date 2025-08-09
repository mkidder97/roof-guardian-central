# Testing n8n Integration with RoofMind

## Overview
This guide helps you test the n8n workflow integration after fixing the database schema issues.

## Prerequisites
1. **Fixed Schema Issues** ✅ - We've removed non-existent columns:
   - Removed `inspection_status` from `inspections` table updates
   - Removed `inspection_status` and `status_change_reason` from `inspection_sessions` updates

2. **Configure n8n Secrets** (Required for workflows to actually trigger)
   ```bash
   # Run from project root
   ./scripts/configure-n8n-secrets.sh
   ```

## Testing Steps

### 1. Test Inspection Completion
1. Open the app in Lovable
2. Navigate to Inspector Interface
3. Create a test inspection with:
   - ✅ At least one overview photo
   - ✅ At least one deficiency containing either:
     - "membrane failure" in description (triggers email to michaelkidder2@gmail.com)
     - Category set to "Immediate Repair" (triggers email to repairs@roofmind.app)
4. Click "Complete Inspection"

### 2. Check Browser Console
Look for these success indicators:
```
🔥 [ActiveInspectionInterface] COMPLETE BUTTON CLICKED! 🔥
✅ [ActiveInspectionInterface] Basic validation passed
✅ [ActiveInspectionInterface] Session ID validated
🚀 [Inspector Interface] Starting n8n workflow trigger section...
✅ [Inspector Interface] Module imported successfully
🎯 [Inspector Interface] About to call triggerInspectionWorkflows...
🎉 [Inspector Interface] Workflow call completed!
```

If you see errors:
- **"column inspection_status does not exist"** - Schema fix didn't apply, restart Lovable
- **"n8n integration not configured"** - Need to set secrets using the script above
- **Network errors** - Check n8n webhook URLs are correct

### 3. Manual Testing (Browser Console)

```javascript
// Test the workflow triggers manually
testN8nWorkflows.runTests()

// Or test specific scenarios:

// Test membrane failure alert
testN8nWorkflows.testDirect()  // Tests direct webhook (won't work from Lovable due to CORS)
testN8nWorkflows.testProxy()   // Tests via Supabase proxy (recommended)

// Create custom test data
const testData = testN8nWorkflows.createTestData()
console.log(testData)
```

### 4. Check n8n Workflow Logs
1. Log into your n8n instance (https://mkidder97.app.n8n.cloud)
2. Check the execution history for:
   - `RoofMind Deficiency Alert Automation`
   - `RoofMind AI Inspection Review`
3. Look for incoming webhook data

### 5. Verify Edge Function Logs
```bash
# View edge function logs
supabase functions logs trigger-workflow

# Look for:
# 🚀 Triggering n8n workflow
# ✅ n8n workflow triggered successfully
# ❌ n8n workflow failed (with error details)
```

## Troubleshooting

### Issue: "Failed to complete inspection"
**Solution:** Check browser console for specific error. Most likely causes:
- Database schema mismatch (fixed in this update)
- Authentication issues (re-login)
- Missing session data (restart inspection)

### Issue: Workflows don't trigger
**Solution:** 
1. Verify secrets are set: `supabase secrets list`
2. Check edge function logs for errors
3. Verify n8n workflows are active and listening
4. Test connectivity: `testN8nWorkflows.testProxy()`

### Issue: CORS errors
**Solution:** Ensure `VITE_USE_SUPABASE_PROXY=true` in `.env.local`

## Expected Workflow Behavior

### Deficiency Alert Workflow
Triggers when inspection has deficiencies with:
- **Membrane Failure**: Sends email to michaelkidder2@gmail.com
- **Immediate Repair**: Sends email to repairs@roofmind.app

### AI Review Workflow  
Triggers for all completed inspections to:
- Analyze inspection quality
- Generate enhanced reports
- Send summary to michaelkidder2@gmail.com

## Success Criteria
✅ Inspection completes without database errors
✅ Console shows successful workflow trigger logs
✅ n8n shows incoming webhook data
✅ Emails are sent based on deficiency types