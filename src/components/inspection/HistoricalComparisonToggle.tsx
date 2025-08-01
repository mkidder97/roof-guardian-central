import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  History, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  Star,
  Calendar,
  FileText,
  BarChart
} from "lucide-react";

interface HistoricalInspection {
  id: string;
  date: string;
  inspectorName: string;
  overallCondition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  overallRating: number;
  criticalIssues: number;
  totalDeficiencies: number;
  budgetRecommendation: string;
  executiveSummary: string;
  roofAge: number;
}

interface HistoricalComparisonToggleProps {
  currentInspection: {
    date: string;
    overallCondition: string;
    overallRating: number;
    criticalIssues: number;
    totalDeficiencies: number;
    budgetRecommendation: string;
    executiveSummary: string;
  };
  historicalInspections: HistoricalInspection[];
  isTablet?: boolean;
}

export function HistoricalComparisonToggle({ 
  currentInspection, 
  historicalInspections = [],
  isTablet = false 
}: HistoricalComparisonToggleProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [selectedHistorical, setSelectedHistorical] = useState<HistoricalInspection | null>(null);

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

  const getConditionScore = (condition: string) => {
    switch (condition) {
      case 'Excellent': return 5;
      case 'Good': return 4;
      case 'Fair': return 3;
      case 'Poor': return 2;
      case 'Critical': return 1;
      default: return 0;
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <div className="h-4 w-4" />; // Equal
  };

  const getTrendText = (current: number, previous: number, label: string) => {
    if (current > previous) {
      return `${label} improved`;
    } else if (current < previous) {
      return `${label} declined`;
    }
    return `${label} unchanged`;
  };

  const compareInspections = (historical: HistoricalInspection) => {
    const currentScore = getConditionScore(currentInspection.overallCondition);
    const historicalScore = getConditionScore(historical.overallCondition);
    
    return {
      conditionTrend: getTrendIcon(currentScore, historicalScore),
      conditionText: getTrendText(currentScore, historicalScore, 'Overall condition'),
      ratingTrend: getTrendIcon(currentInspection.overallRating, historical.overallRating),
      ratingText: getTrendText(currentInspection.overallRating, historical.overallRating, 'Rating'),
      issuesTrend: getTrendIcon(-currentInspection.criticalIssues, -historical.criticalIssues),
      issuesText: getTrendText(-currentInspection.criticalIssues, -historical.criticalIssues, 'Critical issues'),
      deficienciesTrend: getTrendIcon(-currentInspection.totalDeficiencies, -historical.totalDeficiencies),
      deficienciesText: getTrendText(-currentInspection.totalDeficiencies, -historical.totalDeficiencies, 'Total deficiencies')
    };
  };

  if (historicalInspections.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className={`font-medium text-muted-foreground ${isTablet ? 'text-lg' : 'text-base'}`}>
            No Historical Data Available
          </h3>
          <p className={`text-muted-foreground mt-2 ${isTablet ? 'text-base' : 'text-sm'}`}>
            This is the first inspection for this property. Future inspections will enable historical comparison.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-2 ${isTablet ? 'text-xl' : 'text-lg'}`}>
              <History className={isTablet ? 'h-6 w-6' : 'h-5 w-5'} />
              Historical Comparison
            </CardTitle>
            <Button
              variant={showComparison ? "default" : "outline"}
              onClick={() => setShowComparison(!showComparison)}
              size={isTablet ? "default" : "sm"}
            >
              <BarChart className="h-4 w-4 mr-2" />
              {showComparison ? 'Hide Comparison' : 'Show Comparison'}
            </Button>
          </div>
        </CardHeader>
        
        {!showComparison && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className={`font-semibold ${isTablet ? 'text-lg' : 'text-base'}`}>
                  {historicalInspections.length}
                </p>
                <p className={`text-muted-foreground ${isTablet ? 'text-base' : 'text-sm'}`}>
                  Previous Inspections
                </p>
              </div>
              <div className="text-center">
                <p className={`font-semibold ${isTablet ? 'text-lg' : 'text-base'}`}>
                  {historicalInspections[0]?.date || 'N/A'}
                </p>
                <p className={`text-muted-foreground ${isTablet ? 'text-base' : 'text-sm'}`}>
                  Last Inspection
                </p>
              </div>
              <div className="text-center">
                <Badge className={getConditionColor(historicalInspections[0]?.overallCondition || 'Unknown')}>
                  {historicalInspections[0]?.overallCondition || 'Unknown'}
                </Badge>
                <p className={`text-muted-foreground mt-1 ${isTablet ? 'text-base' : 'text-sm'}`}>
                  Previous Condition
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {showComparison && (
        <div className="space-y-4">
          {/* Historical Inspections List */}
          <Card>
            <CardHeader>
              <CardTitle className={isTablet ? 'text-lg' : 'text-base'}>
                Select Inspection to Compare
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {historicalInspections.map((inspection) => (
                  <div
                    key={inspection.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedHistorical?.id === inspection.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedHistorical(inspection)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className={`font-medium ${isTablet ? 'text-base' : 'text-sm'}`}>
                            {inspection.date}
                          </p>
                          <p className={`text-muted-foreground ${isTablet ? 'text-sm' : 'text-xs'}`}>
                            Inspector: {inspection.inspectorName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getConditionColor(inspection.overallCondition)}>
                          {inspection.overallCondition}
                        </Badge>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < inspection.overallRating 
                                  ? 'text-yellow-500 fill-current' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comparison Results */}
          {selectedHistorical && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${isTablet ? 'text-lg' : 'text-base'}`}>
                  <BarChart className={isTablet ? 'h-5 w-5' : 'h-4 w-4'} />
                  Comparison: {selectedHistorical.date} vs Current
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Overall Metrics Comparison */}
                  <div>
                    <h4 className={`font-medium mb-4 ${isTablet ? 'text-base' : 'text-sm'}`}>
                      Overall Metrics
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className={`font-medium ${isTablet ? 'text-base' : 'text-sm'}`}>
                            Overall Condition
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getConditionColor(selectedHistorical.overallCondition)}>
                              {selectedHistorical.overallCondition}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge className={getConditionColor(currentInspection.overallCondition)}>
                              {currentInspection.overallCondition}
                            </Badge>
                          </div>
                        </div>
                        {compareInspections(selectedHistorical).conditionTrend}
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className={`font-medium ${isTablet ? 'text-base' : 'text-sm'}`}>
                            Overall Rating
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span>{selectedHistorical.overallRating}/5</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span>{currentInspection.overallRating}/5</span>
                          </div>
                        </div>
                        {compareInspections(selectedHistorical).ratingTrend}
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className={`font-medium ${isTablet ? 'text-base' : 'text-sm'}`}>
                            Critical Issues
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span>{selectedHistorical.criticalIssues}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span>{currentInspection.criticalIssues}</span>
                          </div>
                        </div>
                        {compareInspections(selectedHistorical).issuesTrend}
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className={`font-medium ${isTablet ? 'text-base' : 'text-sm'}`}>
                            Total Deficiencies
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span>{selectedHistorical.totalDeficiencies}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span>{currentInspection.totalDeficiencies}</span>
                          </div>
                        </div>
                        {compareInspections(selectedHistorical).deficienciesTrend}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Executive Summary Comparison */}
                  <div>
                    <h4 className={`font-medium mb-4 ${isTablet ? 'text-base' : 'text-sm'}`}>
                      Executive Summary Comparison
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className={`font-medium ${isTablet ? 'text-sm' : 'text-xs'} text-muted-foreground`}>
                            {selectedHistorical.date}
                          </span>
                        </div>
                        <p className={`text-muted-foreground bg-gray-50 p-3 rounded-lg ${isTablet ? 'text-sm' : 'text-xs'}`}>
                          {selectedHistorical.executiveSummary}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className={`font-medium ${isTablet ? 'text-sm' : 'text-xs'} text-primary`}>
                            Current Inspection
                          </span>
                        </div>
                        <p className={`bg-primary/5 border border-primary/20 p-3 rounded-lg ${isTablet ? 'text-sm' : 'text-xs'}`}>
                          {currentInspection.executiveSummary}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Key Changes Summary */}
                  <div>
                    <h4 className={`font-medium mb-4 ${isTablet ? 'text-base' : 'text-sm'}`}>
                      Key Changes
                    </h4>
                    <div className="space-y-2">
                      {compareInspections(selectedHistorical).conditionText !== 'Overall condition unchanged' && (
                        <div className="flex items-center gap-2">
                          {compareInspections(selectedHistorical).conditionTrend}
                          <span className={isTablet ? 'text-base' : 'text-sm'}>
                            {compareInspections(selectedHistorical).conditionText}
                          </span>
                        </div>
                      )}
                      {compareInspections(selectedHistorical).issuesText !== 'Critical issues unchanged' && (
                        <div className="flex items-center gap-2">
                          {compareInspections(selectedHistorical).issuesTrend}
                          <span className={isTablet ? 'text-base' : 'text-sm'}>
                            {compareInspections(selectedHistorical).issuesText}
                          </span>
                        </div>
                      )}
                      {compareInspections(selectedHistorical).deficienciesText !== 'Total deficiencies unchanged' && (
                        <div className="flex items-center gap-2">
                          {compareInspections(selectedHistorical).deficienciesTrend}
                          <span className={isTablet ? 'text-base' : 'text-sm'}>
                            {compareInspections(selectedHistorical).deficienciesText}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}