import React, { forwardRef, useId, useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X, 
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-react';

/**
 * Accessible form field with proper ARIA attributes
 */
interface AccessibleFieldProps {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement;
}

export const AccessibleField: React.FC<AccessibleFieldProps> = ({
  label,
  description,
  error,
  required = false,
  children
}) => {
  const fieldId = useId();
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ');

  return (
    <div className="space-y-2">
      <Label 
        htmlFor={fieldId}
        className={`block text-sm font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </Label>
      
      {description && (
        <p 
          id={descriptionId}
          className="text-sm text-gray-500"
        >
          {description}
        </p>
      )}
      
      {React.cloneElement(children, {
        id: fieldId,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required
      })}
      
      {error && (
        <div 
          id={errorId}
          className="flex items-center gap-2 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * Accessible password input with show/hide toggle
 */
interface AccessiblePasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AccessiblePasswordInput = forwardRef<HTMLInputElement, AccessiblePasswordInputProps>(
  ({ label, error, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const fieldId = useId();
    const errorId = error ? `${fieldId}-error` : undefined;

    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
          {label}
        </Label>
        
        <div className="relative">
          <Input
            {...props}
            ref={ref}
            id={fieldId}
            type={showPassword ? 'text' : 'password'}
            aria-describedby={errorId}
            aria-invalid={error ? 'true' : undefined}
            className={`pr-10 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
          />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </div>
        
        {error && (
          <div 
            id={errorId}
            className="flex items-center gap-2 text-sm text-red-600"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    );
  }
);

AccessiblePasswordInput.displayName = 'AccessiblePasswordInput';

/**
 * Accessible status indicator with proper ARIA attributes
 */
interface AccessibleStatusProps {
  status: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: string;
  className?: string;
}

export const AccessibleStatus: React.FC<AccessibleStatusProps> = ({
  status,
  message,
  details,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-600'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600'
        };
      case 'error':
        return {
          icon: <X className="h-5 w-5" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600'
        };
      default:
        return {
          icon: <Info className="h-5 w-5" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`
        p-4 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}
      `}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3">
        <div className={config.iconColor} aria-hidden="true">
          {config.icon}
        </div>
        <div className="flex-1">
          <p className={`font-medium ${config.textColor}`}>
            {message}
          </p>
          {details && (
            <p className={`mt-1 text-sm ${config.textColor} opacity-80`}>
              {details}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Accessible collapsible section with proper ARIA attributes
 */
interface AccessibleCollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const AccessibleCollapsible: React.FC<AccessibleCollapsibleProps> = ({
  title,
  children,
  defaultOpen = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const buttonId = useId();

  return (
    <div className={`border rounded-lg ${className}`}>
      <button
        id={buttonId}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span className="font-medium">{title}</span>
        <ChevronDown 
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      
      <div
        id={contentId}
        role="region"
        aria-labelledby={buttonId}
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Accessible data table with proper ARIA attributes and keyboard navigation
 */
interface AccessibleTableProps {
  caption: string;
  headers: string[];
  data: Array<Record<string, any>>;
  className?: string;
  onRowSelect?: (rowData: any, index: number) => void;
}

export const AccessibleTable: React.FC<AccessibleTableProps> = ({
  caption,
  headers,
  data,
  className = '',
  onRowSelect
}) => {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const handleKeyDown = (event: React.KeyboardEvent, rowIndex: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextRow = Math.min(rowIndex + 1, data.length - 1);
        setSelectedRow(nextRow);
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevRow = Math.max(rowIndex - 1, 0);
        setSelectedRow(prevRow);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onRowSelect) {
          onRowSelect(data[rowIndex], rowIndex);
        }
        break;
    }
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200" role="table">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`
                ${selectedRow === rowIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}
                ${onRowSelect ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500' : ''}
              `}
              tabIndex={onRowSelect ? 0 : undefined}
              role={onRowSelect ? 'button' : undefined}
              aria-label={onRowSelect ? `Select row ${rowIndex + 1}` : undefined}
              onKeyDown={onRowSelect ? (e) => handleKeyDown(e, rowIndex) : undefined}
              onClick={() => {
                setSelectedRow(rowIndex);
                if (onRowSelect) {
                  onRowSelect(row, rowIndex);
                }
              }}
            >
              {headers.map((header, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                >
                  {row[header.toLowerCase()] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {data.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No data available</p>
        </div>
      )}
    </div>
  );
};

/**
 * Accessible progress indicator with proper ARIA attributes
 */
interface AccessibleProgressProps {
  value: number;
  max: number;
  label: string;
  description?: string;
  className?: string;
}

export const AccessibleProgress: React.FC<AccessibleProgressProps> = ({
  value,
  max,
  label,
  description,
  className = ''
}) => {
  const percentage = Math.round((value / max) * 100);
  const progressId = useId();

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={progressId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <span className="text-sm text-gray-500" aria-hidden="true">
          {value} / {max} ({percentage}%)
        </span>
      </div>
      
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          id={progressId}
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${label}: ${value} of ${max} completed`}
        />
      </div>
    </div>
  );
};

/**
 * Accessible card with enhanced focus and selection states
 */
interface AccessibleCardProps {
  title: string;
  content: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  priority?: 'high' | 'medium' | 'low';
  className?: string;
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  title,
  content,
  onClick,
  selected = false,
  priority,
  className = ''
}) => {
  const priorityColors = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    low: 'border-l-blue-500 bg-blue-50'
  };

  const priorityLabels = {
    high: 'High priority',
    medium: 'Medium priority', 
    low: 'Low priority'
  };

  return (
    <Card
      className={`
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500' : ''}
        ${selected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
        ${priority ? `border-l-4 ${priorityColors[priority]}` : ''}
        ${className}
      `}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `Select ${title}` : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          {priority && (
            <Badge 
              variant={priority === 'high' ? 'destructive' : 'secondary'}
              aria-label={priorityLabels[priority]}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};