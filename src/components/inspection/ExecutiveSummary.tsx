import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  History, 
  AlertTriangle,
  CheckCircle,
  Star,
  Calendar,
  TrendingUp,
  Eye,
  Edit3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoofLayer {
  id: string;
  layer: string;
  material: string;
  thickness: string;
  attachment: string;
}

interface ChecklistItem {
  id: string;
  category: string;
  question: string;
  response: 'YES' | 'NO' | 'NA' | null;
  notes?: string;
  followUpRequired?: boolean;
}

interface InspectionData {
  // Roof composition data
  roofSystem?: string;
  systemDescription?: string;
  installationYear?: number;
  layers?: RoofLayer[];
  
  // Checklist data
  budgetYear?: number;
  standingWater?: 'YES' | 'NO' | null;
  roofAssemblyFailure?: 'YES' | 'NO' | null;
  preventativeRepairsCompleted?: 'YES' | 'NO' | null;
  squareFootageConfirmed?: 'YES' | 'NO' | null;
  hasSolar?: 'YES' | 'NO' | null;
  hasDaylighting?: 'YES' | 'NO' | null;
  daylightFactor?: number;
  checklist?: ChecklistItem[];
  completionPercentage?: number;
}

interface ExecutiveSummaryData {
  overallCondition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  overallRating: number; // 1-5 stars
  summaryText: string;
  keyFindings: string[];
  criticalIssues: string[];
  recommendedActions: string[];
  budgetRecommendation: 'Maintenance Only' | 'Minor Repairs' | 'Major Repairs' | 'Replacement Required';
  nextInspectionDate: string;
  inspectorNotes: string;
  generatedAt: string;
}

interface HistoricalSummary {
  id: string;
  date: string;
  condition: string;
  rating: number;
  criticalIssues: number;
  summary: string;
}

interface ExecutiveSummaryProps {
  inspectionData: InspectionData;
  roofData?: any;
  onSummaryGenerated?: (summary: ExecutiveSummaryData) => void;
  historicalSummaries?: HistoricalSummary[];
  isTablet?: boolean;
}

export function ExecutiveSummary({ 
  inspectionData, 
  roofData,
  onSummaryGenerated,
  historicalSummaries = [],
  isTablet = false 
}: ExecutiveSummaryProps) {
  const { toast } = useToast();
  
  const [summary, setSummary] = useState<ExecutiveSummaryData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistorical, setShowHistorical] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');

  // Auto-generate summary when inspection data changes
  useEffect(() => {
    if (inspectionData && Object.keys(inspectionData).length > 0) {
      generateExecutiveSummary();
    }
  }, [inspectionData]);

  const generateExecutiveSummary = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const generatedSummary = analyzeInspectionData(inspectionData, roofData);
      setSummary(generatedSummary);
      setEditedSummary(generatedSummary.summaryText);
      
      if (onSummaryGenerated) {
        onSummaryGenerated(generatedSummary);
      }
      
      toast({
        title: "Executive Summary Generated",
        description: "AI analysis complete. Review and edit as needed."
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Unable to generate executive summary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeInspectionData = (data: InspectionData, roof?: any): ExecutiveSummaryData => {
    const currentYear = new Date().getFullYear();
    const roofAge = data.installationYear ? currentYear - data.installationYear : 0;
    
    // Analyze critical issues
    const criticalIssues: string[] = [];
    const keyFindings: string[] = [];
    const recommendedActions: string[] = [];
    
    // Check for standing water
    if (data.standingWater === 'YES') {
      criticalIssues.push('Standing water observed on roof surface');
      recommendedActions.push('Immediate drainage system evaluation and repair');
    }
    
    // Check for roof assembly failure
    if (data.roofAssemblyFailure === 'YES') {
      criticalIssues.push('Roof assembly failure detected');
      recommendedActions.push('Comprehensive structural assessment required');
    }
    
    // Analyze checklist responses
    const noResponses = data.checklist?.filter(item => item.response === 'NO') || [];
    noResponses.forEach(item => {
      if (item.category === 'Safety' && item.response === 'NO') {
        criticalIssues.push(`Safety concern: ${item.question.toLowerCase()}`);
        recommendedActions.push('Address safety issues immediately');
      } else if (item.response === 'NO') {
        keyFindings.push(`${item.category}: ${item.question.toLowerCase()}`);
        if (item.notes) {
          keyFindings.push(`  Note: ${item.notes}`);
        }
      }
    });
    
    // Age-based recommendations
    if (roofAge > 15) {
      keyFindings.push(`Roof system age: ${roofAge} years - approaching replacement consideration`);
      recommendedActions.push('Plan for replacement within next 5 years');
    } else if (roofAge > 10) {
      keyFindings.push(`Roof system age: ${roofAge} years - increased maintenance required`);
      recommendedActions.push('Enhanced preventative maintenance program');
    }
    
    // System-specific findings
    if (data.roofSystem) {
      keyFindings.push(`Roof system type: ${data.roofSystem}`);
    }
    
    // Solar/daylighting considerations
    if (data.hasSolar === 'YES') {
      keyFindings.push('Solar installation present - requires specialized maintenance');
      recommendedActions.push('Coordinate with solar maintenance provider');
    }
    
    if (data.hasDaylighting === 'YES') {
      keyFindings.push(`Daylighting system present (${data.daylightFactor}% daylight factor)`);
    }
    
    // Preventative maintenance status
    if (data.preventativeRepairsCompleted === 'NO') {
      keyFindings.push('Previous year preventative repairs incomplete');
      recommendedActions.push('Complete outstanding preventative maintenance items');
    }
    
    // Determine overall condition and rating
    let overallCondition: ExecutiveSummaryData['overallCondition'] = 'Good';
    let overallRating = 4;
    let budgetRecommendation: ExecutiveSummaryData['budgetRecommendation'] = 'Maintenance Only';
    
    if (criticalIssues.length > 0) {
      overallCondition = 'Poor';
      overallRating = 2;
      budgetRecommendation = 'Major Repairs';
    } else if (noResponses.length > 3) {
      overallCondition = 'Fair';
      overallRating = 3;
      budgetRecommendation = 'Minor Repairs';
    } else if (roofAge > 18) {
      overallCondition = 'Fair';
      overallRating = 2;
      budgetRecommendation = 'Replacement Required';
    } else if (roofAge > 15) {
      overallCondition = 'Good';
      overallRating = 3;
      budgetRecommendation = 'Minor Repairs';
    }
    
    // Generate summary text
    const summaryText = generateSummaryText({
      roofAge,
      roofSystem: data.roofSystem,
      completionPercentage: data.completionPercentage || 0,
      criticalIssues: criticalIssues.length,
      keyFindings: keyFindings.length,
      overallCondition
    });
    
    // Calculate next inspection date
    const nextInspectionMonths = overallCondition === 'Poor' ? 6 : 12;
    const nextInspection = new Date();
    nextInspection.setMonth(nextInspection.getMonth() + nextInspectionMonths);
    
    return {
      overallCondition,
      overallRating,
      summaryText,
      keyFindings,
      criticalIssues,
      recommendedActions,
      budgetRecommendation,
      nextInspectionDate: nextInspection.toLocaleDateString(),
      inspectorNotes: '',
      generatedAt: new Date().toISOString()
    };
  };

  const generateSummaryText = (analysis: {
    roofAge: number;
    roofSystem?: string;
    completionPercentage: number;
    criticalIssues: number;
    keyFindings: number;
    overallCondition: string;
  }) => {
    const { roofAge, roofSystem, completionPercentage, criticalIssues, keyFindings, overallCondition } = analysis;
    
    let summary = `Comprehensive roof inspection completed with ${completionPercentage}% checklist completion. `;
    
    if (roofSystem) {
      summary += `The ${roofSystem} roof system, installed approximately ${roofAge} years ago, `;
    } else {
      summary += `The roof system, installed approximately ${roofAge} years ago, `;
    }
    
    summary += `presents an overall condition of "${overallCondition}". `;
    
    if (criticalIssues > 0) {
      summary += `${criticalIssues} critical issue${criticalIssues > 1 ? 's' : ''} requiring immediate attention were identified. `;
    }
    
    if (keyFindings > 0) {
      summary += `${keyFindings} additional finding${keyFindings > 1 ? 's' : ''} noted for maintenance planning. `;
    }
    
    if (roofAge > 15) {
      summary += `Given the system age, replacement planning should be considered within the next 3-5 years. `;
    } else if (roofAge > 10) {
      summary += `The roof system is in its mature phase, requiring enhanced preventative maintenance. `;
    } else {
      summary += `The roof system remains in good operational condition with standard maintenance requirements. `;
    }
    
    summary += `Regular inspection and proactive maintenance will help maximize the roof system's service life and performance.`;
    
    return summary;
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-blue-100 text-blue-800';
      case 'Fair': return 'bg-yellow-100 text-yellow-800';
      case 'Poor': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBudgetColor = (budget: string) => {
    switch (budget) {
      case 'Maintenance Only': return 'bg-green-100 text-green-800';
      case 'Minor Repairs': return 'bg-blue-100 text-blue-800';
      case 'Major Repairs': return 'bg-orange-100 text-orange-800';
      case 'Replacement Required': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const saveEditedSummary = () => {
    if (summary) {
      setSummary({ ...summary, summaryText: editedSummary });
      setIsEditing(false);
      toast({
        title: "Summary Updated",
        description: "Executive summary has been saved."
      });
    }
  };

  if (isGenerating) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center space-y-4">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className={`text-muted-foreground ${isTablet ? 'text-base' : 'text-sm'}`}>
              Generating AI-powered executive summary...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center space-y-4">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className={`text-muted-foreground ${isTablet ? 'text-base' : 'text-sm'}`}>
              Complete inspection data to generate executive summary
            </p>
            <Button onClick={generateExecutiveSummary} disabled={!inspectionData}>
              Generate Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-2 ${isTablet ? 'text-2xl' : 'text-xl'}`}>
              <FileText className={isTablet ? 'h-7 w-7' : 'h-6 w-6'} />
              Executive Summary
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size={isTablet ? "default" : "sm"}
                onClick={() => setShowHistorical(!showHistorical)}
                className={isTablet ? 'h-10' : 'h-8'}
              >
                <History className="h-4 w-4 mr-1" />
                History
              </Button>
              <Button
                variant="outline"
                size={isTablet ? "default" : "sm"}
                className={isTablet ? 'h-10' : 'h-8'}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overall Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className={isTablet ? 'text-xl' : 'text-lg'}>Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-6 w-6 ${
                      i < summary.overallRating 
                        ? 'text-yellow-500 fill-current' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className={`font-semibold ${isTablet ? 'text-lg' : 'text-base'}`}>
                {summary.overallRating}/5 Rating
              </p>
            </div>
            
            <div className="text-center">
              <Badge 
                className={`${getConditionColor(summary.overallCondition)} ${isTablet ? 'text-base px-4 py-2' : 'text-sm px-3 py-1'}`}
              >
                {summary.overallCondition}
              </Badge>
              <p className={`text-muted-foreground mt-1 ${isTablet ? 'text-base' : 'text-sm'}`}>
                Overall Condition
              </p>
            </div>
            
            <div className="text-center">
              <Badge 
                className={`${getBudgetColor(summary.budgetRecommendation)} ${isTablet ? 'text-base px-4 py-2' : 'text-sm px-3 py-1'}`}
              >
                {summary.budgetRecommendation}
              </Badge>
              <p className={`text-muted-foreground mt-1 ${isTablet ? 'text-base' : 'text-sm'}`}>
                Budget Category
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Text */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={isTablet ? 'text-xl' : 'text-lg'}>Summary</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 className="h-4 w-4 mr-1" />
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                className={`min-h-[150px] ${isTablet ? 'text-base' : 'text-sm'}`}
                placeholder="Edit executive summary..."
              />
              <div className="flex gap-2">
                <Button onClick={saveEditedSummary}>Save Changes</Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className={`leading-relaxed ${isTablet ? 'text-base' : 'text-sm'}`}>
              {summary.summaryText}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Critical Issues */}
      {summary.criticalIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-red-600 ${isTablet ? 'text-xl' : 'text-lg'}`}>
              <AlertTriangle className={isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
              Critical Issues ({summary.criticalIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.criticalIssues.map((issue, index) => (
                <li key={index} className={`flex items-start gap-2 ${isTablet ? 'text-base' : 'text-sm'}`}>
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Key Findings */}
      {summary.keyFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isTablet ? 'text-xl' : 'text-lg'}`}>
              <Eye className={isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
              Key Findings ({summary.keyFindings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.keyFindings.map((finding, index) => (
                <li key={index} className={`flex items-start gap-2 ${isTablet ? 'text-base' : 'text-sm'}`}>
                  <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  {finding}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommended Actions */}
      {summary.recommendedActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isTablet ? 'text-xl' : 'text-lg'}`}>
              <TrendingUp className={isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
              Recommended Actions ({summary.recommendedActions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.recommendedActions.map((action, index) => (
                <li key={index} className={`flex items-start gap-2 ${isTablet ? 'text-base' : 'text-sm'}`}>
                  <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {action}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Next Inspection */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isTablet ? 'text-xl' : 'text-lg'}`}>
            <Calendar className={isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
            Next Inspection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`font-medium ${isTablet ? 'text-lg' : 'text-base'}`}>
            {summary.nextInspectionDate}
          </p>
          <p className={`text-muted-foreground ${isTablet ? 'text-base' : 'text-sm'}`}>
            Based on current roof condition and findings
          </p>
        </CardContent>
      </Card>

      {/* Historical Comparison */}
      {showHistorical && historicalSummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isTablet ? 'text-xl' : 'text-lg'}`}>
              <History className={isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
              Historical Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historicalSummaries.map((historical) => (
                <div key={historical.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${isTablet ? 'text-base' : 'text-sm'}`}>
                        {historical.date}
                      </span>
                      <Badge className={getConditionColor(historical.condition)}>
                        {historical.condition}
                      </Badge>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < historical.rating 
                                ? 'text-yellow-500 fill-current' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className={`text-muted-foreground ${isTablet ? 'text-sm' : 'text-xs'}`}>
                      {historical.criticalIssues} critical issues
                    </span>
                  </div>
                  <p className={`text-muted-foreground ${isTablet ? 'text-sm' : 'text-xs'}`}>
                    {historical.summary}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}