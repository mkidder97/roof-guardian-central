import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  Clock,
  Zap,
  Shield,
  Target
} from 'lucide-react';

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Status = 'overdue' | 'urgent' | 'attention' | 'good' | 'excellent';

interface PriorityConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

/**
 * Priority system configuration inspired by emergency response protocols
 */
const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  critical: {
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    borderColor: 'border-l-red-500',
    icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
    label: 'Critical',
    description: 'Immediate action required - safety risk'
  },
  high: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    borderColor: 'border-l-orange-500',
    icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
    label: 'High',
    description: 'Action required within 24 hours'
  },
  medium: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
    borderColor: 'border-l-yellow-500',
    icon: <Clock className="h-5 w-5 text-yellow-600" />,
    label: 'Medium',
    description: 'Action required within 1 week'
  },
  low: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    borderColor: 'border-l-blue-500',
    icon: <Info className="h-5 w-5 text-blue-600" />,
    label: 'Low',
    description: 'Monitor and plan for future action'
  },
  info: {
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 border-gray-200',
    borderColor: 'border-l-gray-500',
    icon: <CheckCircle className="h-5 w-5 text-gray-600" />,
    label: 'Info',
    description: 'Informational - no action required'
  }
};

const STATUS_CONFIG: Record<Status, PriorityConfig> = {
  overdue: {
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: <Zap className="h-4 w-4 text-red-700" />,
    label: 'Overdue',
    description: 'Past due date - urgent attention needed'
  },
  urgent: {
    color: 'text-orange-800',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    icon: <AlertTriangle className="h-4 w-4 text-orange-700" />,
    label: 'Urgent',
    description: 'Requires immediate attention'
  },
  attention: {
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    icon: <Target className="h-4 w-4 text-yellow-700" />,
    label: 'Needs Attention',
    description: 'Requires attention soon'
  },
  good: {
    color: 'text-green-800',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    icon: <CheckCircle className="h-4 w-4 text-green-700" />,
    label: 'Good',
    description: 'In good condition'
  },
  excellent: {
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    icon: <Shield className="h-4 w-4 text-emerald-700" />,
    label: 'Excellent',
    description: 'Excellent condition'
  }
};

/**
 * Visual priority indicator badge
 */
export const PriorityBadge: React.FC<{
  priority: Priority;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
}> = ({ priority, size = 'md', showIcon = true, showLabel = true }) => {
  const config = PRIORITY_CONFIG[priority];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5', 
    lg: 'text-base px-3 py-2'
  };

  const variant = priority === 'critical' ? 'destructive' : 
                  priority === 'high' ? 'destructive' :
                  priority === 'medium' ? 'secondary' : 'outline';

  return (
    <Badge variant={variant} className={`${sizeClasses[size]} flex items-center gap-1`}>
      {showIcon && <span className="flex-shrink-0">{config.icon}</span>}
      {showLabel && config.label}
    </Badge>
  );
};

/**
 * Status indicator badge
 */
export const StatusBadge: React.FC<{
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}> = ({ status, size = 'md', showIcon = true }) => {
  const config = STATUS_CONFIG[status];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5',
    lg: 'text-base px-3 py-2'
  };

  const getVariant = () => {
    switch (status) {
      case 'overdue':
      case 'urgent':
        return 'destructive';
      case 'attention':
        return 'secondary';
      case 'good':
      case 'excellent':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <Badge variant={getVariant()} className={`${sizeClasses[size]} ${config.color} flex items-center gap-1`}>
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
};

/**
 * Priority-based alert component
 */
export const PriorityAlert: React.FC<{
  priority: Priority;
  title?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ priority, title, children, className = '' }) => {
  const config = PRIORITY_CONFIG[priority];
  
  const variant = priority === 'critical' || priority === 'high' ? 'destructive' : 'default';

  return (
    <Alert variant={variant} className={`${config.bgColor} ${config.borderColor} border-l-4 ${className}`}>
      <div className="flex items-start gap-2">
        {config.icon}
        <div className="flex-1">
          {title && <h4 className={`font-semibold ${config.color} mb-1`}>{title}</h4>}
          <AlertDescription className={config.color}>
            {children}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

/**
 * Priority-based card with visual hierarchy
 */
export const PriorityCard: React.FC<{
  priority: Priority;
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}> = ({ priority, title, children, className = '', actions }) => {
  const config = PRIORITY_CONFIG[priority];
  
  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-l-4 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.icon}
            <h3 className={`font-semibold ${config.color}`}>{title}</h3>
            <PriorityBadge priority={priority} size="sm" showIcon={false} />
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent className={config.color}>
        {children}
      </CardContent>
    </Card>
  );
};

/**
 * Priority list with visual sorting
 */
export const PriorityList: React.FC<{
  items: Array<{
    id: string;
    priority: Priority;
    title: string;
    description: string;
    metadata?: any;
  }>;
  onItemClick?: (item: any) => void;
  className?: string;
}> = ({ items, onItemClick, className = '' }) => {
  
  const priorityOrder: Priority[] = ['critical', 'high', 'medium', 'low', 'info'];
  
  const sortedItems = [...items].sort((a, b) => {
    return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
  });

  return (
    <div className={`space-y-3 ${className}`}>
      {sortedItems.map((item) => {
        const config = PRIORITY_CONFIG[item.priority];
        
        return (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className={`
              p-4 rounded-lg border-l-4 cursor-pointer transition-all duration-200
              ${config.bgColor} ${config.borderColor}
              hover:shadow-md hover:scale-[1.02]
              ${item.priority === 'critical' ? 'animate-pulse hover:animate-none' : ''}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {config.icon}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-medium ${config.color}`}>{item.title}</h4>
                    <PriorityBadge priority={item.priority} size="sm" showIcon={false} />
                  </div>
                  <p className={`text-sm ${config.color} opacity-80`}>
                    {item.description}
                  </p>
                  {item.metadata && (
                    <div className="flex items-center gap-4 mt-2 text-xs opacity-60">
                      {item.metadata.location && (
                        <span>📍 {item.metadata.location}</span>
                      )}
                      {item.metadata.cost && (
                        <span>💰 ${item.metadata.cost.toLocaleString()}</span>
                      )}
                      {item.metadata.dueDate && (
                        <span>⏰ Due: {new Date(item.metadata.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {sortedItems.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No items to display</p>
        </div>
      )}
    </div>
  );
};

/**
 * Priority-based progress indicator
 */
export const PriorityProgress: React.FC<{
  priorities: Record<Priority, number>;
  total: number;
  className?: string;
}> = ({ priorities, total, className = '' }) => {
  
  const priorityOrder: Priority[] = ['critical', 'high', 'medium', 'low', 'info'];
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm font-medium mb-2">
        <span>Priority Distribution</span>
        <span>{total} Total Items</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className="flex h-full">
          {priorityOrder.map((priority) => {
            const count = priorities[priority] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            const config = PRIORITY_CONFIG[priority];
            
            if (count === 0) return null;
            
            return (
              <div
                key={priority}
                className={`h-full ${config.bgColor.replace('bg-', 'bg-opacity-80 bg-')}`}
                style={{ width: `${percentage}%` }}
                title={`${config.label}: ${count} items (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      </div>
      
      <div className="grid grid-cols-5 gap-2 text-xs">
        {priorityOrder.map((priority) => {
          const count = priorities[priority] || 0;
          const config = PRIORITY_CONFIG[priority];
          
          return (
            <div key={priority} className="text-center">
              <div className={`w-3 h-3 rounded mx-auto mb-1 ${config.bgColor.replace('bg-', 'bg-opacity-80 bg-')}`} />
              <div className={config.color}>{count}</div>
              <div className="text-gray-500">{config.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};