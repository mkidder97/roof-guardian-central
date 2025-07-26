import React, { useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VirtualScroll } from './virtual-scroll';
import { Building2 } from 'lucide-react';
import { PriorityBadge, StatusBadge } from './priority-indicators';
import { InspectionStatusBadge, InspectionStatus } from './inspection-status-badge';
import { PriorityEngine } from '@/lib/priorityEngine';

interface Property {
  id: string;
  name: string;
  roofType: string;
  squareFootage: number;
  lastInspectionDate?: string;
  criticalIssues: number;
  status: 'critical' | 'overdue' | 'attention' | 'good' | 'excellent';
  priority?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  urgencyScore?: number;
  riskFactors?: any;
  inspectionStatus?: InspectionStatus;
}

interface VirtualizedPropertyListProps {
  properties: Property[];
  onPropertyClick: (propertyId: string) => void;
  loading?: boolean;
  className?: string;
  containerHeight?: number;
}

/**
 * Virtualized property list with intelligent priority sorting
 * Handles large datasets efficiently while maintaining responsive UX
 */
export const VirtualizedPropertyList: React.FC<VirtualizedPropertyListProps> = ({
  properties,
  onPropertyClick,
  loading = false,
  className = '',
  containerHeight = 400
}) => {
  
  // Enhance properties with priority calculations
  const enhancedProperties = useMemo(() => {
    return properties.map(property => {
      // Calculate priority factors based on property data
      const priorityFactors = {
        structuralRisk: property.criticalIssues * 2,
        safetyHazard: property.status === 'critical' ? 8 : property.status === 'overdue' ? 6 : 2,
        operationalImpact: property.criticalIssues > 0 ? 7 : 3,
        financialExposure: property.squareFootage * 10, // Rough estimate
        ageOfIssue: property.lastInspectionDate ? 
          Math.floor((Date.now() - new Date(property.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24)) : 
          365,
        lastInspectionDays: property.lastInspectionDate ?
          Math.floor((Date.now() - new Date(property.lastInspectionDate).getTime()) / (1000 * 60 * 60 * 24)) :
          365,
        recurrenceCount: property.criticalIssues,
        criticalLocation: property.criticalIssues > 2,
        weatherExposure: 5, // Default value
        accessibilityDifficulty: 4 // Default value
      };

      const priorityResult = PriorityEngine.calculatePriority(priorityFactors);
      
      return {
        ...property,
        priority: priorityResult.priority,
        urgencyScore: priorityResult.urgencyScore,
        riskFactors: priorityResult.factors,
        priorityScore: priorityResult.score
      };
    });
  }, [properties]);

  // Sort properties by priority and urgency
  const sortedProperties = useMemo(() => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    
    return [...enhancedProperties].sort((a, b) => {
      // First sort by priority
      const priorityDiff = (priorityOrder[a.priority!] || 4) - (priorityOrder[b.priority!] || 4);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by urgency score (higher is more urgent)
      const urgencyDiff = (b.urgencyScore || 0) - (a.urgencyScore || 0);
      if (urgencyDiff !== 0) return urgencyDiff;
      
      // Finally by number of critical issues
      return b.criticalIssues - a.criticalIssues;
    });
  }, [enhancedProperties]);

  const renderPropertyItem = useCallback((property: Property & { priority?: any; urgencyScore?: number; riskFactors?: string[] }, index: number) => {
    const getStatusVariant = (status: string) => {
      switch (status) {
        case 'critical':
        case 'overdue':
          return 'destructive';
        case 'attention':
          return 'secondary';
        default:
          return 'outline';
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'critical':
          return 'Critical';
        case 'overdue':
          return 'Overdue';
        case 'attention':
          return 'Needs Attention';
        case 'good':
          return 'Good';
        case 'excellent':
          return 'Excellent';
        default:
          return 'Unknown';
      }
    };

    return (
      <Card 
        key={property.id}
        className={`
          cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary
          ${property.priority === 'critical' ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''}
          ${property.priority === 'high' ? 'border-l-4 border-l-orange-500 bg-orange-50/30' : ''}
          ${property.priority === 'medium' ? 'border-l-4 border-l-yellow-500 bg-yellow-50/30' : ''}
          ${index === 0 && property.priority === 'critical' ? 'animate-pulse hover:animate-none' : ''}
        `}
        onClick={() => onPropertyClick(property.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg truncate">{property.name}</h3>
                {property.priority && (
                  <PriorityBadge priority={property.priority} size="sm" />
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {property.roofType} • {property.squareFootage.toLocaleString()} sq ft
                </p>
                <p className="text-sm text-muted-foreground">
                  Last inspected: {property.lastInspectionDate 
                    ? new Date(property.lastInspectionDate).toLocaleDateString()
                    : 'Never'
                  }
                </p>
                
                {/* Risk factors preview */}
                {property.riskFactors && property.riskFactors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Key concerns:</p>
                    <p className="text-xs text-red-600 line-clamp-2">
                      {property.riskFactors.slice(0, 2).join(' • ')}
                      {property.riskFactors.length > 2 && ' ...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 ml-4">
              <div className="flex flex-wrap gap-1 justify-end">
                {property.criticalIssues > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {property.criticalIssues} Critical Issue{property.criticalIssues > 1 ? 's' : ''}
                  </Badge>
                )}
                
                {property.inspectionStatus && (
                  <InspectionStatusBadge status={property.inspectionStatus} size="sm" />
                )}
                
                <StatusBadge status={property.status as any} size="sm" />
              </div>
              
              {/* Urgency indicator */}
              {property.urgencyScore && property.urgencyScore > 60 && (
                <div className="text-xs text-center">
                  <div className="text-orange-600 font-medium">Urgency: {property.urgencyScore}%</div>
                  <div className="text-muted-foreground">High urgency</div>
                </div>
              )}
              
              {/* Priority score for debugging in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-400">
                  Score: {(property as any).priorityScore}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [onPropertyClick]);

  const priorityStats = useMemo(() => {
    const stats = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    enhancedProperties.forEach(prop => {
      if (prop.priority) stats[prop.priority]++;
    });
    return stats;
  }, [enhancedProperties]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading properties...</span>
      </div>
    );
  }

  if (sortedProperties.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg mb-2">No properties available for inspection</p>
        <p className="text-gray-400 text-sm">Check back later or contact your administrator</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Priority summary */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Property Priority Overview</h4>
          <span className="text-sm text-gray-500">{sortedProperties.length} total properties</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {Object.entries(priorityStats).map(([priority, count]) => {
            if (count === 0) return null;
            return (
              <div key={priority} className="flex items-center gap-1">
                <PriorityBadge priority={priority as any} size="sm" showIcon={false} />
                <span className="text-sm text-gray-600">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Virtualized list */}
      <div className="bg-white rounded-lg border">
        <VirtualScroll
          items={sortedProperties}
          itemHeight={120} // Approximate height of each property card
          containerHeight={containerHeight}
          renderItem={renderPropertyItem}
          overscan={3}
          className="rounded-lg"
        />
      </div>
      
      {/* Quick stats */}
      <div className="text-xs text-gray-500 text-center">
        Showing {sortedProperties.length} properties • 
        {priorityStats.critical > 0 && ` ${priorityStats.critical} critical`}
        {priorityStats.high > 0 && ` • ${priorityStats.high} high priority`}
        {priorityStats.medium > 0 && ` • ${priorityStats.medium} medium priority`}
      </div>
    </div>
  );
};

/**
 * Optimized property list item component with memoization
 */
const PropertyListItem = React.memo<{
  property: Property & { priority?: any; urgencyScore?: number; riskFactors?: string[] };
  onClick: (propertyId: string) => void;
}>(({ property, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(property.id);
  }, [onClick, property.id]);

  return (
    <Card 
      className={`
        cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary
        ${property.priority === 'critical' ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''}
        ${property.priority === 'high' ? 'border-l-4 border-l-orange-500 bg-orange-50/30' : ''}
      `}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{property.name}</h3>
              {property.priority && (
                <PriorityBadge priority={property.priority} size="sm" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {property.roofType} • {property.squareFootage.toLocaleString()} sq ft
            </p>
            <p className="text-sm text-muted-foreground">
              Last inspected: {property.lastInspectionDate 
                ? new Date(property.lastInspectionDate).toLocaleDateString()
                : 'Never'
              }
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {property.criticalIssues > 0 && (
              <Badge variant="destructive">
                {property.criticalIssues} Critical Issue{property.criticalIssues > 1 ? 's' : ''}
              </Badge>
            )}
            {property.inspectionStatus && (
              <InspectionStatusBadge status={property.inspectionStatus} size="sm" />
            )}
            <StatusBadge status={property.status as any} size="sm" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

PropertyListItem.displayName = 'PropertyListItem';