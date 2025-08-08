import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Calendar, 
  Users, 
  Building2, 
  FileText,
  Settings,
  Upload,
  Download
} from 'lucide-react';

interface QuickActionsProps {
  onScheduleInspection: () => void;
}

export function QuickActions({ onScheduleInspection }: QuickActionsProps) {
  const actions = [
    {
      title: 'Schedule Inspection',
      description: 'Create new inspection appointments',
      icon: Calendar,
      onClick: onScheduleInspection,
      variant: 'default' as const,
      primary: true
    },
    {
      title: 'Add Property',
      description: 'Register new properties',
      icon: Building2,
      onClick: () => console.log('Add property'),
      variant: 'outline' as const
    },
    {
      title: 'Manage Inspectors',
      description: 'View and assign inspectors',
      icon: Users,
      onClick: () => console.log('Manage inspectors'),
      variant: 'outline' as const
    },
    {
      title: 'Upload Documents',
      description: 'Add property documents',
      icon: Upload,
      onClick: () => console.log('Upload documents'),
      variant: 'outline' as const
    },
    {
      title: 'Generate Reports',
      description: 'Export inspection data',
      icon: Download,
      onClick: () => console.log('Generate reports'),
      variant: 'outline' as const
    },
    {
      title: 'System Settings',
      description: 'Configure system preferences',
      icon: Settings,
      onClick: () => console.log('System settings'),
      variant: 'outline' as const
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.title}
              variant={action.variant}
              className={`h-auto p-4 justify-start ${
                action.primary 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'h-16 text-left'
              }`}
              onClick={action.onClick}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className={`text-xs ${
                    action.primary ? 'text-blue-100' : 'text-muted-foreground'
                  }`}>
                    {action.description}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}