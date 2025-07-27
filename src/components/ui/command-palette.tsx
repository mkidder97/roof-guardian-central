import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Building2, 
  ClipboardCheck, 
  Wrench, 
  Users, 
  Calendar,
  FileText,
  Settings,
  Sparkles,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  keywords: string[];
  shortcut?: string;
  action: () => void;
  badge?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (tab: string) => void;
  onCreateInspection?: () => void;
  onCreateWorkOrder?: () => void;
  onCreateCampaign?: () => void;
  onNavigateToInspector?: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onCreateInspection,
  onCreateWorkOrder,
  onCreateCampaign,
  onNavigateToInspector
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandAction[] = [
    // Navigation
    {
      id: 'nav-overview',
      title: 'Go to Overview',
      subtitle: 'Portfolio dashboard and metrics',
      icon: Building2,
      category: 'Navigation',
      keywords: ['overview', 'dashboard', 'home', 'portfolio'],
      action: () => onNavigate?.('overview')
    },
    {
      id: 'nav-properties',
      title: 'Go to Properties',
      subtitle: 'Manage your property portfolio',
      icon: Building2,
      category: 'Navigation',
      keywords: ['properties', 'roofs', 'buildings'],
      action: () => onNavigate?.('properties')
    },
    {
      id: 'nav-inspections',
      title: 'Go to Inspections',
      subtitle: 'View and manage inspections',
      icon: ClipboardCheck,
      category: 'Navigation',
      keywords: ['inspections', 'reports', 'schedule'],
      action: () => onNavigate?.('inspections')
    },
    {
      id: 'nav-search',
      title: 'Go to Smart Search',
      subtitle: 'AI-powered universal search',
      icon: Search,
      category: 'Navigation',
      keywords: ['search', 'find', 'filter', 'ai'],
      badge: 'AI',
      action: () => onNavigate?.('search')
    },
    {
      id: 'nav-inspector',
      title: 'Inspector Dashboard',
      subtitle: 'View your assigned inspections',
      icon: Users,
      category: 'Navigation',
      keywords: ['inspector', 'dashboard', 'assigned', 'my inspections'],
      action: () => onNavigateToInspector?.()
    },

    // Quick Actions
    {
      id: 'create-inspection',
      title: 'Schedule New Inspection',
      subtitle: 'Create and schedule a property inspection',
      icon: Plus,
      category: 'Quick Actions',
      keywords: ['create', 'schedule', 'inspection', 'new'],
      shortcut: '⌘+I',
      action: () => onCreateInspection?.()
    },
    {
      id: 'create-work-order',
      title: 'Create Work Order',
      subtitle: 'Generate a new work order',
      icon: Wrench,
      category: 'Quick Actions',
      keywords: ['create', 'work', 'order', 'repair', 'maintenance'],
      shortcut: '⌘+W',
      action: () => onCreateWorkOrder?.()
    },
    {
      id: 'create-campaign',
      title: 'Start New Campaign',
      subtitle: 'Launch an inspection campaign',
      icon: Sparkles,
      category: 'Quick Actions',
      keywords: ['campaign', 'bulk', 'multiple', 'batch'],
      shortcut: '⌘+C',
      action: () => onCreateCampaign?.()
    },

    // AI Features
    {
      id: 'ai-insights',
      title: 'Get AI Insights',
      subtitle: 'View intelligent portfolio recommendations',
      icon: Sparkles,
      category: 'AI Features',
      keywords: ['ai', 'insights', 'recommendations', 'analysis'],
      badge: 'AI',
      action: () => console.log('AI Insights')
    },
    {
      id: 'ai-search',
      title: 'Ask AI Assistant',
      subtitle: 'Get help with natural language queries',
      icon: Zap,
      category: 'AI Features',
      keywords: ['ai', 'assistant', 'help', 'ask', 'query'],
      badge: 'BETA',
      action: () => console.log('AI Assistant')
    },

    // Recent Items (these would be dynamically populated)
    {
      id: 'recent-dallas-corporate',
      title: 'Dallas Corporate Center',
      subtitle: 'Last inspected 2 days ago',
      icon: Building2,
      category: 'Recent Items',
      keywords: ['dallas', 'corporate', 'center', 'recent'],
      action: () => console.log('Navigate to Dallas Corporate Center')
    }
  ];

  const filteredCommands = commands.filter(command => {
    if (!query) return true;
    const searchTerms = query.toLowerCase().split(' ');
    return searchTerms.every(term =>
      command.title.toLowerCase().includes(term) ||
      command.subtitle?.toLowerCase().includes(term) ||
      command.keywords.some(keyword => keyword.toLowerCase().includes(term))
    );
  });

  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const category = command.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(command);
    return groups;
  }, {} as Record<string, CommandAction[]>);

  const allFilteredCommands = Object.values(groupedCommands).flat();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < allFilteredCommands.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : allFilteredCommands.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedCommand = allFilteredCommands[selectedIndex];
      if (selectedCommand) {
        selectedCommand.action();
        onOpenChange(false);
        setQuery('');
        setSelectedIndex(0);
      }
    } else if (e.key === 'Escape') {
      onOpenChange(false);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [allFilteredCommands, selectedIndex, onOpenChange]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = (command: CommandAction) => {
    command.action();
    onOpenChange(false);
    setQuery('');
    setSelectedIndex(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl">
        <div className="flex flex-col max-h-[600px]">
          {/* Search Input */}
          <div className="flex items-center border-b px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground mr-3" />
            <Input
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 p-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
            <div className="ml-2 text-xs text-muted-foreground">
              {allFilteredCommands.length} results
            </div>
          </div>

          {/* Commands List */}
          <ScrollArea className="flex-1 max-h-[400px]">
            <div className="p-2">
              {Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category} className="mb-4">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {commands.map((command, index) => {
                      const globalIndex = allFilteredCommands.indexOf(command);
                      const isSelected = globalIndex === selectedIndex;
                      
                      return (
                        <div
                          key={command.id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors",
                            isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                          )}
                          onClick={() => executeCommand(command)}
                        >
                          <div className="flex items-center justify-center h-8 w-8 rounded-md bg-background border">
                            <command.icon className="h-4 w-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {command.title}
                              </span>
                              {command.badge && (
                                <Badge variant={command.badge === 'AI' ? 'default' : 'secondary'} className="text-xs">
                                  {command.badge}
                                </Badge>
                              )}
                            </div>
                            {command.subtitle && (
                              <p className="text-sm text-muted-foreground truncate">
                                {command.subtitle}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {command.shortcut && (
                              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                {command.shortcut}
                              </kbd>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {allFilteredCommands.length === 0 && (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No commands found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try searching for "inspection", "property", or "create"
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Use ↑↓ to navigate, ↵ to select, esc to close</span>
              <div className="flex items-center gap-1">
                <span>Powered by</span>
                <Sparkles className="h-3 w-3" />
                <span>AI</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for keyboard shortcuts
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, setOpen };
}