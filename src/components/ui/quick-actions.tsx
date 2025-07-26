import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Mic, 
  FileText, 
  AlertTriangle, 
  Save, 
  Share, 
  MapPin,
  Clock,
  DollarSign,
  Wrench,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInspectorEvents } from '@/hooks/useInspectorEvents';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  priority: 'high' | 'medium' | 'low';
  context: string[];
  disabled?: boolean;
  badge?: string | number;
  tooltip?: string;
}

interface QuickActionsProps {
  context: string;
  propertyData?: any;
  inspectionData?: any;
  className?: string;
}

/**
 * Context-aware quick actions component
 * Shows relevant actions based on current context and state
 */
export const QuickActions: React.FC<QuickActionsProps> = ({
  context,
  propertyData,
  inspectionData,
  className = ''
}) => {
  const { emit } = useInspectorEvents();
  const [expandedActions, setExpandedActions] = useState(false);

  // Define all available actions
  const allActions: QuickAction[] = useMemo(() => [
    // Property selection context
    {
      id: 'start-inspection',
      label: 'Start Inspection',
      icon: <Camera className="h-4 w-4" />,
      action: () => emit('inspection.start_requested', { propertyId: propertyData?.id }),
      shortcut: 'Ctrl+S',
      priority: 'high',
      context: ['property-selected'],
      tooltip: 'Begin inspection for this property'
    },
    {
      id: 'view-history',
      label: 'View History',
      icon: <Clock className="h-4 w-4" />,
      action: () => emit('navigation.tab_changed', { tab: 'history' }),
      priority: 'medium',
      context: ['property-selected'],
      tooltip: 'View inspection history'
    },
    {
      id: 'schedule-inspection',
      label: 'Schedule',
      icon: <Calendar className="h-4 w-4" />,
      action: () => emit('inspection.schedule_requested', { propertyId: propertyData?.id }),
      priority: 'medium',
      context: ['property-selected'],
      tooltip: 'Schedule future inspection'
    },

    // Active inspection context
    {
      id: 'capture-photo',
      label: 'Capture Photo',
      icon: <Camera className="h-4 w-4" />,
      action: () => emit('photo.capture_requested', {}),
      shortcut: 'Ctrl+C',
      priority: 'high',
      context: ['inspection-active'],
      tooltip: 'Take photo for current inspection'
    },
    {
      id: 'voice-note',
      label: 'Voice Note',
      icon: <Mic className="h-4 w-4" />,
      action: () => emit('voice_note.toggle_requested', {}),
      shortcut: 'Ctrl+V',
      priority: 'high',
      context: ['inspection-active'],
      tooltip: 'Record voice note'
    },
    {
      id: 'add-deficiency',
      label: 'Add Issue',
      icon: <AlertTriangle className="h-4 w-4" />,
      action: () => emit('deficiency.add_requested', {}),
      shortcut: 'Ctrl+D',
      priority: 'high',
      context: ['inspection-active'],
      badge: inspectionData?.deficiencyCount || 0,
      tooltip: 'Document new deficiency'
    },
    {
      id: 'save-progress',
      label: 'Save Progress',
      icon: <Save className="h-4 w-4" />,
      action: () => emit('inspection.save_requested', {}),
      priority: 'medium',
      context: ['inspection-active'],
      tooltip: 'Save current progress'
    },
    {
      id: 'complete-inspection',
      label: 'Complete',
      icon: <FileText className="h-4 w-4" />,
      action: () => emit('inspection.complete_requested', {}),
      shortcut: 'Ctrl+Enter',
      priority: 'high',
      context: ['inspection-active'],
      tooltip: 'Complete and submit inspection'
    },

    // Critical issues context
    {
      id: 'emergency-contact',
      label: 'Emergency Call',
      icon: <Phone className="h-4 w-4" />,
      action: () => emit('emergency.contact_requested', { propertyId: propertyData?.id }),
      priority: 'high',
      context: ['critical-issues'],
      tooltip: 'Contact emergency services'
    },
    {
      id: 'urgent-report',
      label: 'Urgent Report',
      icon: <AlertTriangle className="h-4 w-4" />,
      action: () => emit('report.urgent_requested', {}),
      priority: 'high',
      context: ['critical-issues'],
      tooltip: 'Generate urgent safety report'
    },

    // Review context
    {
      id: 'generate-report',
      label: 'Generate Report',
      icon: <FileText className="h-4 w-4" />,
      action: () => emit('report.generate_requested', {}),
      priority: 'high',
      context: ['review'],
      tooltip: 'Generate detailed inspection report'
    },
    {
      id: 'share-findings',
      label: 'Share',
      icon: <Share className="h-4 w-4" />,
      action: () => emit('findings.share_requested', {}),
      priority: 'medium',
      context: ['review'],
      tooltip: 'Share findings with stakeholders'
    },
    {
      id: 'request-quote',
      label: 'Request Quote',
      icon: <DollarSign className="h-4 w-4" />,
      action: () => emit('quote.request_requested', {}),
      priority: 'medium',
      context: ['review'],
      tooltip: 'Request repair quote'
    },

    // Maintenance context
    {
      id: 'schedule-maintenance',
      label: 'Schedule Work',
      icon: <Wrench className="h-4 w-4" />,
      action: () => emit('maintenance.schedule_requested', {}),
      priority: 'medium',
      context: ['maintenance'],
      tooltip: 'Schedule maintenance work'
    },
    {
      id: 'contact-vendor',
      label: 'Contact Vendor',
      icon: <Mail className="h-4 w-4" />,
      action: () => emit('vendor.contact_requested', {}),
      priority: 'medium',
      context: ['maintenance'],
      tooltip: 'Contact preferred vendor'
    }
  ], [emit, propertyData, inspectionData]);

  // Filter actions based on current context
  const contextualActions = useMemo(() => {
    return allActions.filter(action => action.context.includes(context));
  }, [allActions, context]);

  // Sort actions by priority
  const sortedActions = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...contextualActions].sort((a, b) => {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [contextualActions]);

  // Split into primary and secondary actions
  const primaryActions = sortedActions.slice(0, 4);
  const secondaryActions = sortedActions.slice(4);

  const handleActionClick = useCallback((action: QuickAction) => {
    if (!action.disabled) {
      action.action();
    }
  }, []);

  if (sortedActions.length === 0) {
    return null;
  }

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
          {secondaryActions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedActions(!expandedActions)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {primaryActions.map((action) => (
            <Button
              key={action.id}
              variant={action.priority === 'high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleActionClick(action)}
              disabled={action.disabled}
              className="relative justify-start"
              title={action.tooltip}
            >
              {action.icon}
              <span className="ml-2 text-xs">{action.label}</span>
              {action.badge !== undefined && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {action.badge}
                </Badge>
              )}
              {action.shortcut && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {action.shortcut}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Secondary actions dropdown */}
        {secondaryActions.length > 0 && expandedActions && (
          <div className="mt-3 pt-3 border-t">
            <div className="grid grid-cols-1 gap-1">
              {secondaryActions.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled}
                  className="justify-start h-8"
                  title={action.tooltip}
                >
                  {action.icon}
                  <span className="ml-2 text-xs">{action.label}</span>
                  {action.badge !== undefined && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {action.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Floating quick actions for critical contexts
 */
export const FloatingQuickActions: React.FC<{
  context: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}> = ({ context, position = 'bottom-right' }) => {
  const { emit } = useInspectorEvents();
  const [isVisible, setIsVisible] = useState(false);

  // Show floating actions for critical contexts
  useEffect(() => {
    const criticalContexts = ['critical-issues', 'emergency', 'inspection-active'];
    setIsVisible(criticalContexts.includes(context));
  }, [context]);

  const criticalActions = useMemo(() => [
    {
      id: 'emergency-photo',
      icon: <Camera className="h-5 w-5" />,
      action: () => emit('photo.emergency_requested', {}),
      tooltip: 'Emergency photo capture',
      priority: 'high'
    },
    {
      id: 'emergency-call',
      icon: <Phone className="h-5 w-5" />,
      action: () => emit('emergency.call_requested', {}),
      tooltip: 'Emergency contact',
      priority: 'high'
    },
    {
      id: 'urgent-save',
      icon: <Save className="h-5 w-5" />,
      action: () => emit('inspection.emergency_save_requested', {}),
      tooltip: 'Emergency save',
      priority: 'high'
    }
  ], [emit]);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2`}>
      {criticalActions.map((action) => (
        <Button
          key={action.id}
          size="icon"
          variant="destructive"
          onClick={action.action}
          title={action.tooltip}
          className="h-12 w-12 rounded-full shadow-lg animate-pulse hover:animate-none"
        >
          {action.icon}
        </Button>
      ))}
    </div>
  );
};

/**
 * Context-aware action bar for different inspection phases
 */
export const InspectionActionBar: React.FC<{
  phase: 'preparation' | 'active' | 'review' | 'complete';
  data?: any;
}> = ({ phase, data }) => {
  const actions = useMemo(() => {
    switch (phase) {
      case 'preparation':
        return (
          <QuickActions 
            context="property-selected" 
            propertyData={data}
            className="w-full"
          />
        );
      case 'active':
        return (
          <>
            <QuickActions 
              context="inspection-active" 
              inspectionData={data}
              className="w-full"
            />
            <FloatingQuickActions context="inspection-active" />
          </>
        );
      case 'review':
        return (
          <QuickActions 
            context="review" 
            inspectionData={data}
            className="w-full"
          />
        );
      case 'complete':
        return (
          <QuickActions 
            context="maintenance" 
            inspectionData={data}
            className="w-full"
          />
        );
      default:
        return null;
    }
  }, [phase, data]);

  return <div className="w-full">{actions}</div>;
};