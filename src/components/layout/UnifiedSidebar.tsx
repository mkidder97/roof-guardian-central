import React, { useState } from 'react';
import { 
  Home, 
  Building2, 
  ClipboardCheck, 
  Megaphone, 
  Wrench, 
  Search, 
  Upload,
  ChevronDown,
  ChevronRight,
  Users,
  DollarSign,
  Shield,
  Settings,
  BarChart3,
  Calendar,
  UserCog,
  BrainCircuit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: string;
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles?: string[];
  children?: NavItem[];
}

export function UnifiedSidebar({ 
  activeTab, 
  onTabChange, 
  userRole, 
  className,
  collapsed = false,
  onToggleCollapse 
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['main']);

  const navigationItems: NavItem[] = [
    {
      id: 'main',
      label: 'Main Navigation',
      icon: Home,
      children: [
        {
          id: 'overview',
          label: 'Overview',
          icon: Home,
          badge: 'NEW'
        },
        {
          id: 'properties',
          label: 'Properties',
          icon: Building2
        },
        {
          id: 'inspections',
          label: 'Inspections',
          icon: ClipboardCheck
        },
        {
          id: 'campaigns',
          label: 'Campaigns',
          icon: Megaphone
        },
        {
          id: 'work-orders',
          label: 'Work Orders',
          icon: Wrench
        }
      ]
    },
    {
      id: 'search',
      label: 'Universal Search',
      icon: Search,
      children: [
        {
          id: 'search',
          label: 'Smart Search',
          icon: Search,
          badge: 'AI'
        }
      ]
    },
    {
      id: 'tools',
      label: 'Tools & Data',
      icon: Settings,
      children: [
        {
          id: 'inspector-tools',
          label: 'Inspector Intelligence',
          icon: BrainCircuit,
          roles: ['inspector', 'super_admin'],
          badge: 'AI'
        },
        {
          id: 'historical-upload',
          label: 'Historical Upload',
          icon: Upload,
          roles: ['super_admin']
        }
      ]
    },
    {
      id: 'management',
      label: 'Management',
      icon: UserCog,
      roles: ['manager', 'super_admin'],
      children: [
        {
          id: 'accounts',
          label: 'User Accounts',
          icon: UserCog,
          roles: ['manager', 'super_admin']
        }
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const hasAccess = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    if (!hasAccess(item)) return null;

    const isActive = activeTab === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.includes(item.id);

    if (hasChildren) {
      return (
        <Collapsible key={item.id} open={isExpanded} onOpenChange={() => toggleSection(item.id)}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-9 px-3",
                level === 0 ? "text-xs font-semibold text-muted-foreground uppercase tracking-wide" : "",
                level > 0 ? "pl-6" : ""
              )}
            >
              {!collapsed && (
                <>
                  <item.icon className="h-4 w-4 mr-2" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
              {collapsed && <item.icon className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Button
        key={item.id}
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start h-9",
          level > 0 ? "pl-8" : "pl-3",
          isActive && "bg-secondary text-secondary-foreground"
        )}
        onClick={() => onTabChange(item.id)}
      >
        <item.icon className="h-4 w-4 mr-2" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <Badge variant={item.badge === 'AI' ? 'default' : 'secondary'} className="text-xs">
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </Button>
    );
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-r",
      collapsed ? "w-16" : "w-64",
      "transition-all duration-300 ease-in-out",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="text-lg font-semibold">RoofMind</h2>
              <p className="text-xs text-muted-foreground">Intelligent Property Management</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-2">
        <nav className="space-y-2">
          {navigationItems.map(item => renderNavItem(item))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {!collapsed && (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>System Online</span>
            </>
          )}
          {collapsed && <div className="h-2 w-2 rounded-full bg-green-500 mx-auto"></div>}
        </div>
      </div>
    </div>
  );
}