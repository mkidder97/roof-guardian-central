# RoofMind n8n Automation Workflows

This directory contains production-ready n8n workflow configurations for automated deficiency alerts and AI-enhanced inspection reviews.

## Workflows Overview

### 1. Deficiency Alert Automation (`deficiency-alert-automation.json`)
**Purpose:** Automatically detect and alert on critical deficiencies from inspection data

**Webhook URL:** `https://mkidder97.app.n8n.cloud/webhook/roofmind-deficiency-alerts`

**Triggers:**
- Inspection completion
- Deficiency autosave batch processing

**Detection Logic:**
- **Membrane Failure:** Searches `description` field for "membrane failure" (case-insensitive)
- **Immediate Repair:** Checks for `isImmediateRepair: true` flag

**Email Recipients:**
- Membrane failures → `michaelkidder2@gmail.com`
- Immediate repairs → `repairs@roofmind.app`

### 2. AI Inspection Review & Report Generation (`inspection-review-automation.json`)
**Purpose:** AI-powered quality review with enhanced report generation and human oversight

**Webhook URL:** `https://mkidder97.app.n8n.cloud/webhook/roofmind-inspection-review`

**Triggers:**
- Inspection status = `completed` or `ready_for_review`

**AI Enhancement Pipeline:**
1. **Perfect Inspection Criteria Scoring**
2. **OpenRouter AI Analysis** (Claude 3.5 Sonnet)
3. **Enhanced Report Generation**
4. **Database Storage** (Supabase `inspection_reports` table)
5. **Human Review Workflow**

## Setup Instructions

### 1. Import Workflows
1. Log into `mkidder97.app.n8n.cloud`
2. Go to Workflows → Import from File
3. Upload each JSON file separately

### 2. Configure Credentials

#### Gmail OAuth2 (`gmail-roofmind`)
1. Go to Credentials → Add Credential → Gmail OAuth2
2. Name: `Gmail RoofMind Account`
3. Set up OAuth2 with Google Console
4. Authorize for both `michaelkidder2@gmail.com` sending

#### OpenRouter API (`openrouter-api`)
1. Go to Credentials → Add Credential → HTTP Header Auth
2. Name: `OpenRouter API Key`
3. Header: `Authorization`
4. Value: `Bearer YOUR_OPENROUTER_API_KEY`

### 3. Test Webhooks

#### Test Deficiency Alerts:
```bash
curl -X POST https://mkidder97.app.n8n.cloud/webhook/roofmind-deficiency-alerts \
  -H "Content-Type: application/json" \
  -d '{
    "inspection_id": "test-123",
    "property_name": "Test Property",
    "property_address": "123 Main St",
    "inspector_name": "John Smith",
    "deficiencies": [
      {
        "id": "def-1",
        "category": "Membrane Failures",
        "description": "Significant membrane failure detected in northwest corner",
        "location": "Northwest corner",
        "budgetAmount": 8500,
        "severity": "high",
        "isImmediateRepair": false,
        "photos": [{"url": "https://example.com/photo1.jpg"}]
      },
      {
        "id": "def-2", 
        "category": "Immediate Repair",
        "description": "Structural damage requiring immediate attention",
        "location": "Main entrance",
        "budgetAmount": 12000,
        "severity": "high",
        "isImmediateRepair": true,
        "needsSupervisorAlert": true,
        "criticalityScore": 85,
        "photos": [{"url": "https://example.com/photo2.jpg"}]
      }
    ]
  }'
```

#### Test AI Review:
```bash
curl -X POST https://mkidder97.app.n8n.cloud/webhook/roofmind-inspection-review \
  -H "Content-Type: application/json" \
  -d '{
    "inspection_id": "test-456",
    "property_name": "Test Property",
    "property_address": "456 Oak Ave",
    "inspector_name": "Sarah Johnson",
    "status": "completed",
    "executiveSummary": {
      "summaryText": "Overall roof condition is fair with several areas requiring attention",
      "overallCondition": "Fair",
      "overallRating": 3,
      "keyFindings": ["Membrane wear in multiple areas", "Drainage issues noted"],
      "budgetRecommendation": "Minor Repairs"
    },
    "deficiencies": [
      {
        "category": "Membrane Failures",
        "description": "Localized membrane deterioration",
        "location": "South section", 
        "budgetAmount": 4500,
        "severity": "medium"
      }
    ],
    "photos": [
      {"type": "overview", "url": "https://example.com/overview1.jpg"},
      {"type": "overview", "url": "https://example.com/overview2.jpg"},
      {"type": "deficiency", "url": "https://example.com/deficiency1.jpg"}
    ],
    "notes": "Inspection conducted under clear weather conditions. Full roof access achieved via ladder."
  }'
```

## Integration with RoofMind Codebase

### Frontend Trigger Points

#### 1. Deficiency Alerts
Add to `useInspectionAutosave.ts` completion handler:

```typescript
const triggerDeficiencyAlerts = async (inspectionData: any) => {
  if (inspectionData.deficiencies?.length > 0) {
    try {
      await fetch('https://mkidder97.app.n8n.cloud/webhook/roofmind-deficiency-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_id: inspectionData.id,
          property_name: inspectionData.property_name,
          property_address: inspectionData.property_address,
          inspector_name: inspectionData.inspector_name,
          deficiencies: inspectionData.deficiencies
        })
      });
    } catch (error) {
      console.error('Failed to trigger deficiency alerts:', error);
    }
  }
};

// Call after inspection completion
await triggerDeficiencyAlerts(completedInspectionData);
```

#### 2. AI Review Workflow
Add to inspection completion flow:

```typescript
const triggerAIReview = async (inspectionData: any) => {
  if (inspectionData.status === 'completed' || inspectionData.ready_to_send) {
    try {
      await fetch('https://mkidder97.app.n8n.cloud/webhook/roofmind-inspection-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inspectionData)
      });
    } catch (error) {
      console.error('Failed to trigger AI review:', error);
    }
  }
};
```

### Perfect Inspection Criteria Configuration

The AI workflow includes a configurable quality scoring system:

**Photo Coverage (30% of score):**
- Minimum 4 overview photos (N/S/E/W)
- 2+ photos per deficiency
- Bonus points for comprehensive coverage

**Deficiency Documentation (40% of score):**
- Complete descriptions (20+ characters)
- Specific locations
- Cost estimates for all items
- Severity classifications

**Completeness Documentation (30% of score):**
- Executive summary (100+ characters)
- Inspection notes (50+ characters)
- Weather conditions documented
- Safety/access procedures noted

### Database Integration

The AI workflow automatically:
1. Creates records in `inspection_reports` table
2. Updates `report_url` with PDF link
3. Sets `status` based on AI recommendation
4. Stores AI findings and recommendations
5. Links photos and cost estimates

### Report Download System

Enhanced reports are:
1. Generated as HTML with professional styling
2. Stored in Supabase Storage as PDFs
3. Linked to building inspection history
4. Accessible via admin dashboard
5. Emailed to stakeholders with edit links

## Quality Assurance Features

- **Error Handling:** Graceful failures with detailed error responses
- **Data Validation:** Input validation for all webhook endpoints
- **Retry Logic:** Built-in retry for email failures
- **Monitoring:** Comprehensive logging and status tracking
- **Security:** API key authentication and rate limiting

## Customization

Both workflows are designed to be easily customizable:
- Modify email templates in the Gmail nodes
- Adjust AI prompts in the OpenRouter node
- Change quality scoring weights in the JavaScript code
- Add new detection rules or email recipients
- Configure different trigger conditions

## Support

For questions or issues:
1. Check n8n execution logs for errors
2. Verify webhook URLs are accessible
3. Confirm all credentials are properly configured
4. Test with the provided curl commands
5. Contact development team for workflow modifications