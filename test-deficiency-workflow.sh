#!/bin/bash

# Test RoofMind Deficiency Alert Workflow
curl -X POST https://mkidder97.app.n8n.cloud/webhook-test/roofmind-deficiency-alerts \
  -H "Content-Type: application/json" \
  -d '{
    "inspection_id": "test-123",
    "property_name": "Test Property - 123 Main St",
    "property_address": "123 Main St, Austin, TX 78701",
    "inspector_name": "John Smith",
    "deficiencies": [
      {
        "id": "def-1",
        "category": "Membrane Failures",
        "description": "Significant membrane failure detected in northwest corner requiring immediate attention",
        "location": "Northwest corner",
        "budgetAmount": 8500,
        "severity": "high",
        "isImmediateRepair": false,
        "photos": [{"url": "https://example.com/photo1.jpg"}]
      },
      {
        "id": "def-2", 
        "category": "Immediate Repair",
        "description": "Structural damage requiring immediate repair to prevent water intrusion",
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