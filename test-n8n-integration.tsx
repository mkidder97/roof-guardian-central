import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { n8nWorkflowTriggers } from '@/lib/n8nWorkflowTriggers';
import type { DeficiencyAlertPayload, InspectionReviewPayload } from '@/lib/n8nWorkflowTriggers';

export function TestN8nIntegration() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testDeficiencyAlert = async () => {
    setLoading(true);
    
    const payload: DeficiencyAlertPayload = {
      inspection_id: 'test-' + Date.now(),
      property_name: 'Test Property - 123 Main St',
      property_address: '123 Main St, Austin, TX 78701',
      inspector_name: 'Test Inspector',
      deficiencies: [
        {
          id: 'def-1',
          category: 'Membrane Failures',
          description: 'Significant membrane failure detected in northwest corner requiring immediate attention',
          location: 'Northwest corner',
          budgetAmount: 8500,
          severity: 'high',
          isImmediateRepair: false,
          photos: [{ url: 'https://example.com/photo1.jpg' }]
        },
        {
          id: 'def-2',
          category: 'Immediate Repair',
          description: 'Structural damage requiring immediate repair to prevent water intrusion',
          location: 'Main entrance',
          budgetAmount: 12000,
          severity: 'high',
          isImmediateRepair: true,
          needsSupervisorAlert: true,
          criticalityScore: 85,
          photos: [{ url: 'https://example.com/photo2.jpg' }]
        }
      ]
    };

    try {
      const result = await n8nWorkflowTriggers.triggerDeficiencyAlerts(payload);
      setResults({ deficiencyAlert: result });
      console.log('Deficiency Alert Result:', result);
    } catch (error) {
      console.error('Error:', error);
      setResults({ deficiencyAlert: { success: false, error: error.message } });
    } finally {
      setLoading(false);
    }
  };

  const testAIReview = async () => {
    setLoading(true);
    
    const payload: InspectionReviewPayload = {
      inspection_id: 'test-' + Date.now(),
      property_name: 'Test Property - 456 Oak Ave',
      property_address: '456 Oak Ave, Austin, TX 78704',
      inspector_name: 'Test Inspector',
      status: 'completed',
      executiveSummary: {
        summaryText: 'Overall roof condition is fair with several areas requiring attention. The membrane shows signs of wear and multiple drainage issues were observed.',
        overallCondition: 'Fair',
        overallRating: 3,
        keyFindings: ['Membrane wear in multiple areas', 'Drainage issues noted', 'Flashing needs resealing'],
        criticalIssues: [],
        recommendedActions: ['Schedule membrane repair', 'Clear drainage systems', 'Reseal flashing'],
        budgetRecommendation: 'Minor Repairs'
      },
      deficiencies: [
        {
          id: 'def-1',
          category: 'Membrane',
          description: 'Localized membrane deterioration',
          location: 'South section',
          budgetAmount: 4500,
          severity: 'medium'
        }
      ],
      photos: [
        { type: 'overview', url: 'https://example.com/overview1.jpg' },
        { type: 'overview', url: 'https://example.com/overview2.jpg' }
      ],
      notes: 'Inspection conducted under clear weather conditions.'
    };

    try {
      const result = await n8nWorkflowTriggers.triggerInspectionReview(payload);
      setResults({ aiReview: result });
      console.log('AI Review Result:', result);
    } catch (error) {
      console.error('Error:', error);
      setResults({ aiReview: { success: false, error: error.message } });
    } finally {
      setLoading(false);
    }
  };

  const testConnectivity = async () => {
    setLoading(true);
    try {
      const connectivity = await n8nWorkflowTriggers.testWorkflowConnectivity();
      setResults({ connectivity });
      console.log('Connectivity Test:', connectivity);
    } catch (error) {
      console.error('Error:', error);
      setResults({ connectivity: { error: error.message } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Test n8n Integration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={testConnectivity} disabled={loading}>
            Test Connectivity
          </Button>
          <Button onClick={testDeficiencyAlert} disabled={loading} variant="destructive">
            Test Deficiency Alert
          </Button>
          <Button onClick={testAIReview} disabled={loading} variant="secondary">
            Test AI Review
          </Button>
        </div>
        
        {results && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          <p>Direct webhook URLs configured:</p>
          <ul className="list-disc list-inside mt-2">
            <li>Deficiency Alerts: https://mkidder97.app.n8n.cloud/webhook/roofmind-deficiency-alerts</li>
            <li>AI Review: https://mkidder97.app.n8n.cloud/webhook/roofmind-inspection-review</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}