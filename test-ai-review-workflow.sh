#!/bin/bash

# Test RoofMind AI Review Workflow
curl -X POST https://mkidder97.app.n8n.cloud/webhook/roofmind-inspection-review \
  -H "Content-Type: application/json" \
  -d '{
    "inspection_id": "test-456",
    "property_name": "Test Property - 456 Oak Ave",
    "property_address": "456 Oak Ave, Austin, TX 78704",
    "inspector_name": "Sarah Johnson",
    "status": "completed",
    "executiveSummary": {
      "summaryText": "Overall roof condition is fair with several areas requiring attention. The membrane shows signs of wear and multiple drainage issues were observed.",
      "overallCondition": "Fair",
      "overallRating": 3,
      "keyFindings": ["Membrane wear in multiple areas", "Drainage issues noted", "Flashing needs resealing"],
      "budgetRecommendation": "Minor Repairs"
    },
    "deficiencies": [
      {
        "category": "Membrane Failures",
        "description": "Localized membrane deterioration on south section",
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