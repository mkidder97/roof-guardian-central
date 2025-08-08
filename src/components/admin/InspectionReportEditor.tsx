import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Edit, 
  Save, 
  Download, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  RefreshCw,
  Sparkles,
  FileText,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIReviewData {
  overallAssessment: string;
  grammarCorrections: string[];
  costValidation: string[];
  technicalReview: string[];
  completenessScore: string;
  brandCompliance: string;
  recommendedEdits: string[];
  finalRecommendation: 'APPROVE' | 'APPROVE_WITH_EDITS' | 'REJECT';
}

interface EnhancedReport {
  inspectionId: string;
  propertyName: string;
  propertyAddress?: string;
  inspectorName: string;
  qualityScore: number;
  qualityGrade: string;
  qualityStatus: string;
  aiReview: AIReviewData;
  enhancedExecutiveSummary: {
    originalSummary: string;
    overallCondition: string;
    overallRating: number;
    keyFindings: string[];
    criticalIssues: string[];
    recommendedActions: string[];
    budgetRecommendation: string;
    aiEnhancements: string[];
  };
  enhancedDeficiencies: any[];
  photoAnalysis: {
    total: number;
    overview: number;
    deficiency: number;
    score: number;
  };
  completenessMetrics: {
    score: number;
    missingElements: string[];
    recommendations: string[];
  };
  reportMetadata: {
    generatedAt: string;
    reviewStatus: string;
    requiresHumanReview: boolean;
  };
}

interface InspectionReportEditorProps {
  inspectionId: string;
  onSave?: (report: any) => void;
  onApprove?: (report: any) => void;
  onDownload?: (report: any) => void;
}

export function InspectionReportEditor({ 
  inspectionId, 
  onSave, 
  onApprove, 
  onDownload 
}: InspectionReportEditorProps) {
  const { toast } = useToast();
  const [report, setReport] = useState<EnhancedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedContent, setEditedContent] = useState<{
    executiveSummary: string;
    keyFindings: string[];
    recommendedActions: string[];
    deficiencies: any[];
  } | null>(null);

  useEffect(() => {
    loadInspectionReport();
  }, [inspectionId]);

  const loadInspectionReport = async () => {
    try {
      setLoading(true);
      
      // Load from inspection_reports table
      const { data: reportData, error: reportError } = await supabase
        .from('inspection_reports')
        .select(`
          *,
          inspections!inner(
            id,
            roof_id,
            inspector_id,
            status,
            roofs!inner(
              property_name,
              address,
              city,
              state
            ),
            users!inspections_inspector_id_fkey(
              first_name,
              last_name
            )
          )
        `)
        .eq('inspection_id', inspectionId)
        .single();

      if (reportError) {
        // If no report exists, create a basic one
        console.log('No existing report found, creating basic structure');
        await createBasicReport();
        return;
      }

      // Parse the stored report data
      const parsedReport: EnhancedReport = {
        inspectionId: reportData.inspection_id,
        propertyName: reportData.inspections.roofs.property_name,
        propertyAddress: `${reportData.inspections.roofs.address}, ${reportData.inspections.roofs.city}, ${reportData.inspections.roofs.state}`,
        inspectorName: `${reportData.inspections.users.first_name} ${reportData.inspections.users.last_name}`,
        qualityScore: 0, // Will be calculated
        qualityGrade: reportData.priority_level || 'Fair',
        qualityStatus: reportData.status || 'needs_review',
        aiReview: reportData.recommendations ? JSON.parse(reportData.recommendations) : {},
        enhancedExecutiveSummary: reportData.findings ? JSON.parse(reportData.findings) : {},
        enhancedDeficiencies: [],
        photoAnalysis: { total: 0, overview: 0, deficiency: 0, score: 0 },
        completenessMetrics: { score: 0, missingElements: [], recommendations: [] },
        reportMetadata: {
          generatedAt: reportData.created_at,
          reviewStatus: reportData.status || 'needs_review',
          requiresHumanReview: reportData.status !== 'completed'
        }
      };

      setReport(parsedReport);
      initializeEditedContent(parsedReport);
      
    } catch (error) {
      console.error('Error loading inspection report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inspection report',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createBasicReport = async () => {
    try {
      // Fetch basic inspection data
      const { data: inspectionData, error: inspectionError } = await supabase
        .from('inspections')
        .select(`
          id,
          roof_id,
          inspector_id,
          status,
          notes,
          roofs!inner(
            property_name,
            address,
            city,
            state
          ),
          users!inspections_inspector_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('id', inspectionId)
        .single();

      if (inspectionError) throw inspectionError;

      const basicReport: EnhancedReport = {
        inspectionId: inspectionData.id,
        propertyName: inspectionData.roofs.property_name,
        propertyAddress: `${inspectionData.roofs.address}, ${inspectionData.roofs.city}, ${inspectionData.roofs.state}`,
        inspectorName: `${inspectionData.users.first_name} ${inspectionData.users.last_name}`,
        qualityScore: 0,
        qualityGrade: 'Pending Review',
        qualityStatus: 'needs_review',
        aiReview: {
          overallAssessment: 'Pending AI review',
          grammarCorrections: [],
          costValidation: [],
          technicalReview: [],
          completenessScore: 'Not yet calculated',
          brandCompliance: 'Pending review',
          recommendedEdits: [],
          finalRecommendation: 'REJECT' as const
        },
        enhancedExecutiveSummary: {
          originalSummary: inspectionData.notes || '',
          overallCondition: 'Fair',
          overallRating: 3,
          keyFindings: [],
          criticalIssues: [],
          recommendedActions: [],
          budgetRecommendation: 'Minor Repairs',
          aiEnhancements: []
        },
        enhancedDeficiencies: [],
        photoAnalysis: { total: 0, overview: 0, deficiency: 0, score: 0 },
        completenessMetrics: { score: 0, missingElements: [], recommendations: [] },
        reportMetadata: {
          generatedAt: new Date().toISOString(),
          reviewStatus: 'needs_review',
          requiresHumanReview: true
        }
      };

      setReport(basicReport);
      initializeEditedContent(basicReport);
      
    } catch (error) {
      console.error('Error creating basic report:', error);
    }
  };

  const initializeEditedContent = (reportData: EnhancedReport) => {
    setEditedContent({
      executiveSummary: reportData.enhancedExecutiveSummary.originalSummary,
      keyFindings: reportData.enhancedExecutiveSummary.keyFindings,
      recommendedActions: reportData.enhancedExecutiveSummary.recommendedActions,
      deficiencies: reportData.enhancedDeficiencies
    });
  };

  const handleSave = async () => {
    if (!report || !editedContent) return;

    try {
      setSaving(true);

      // Update the report with edited content
      const updatedReport = {
        ...report,
        enhancedExecutiveSummary: {
          ...report.enhancedExecutiveSummary,
          originalSummary: editedContent.executiveSummary,
          keyFindings: editedContent.keyFindings,
          recommendedActions: editedContent.recommendedActions
        },
        enhancedDeficiencies: editedContent.deficiencies,
        reportMetadata: {
          ...report.reportMetadata,
          lastModified: new Date().toISOString()
        }
      };

      // Save to database
      const { error } = await supabase
        .from('inspection_reports')
        .upsert({
          inspection_id: inspectionId,
          findings: JSON.stringify(updatedReport.enhancedExecutiveSummary),
          recommendations: JSON.stringify(updatedReport.aiReview),
          status: 'draft',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setReport(updatedReport);
      setEditing(false);

      toast({
        title: 'Report Saved',
        description: 'Your changes have been saved successfully',
      });

      onSave?.(updatedReport);

    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!report) return;

    try {
      // Update status to completed
      const { error } = await supabase
        .from('inspection_reports')
        .update({
          status: 'completed',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'current-user' // TODO: Get actual user ID
        })
        .eq('inspection_id', inspectionId);

      if (error) throw error;

      toast({
        title: 'Report Approved',
        description: 'Report has been approved and is ready for client delivery',
      });

      onApprove?.(report);

    } catch (error) {
      console.error('Error approving report:', error);
      toast({
        title: 'Approval Failed',
        description: 'Failed to approve report. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDownload = async () => {
    if (!report) return;

    try {
      // Generate PDF download
      const element = document.createElement('a');
      const htmlContent = generatePDFContent(report);
      const file = new Blob([htmlContent], { type: 'text/html' });
      element.href = URL.createObjectURL(file);
      element.download = `inspection-report-${report.inspectionId}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast({
        title: 'Report Downloaded',
        description: 'Enhanced inspection report has been downloaded',
      });

      onDownload?.(report);

    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download report. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const generatePDFContent = (reportData: EnhancedReport): string => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Enhanced Inspection Report - ${reportData.propertyName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; line-height: 1.6; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; margin-bottom: 30px; }
        .property-info { background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .section { margin: 30px 0; }
        .section-title { font-size: 18px; font-weight: bold; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; }
        .deficiency-item { border: 1px solid #e5e7eb; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .quality-score { background: ${reportData.qualityScore >= 80 ? '#10b981' : '#f59e0b'}; color: white; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏠 ROOFMIND</h1>
        <h2>Enhanced Inspection Report</h2>
        <p>AI-Reviewed & Quality Assured</p>
    </div>
    
    <div class="quality-score">
        <strong>Quality Grade: ${reportData.qualityGrade}</strong><br>
        Status: ${reportData.aiReview.finalRecommendation}
    </div>
    
    <div class="property-info">
        <h3>Property Information</h3>
        <p><strong>Property:</strong> ${reportData.propertyName}</p>
        <p><strong>Address:</strong> ${reportData.propertyAddress}</p>
        <p><strong>Inspector:</strong> ${reportData.inspectorName}</p>
        <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="section">
        <div class="section-title">Executive Summary</div>
        <p><strong>Overall Condition:</strong> ${reportData.enhancedExecutiveSummary.overallCondition}</p>
        <p><strong>Rating:</strong> ${reportData.enhancedExecutiveSummary.overallRating}/5 Stars</p>
        <p>${reportData.enhancedExecutiveSummary.originalSummary}</p>
        
        ${reportData.enhancedExecutiveSummary.keyFindings.length > 0 ? `
        <h4>Key Findings:</h4>
        <ul>${reportData.enhancedExecutiveSummary.keyFindings.map(finding => `<li>${finding}</li>`).join('')}</ul>` : ''}
        
        ${reportData.enhancedExecutiveSummary.recommendedActions.length > 0 ? `
        <h4>Recommended Actions:</h4>
        <ul>${reportData.enhancedExecutiveSummary.recommendedActions.map(action => `<li>${action}</li>`).join('')}</ul>` : ''}
    </div>
    
    <div class="section">
        <div class="section-title">AI Review Summary</div>
        <p><strong>Overall Assessment:</strong> ${reportData.aiReview.overallAssessment}</p>
        <p><strong>Completeness Score:</strong> ${reportData.aiReview.completenessScore}</p>
        <p><strong>Final Recommendation:</strong> ${reportData.aiReview.finalRecommendation}</p>
    </div>
    
    <div style="margin-top: 50px; padding: 20px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
        Report generated by RoofMind AI Review System<br>
        Generated on ${new Date().toLocaleDateString()}<br>
        Inspection ID: ${reportData.inspectionId}
    </div>
</body>
</html>`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'needs_review': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin mr-3" />
        <span>Loading inspection report...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No inspection report found. The AI review may not have completed yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{report.propertyName}</CardTitle>
              <p className="text-muted-foreground">{report.propertyAddress}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(report.reportMetadata.reviewStatus)}>
                {report.reportMetadata.reviewStatus.replace('_', ' ')}
              </Badge>
              <Badge variant={report.qualityScore >= 80 ? 'default' : 'secondary'}>
                {report.qualityGrade}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Inspector:</span>
                <span className="ml-2 font-medium">{report.inspectorName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Generated:</span>
                <span className="ml-2">{new Date(report.reportMetadata.generatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditing(!editing)}
                disabled={saving}
              >
                {editing ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                {editing ? 'Preview' : 'Edit'}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              
              {report.reportMetadata.requiresHumanReview && (
                <Button
                  onClick={handleApprove}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Review Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Review Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Overall Assessment</h4>
              <p className="text-sm text-muted-foreground">{report.aiReview.overallAssessment}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Completeness Score</h4>
                <p className="text-sm">{report.aiReview.completenessScore}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Final Recommendation</h4>
                <Badge variant={
                  report.aiReview.finalRecommendation === 'APPROVE' ? 'default' : 
                  report.aiReview.finalRecommendation === 'APPROVE_WITH_EDITS' ? 'secondary' : 
                  'destructive'
                }>
                  {report.aiReview.finalRecommendation.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {report.aiReview.recommendedEdits.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recommended Improvements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {report.aiReview.recommendedEdits.map((edit, index) => (
                    <li key={index}>• {edit}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing && editedContent ? (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Summary Text</label>
                <Textarea
                  value={editedContent.executiveSummary}
                  onChange={(e) => setEditedContent({
                    ...editedContent,
                    executiveSummary: e.target.value
                  })}
                  rows={6}
                  placeholder="Enter executive summary..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Key Findings (one per line)</label>
                <Textarea
                  value={editedContent.keyFindings.join('\n')}
                  onChange={(e) => setEditedContent({
                    ...editedContent,
                    keyFindings: e.target.value.split('\n').filter(line => line.trim())
                  })}
                  rows={4}
                  placeholder="Enter key findings..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Recommended Actions (one per line)</label>
                <Textarea
                  value={editedContent.recommendedActions.join('\n')}
                  onChange={(e) => setEditedContent({
                    ...editedContent,
                    recommendedActions: e.target.value.split('\n').filter(line => line.trim())
                  })}
                  rows={4}
                  placeholder="Enter recommended actions..."
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h4 className="font-medium mb-2">Overall Condition</h4>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary">{report.enhancedExecutiveSummary.overallCondition}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {report.enhancedExecutiveSummary.overallRating}/5 Stars
                  </span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Summary</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {report.enhancedExecutiveSummary.originalSummary || 'No summary provided'}
                </p>
              </div>
              
              {report.enhancedExecutiveSummary.keyFindings.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Key Findings</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {report.enhancedExecutiveSummary.keyFindings.map((finding, index) => (
                      <li key={index}>• {finding}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {report.enhancedExecutiveSummary.recommendedActions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recommended Actions</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {report.enhancedExecutiveSummary.recommendedActions.map((action, index) => (
                      <li key={index}>• {action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Photo Analysis</div>
                <div className="text-lg font-semibold">{report.photoAnalysis.score}/30</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {report.photoAnalysis.total} total photos
              ({report.photoAnalysis.overview} overview, {report.photoAnalysis.deficiency} deficiency)
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Completeness</div>
                <div className="text-lg font-semibold">{report.completenessMetrics.score}/30</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {report.completenessMetrics.missingElements.length} missing elements
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Review Status</div>
                <div className="text-lg font-semibold capitalize">
                  {report.reportMetadata.reviewStatus.replace('_', ' ')}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {report.reportMetadata.requiresHumanReview ? 'Requires review' : 'Ready to send'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}