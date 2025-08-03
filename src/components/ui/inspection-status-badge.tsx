import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  Clock, 
  Eye, 
  CheckCircle,
  AlertCircle,
  X 
} from 'lucide-react';

export type InspectionStatus = 'scheduled' | 'in_progress' | 'ready_for_review' | 'completed' | 'cancelled';

interface InspectionStatusBadgeProps {
  status: InspectionStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  scheduled: {
    label: 'Scheduled',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Calendar,
    description: 'Inspection is scheduled and ready to begin'
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Clock,
    description: 'Inspection is currently being conducted'
  },
  ready_for_review: {
    label: 'Ready for Review',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Eye,
    description: 'Inspection completed, awaiting review and approval'
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    description: 'Inspection completed and approved'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: X,
    description: 'Inspection has been cancelled'
  }
};

export function InspectionStatusBadge({ 
  status, 
  className, 
  showIcon = true,
  size = 'md'
}: InspectionStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge 
      className={cn(
        config.color,
        sizeClasses[size],
        'font-medium border inline-flex items-center gap-1.5',
        className
      )}
      title={config.description}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
}

export function getStatusColor(status: InspectionStatus): string {
  return statusConfig[status].color;
}

export function getStatusLabel(status: InspectionStatus): string {
  return statusConfig[status].label;
}

export function getStatusDescription(status: InspectionStatus): string {
  return statusConfig[status].description;
}

export function getNextStatus(currentStatus: InspectionStatus): InspectionStatus | null {
  const workflow: Record<InspectionStatus, InspectionStatus | null> = {
    scheduled: 'in_progress',
    in_progress: 'ready_for_review', 
    ready_for_review: 'completed',
    completed: null,
    cancelled: null
  };
  
  return workflow[currentStatus];
}

export function canTransitionTo(from: InspectionStatus, to: InspectionStatus): boolean {
  const allowedTransitions: Record<InspectionStatus, InspectionStatus[]> = {
    scheduled: ['in_progress', 'cancelled'],
    in_progress: ['ready_for_review', 'scheduled', 'cancelled'], // Can go back to scheduled or cancel
    ready_for_review: ['completed', 'in_progress', 'cancelled'], // Can go back for more work or cancel
    completed: [], // Final state
    cancelled: [] // Final state
  };
  
  return allowedTransitions[from].includes(to);
}

export const STATUS_WORKFLOW_ORDER: InspectionStatus[] = [
  'scheduled',
  'in_progress', 
  'ready_for_review',
  'completed'
];

export function getStatusPriority(status: InspectionStatus): number {
  return STATUS_WORKFLOW_ORDER.indexOf(status);
}