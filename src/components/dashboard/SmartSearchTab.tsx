import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Users, 
  Building, 
  DollarSign, 
  Shield, 
  Wrench, 
  UserCog, 
  BarChart3,
  Filter,
  X,
  ArrowUpDown,
  Eye,
  Edit,
  Download,
  Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface SearchFilter {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  count?: number;
  query: () => Promise<any[]>;
  fields: string[];
  actions: SearchAction[];
}

interface SearchAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (item: any) => void;
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  description: string;
  metadata: Record<string, any>;
  relevance: number;
}

export function SmartSearchTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'name'>('relevance');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Define search filters for each data type
  const searchFilters: SearchFilter[] = [
    {
      id: 'all',
      label: 'All Results',
      icon: Search,
      color: 'bg-blue-500',
      fields: ['*'],
      actions: [
        { id: 'view', label: 'View', icon: Eye, onClick: (item) => setSelectedItem(item) },
        { id: 'export', label: 'Export', icon: Download, onClick: (item) => exportItem(item) }
      ],
      query: async () => {
        // This will be implemented to search across all tables
        return [];
      }
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Users,
      color: 'bg-green-500',
      fields: ['company_name', 'industry', 'contact_email'],
      actions: [
        { id: 'view', label: 'View', icon: Eye, onClick: (item) => setSelectedItem(item) },
        { id: 'contact', label: 'Contact', icon: Users, onClick: (item) => contactClient(item) }
      ],
      query: async () => {
        const { data } = await supabase
          .from('clients')
          .select(`
            *,
            client_contacts(*),
            roofs(count)
          `);
        return data || [];
      }
    },
    {
      id: 'vendors',
      label: 'Vendors',
      icon: Building,
      color: 'bg-purple-500',
      fields: ['company_name', 'contact_email', 'specialty'],
      actions: [
        { id: 'view', label: 'View', icon: Eye, onClick: (item) => setSelectedItem(item) },
        { id: 'assign', label: 'Assign Work', icon: Wrench, onClick: (item) => assignWork(item) }
      ],
      query: async () => {
        const { data } = await supabase
          .from('vendors')
          .select('*');
        return data || [];
      }
    },
    {
      id: 'budgets',
      label: 'Budgets',
      icon: DollarSign,
      color: 'bg-yellow-500',
      fields: ['property_name', 'capital_budget', 'preventative_budget'],
      actions: [
        { id: 'view', label: 'View', icon: Eye, onClick: (item) => setSelectedItem(item) },
        { id: 'edit', label: 'Edit', icon: Edit, onClick: (item) => editBudget(item) }
      ],
      query: async () => {
        const { data } = await supabase
          .from('roofs')
          .select('id, property_name, capital_budget, preventative_budget, total_budget')
          .not('capital_budget', 'is', null);
        return data || [];
      }
    },
    {
      id: 'warranties',
      label: 'Warranties',
      icon: Shield,
      color: 'bg-indigo-500',
      fields: ['property_name', 'warranty_company', 'warranty_expiration'],
      actions: [
        { id: 'view', label: 'View', icon: Eye, onClick: (item) => setSelectedItem(item) },
        { id: 'renew', label: 'Renew', icon: Shield, onClick: (item) => renewWarranty(item) }
      ],
      query: async () => {
        const { data } = await supabase
          .from('roofs')
          .select('id, property_name, warranty_company, warranty_expiration, warranty_notes')
          .not('warranty_company', 'is', null);
        return data || [];
      }
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: Wrench,
      color: 'bg-orange-500',
      fields: ['property_name', 'last_maintenance_date', 'maintenance_notes'],
      actions: [
        { id: 'view', label: 'View', icon: Eye, onClick: (item) => setSelectedItem(item) },
        { id: 'schedule', label: 'Schedule', icon: Wrench, onClick: (item) => scheduleMaintenance(item) }
      ],
      query: async () => {
        const { data } = await supabase
          .from('roofs')
          .select('id, property_name, last_maintenance_date, maintenance_notes, next_maintenance_date')
          .not('last_maintenance_date', 'is', null);
        return data || [];
      }
    },
    {
      id: 'managers',
      label: 'Property Managers',
      icon: UserCog,
      color: 'bg-teal-500',
      fields: ['property_manager_name', 'property_manager_email', 'property_manager_phone'],
      actions: [
        { id: 'view', label: 'View', icon: Eye, onClick: (item) => setSelectedItem(item) },
        { id: 'contact', label: 'Contact', icon: UserCog, onClick: (item) => contactManager(item) }
      ],
      query: async () => {
        const { data } = await supabase
          .from('roofs')
          .select('id, property_name, property_manager_name, property_manager_email, property_manager_phone')
          .not('property_manager_name', 'is', null);
        return data || [];
      }
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      color: 'bg-pink-500',
      fields: ['metric_name', 'value', 'trend'],
      actions: [
        { id: 'view', label: 'View Chart', icon: BarChart3, onClick: (item) => viewChart(item) },
        { id: 'export', label: 'Export Data', icon: Download, onClick: (item) => exportAnalytics(item) }
      ],
      query: async () => {
        // This would query aggregated analytics data
        return [];
      }
    }
  ];

  // Helper function for relevance calculation
  const calculateRelevance = (query: string, fields: (string | null | undefined)[]): number => {
    let score = 0;
    const queryWords = query.split(' ').filter(word => word.length > 0);
    
    fields.forEach(field => {
      if (!field) return;
      const fieldLower = field.toLowerCase();
      
      queryWords.forEach(word => {
        if (fieldLower.includes(word)) {
          score += fieldLower.startsWith(word) ? 10 : 5;
        }
      });
    });
    
    return score;
  };

  // Load data for active filter
  const { data: searchData, isLoading } = useQuery({
    queryKey: ['search', activeFilter],
    queryFn: () => {
      const filter = searchFilters.find(f => f.id === activeFilter);
      return filter?.query() || [];
    },
    enabled: activeFilter !== 'all'
  });

  // Process search results
  const searchResults = useMemo(() => {
    if (!searchData || !searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const filter = searchFilters.find(f => f.id === activeFilter);
    
    return searchData
      .map((item: any) => {
        let relevance = 0;
        let title = '';
        let subtitle = '';
        let description = '';

        // Calculate relevance and format display based on filter type
        switch (activeFilter) {
          case 'clients':
            title = item.company_name || 'Unknown Client';
            subtitle = item.industry || 'No industry specified';
            description = `${item.roofs?.[0]?.count || 0} properties`;
            relevance = calculateRelevance(query, [item.company_name, item.industry, item.contact_email]);
            break;
          
          case 'vendors':
            title = item.company_name || 'Unknown Vendor';
            subtitle = item.contact_email || 'No email';
            description = item.specialty || 'General contractor';
            relevance = calculateRelevance(query, [item.company_name, item.contact_email, item.specialty]);
            break;
          
          case 'budgets':
            title = item.property_name || 'Unknown Property';
            subtitle = `Total Budget: $${item.total_budget?.toLocaleString() || 0}`;
            description = `Capital: $${item.capital_budget?.toLocaleString() || 0} | Preventative: $${item.preventative_budget?.toLocaleString() || 0}`;
            relevance = calculateRelevance(query, [item.property_name]);
            break;
          
          case 'warranties':
            title = item.property_name || 'Unknown Property';
            subtitle = item.warranty_company || 'No warranty company';
            description = `Expires: ${item.warranty_expiration ? new Date(item.warranty_expiration).toLocaleDateString() : 'Unknown'}`;
            relevance = calculateRelevance(query, [item.property_name, item.warranty_company]);
            break;
          
          case 'maintenance':
            title = item.property_name || 'Unknown Property';
            subtitle = `Last Maintenance: ${item.last_maintenance_date ? new Date(item.last_maintenance_date).toLocaleDateString() : 'Never'}`;
            description = item.maintenance_notes || 'No maintenance notes';
            relevance = calculateRelevance(query, [item.property_name, item.maintenance_notes]);
            break;
          
          case 'managers':
            title = item.property_manager_name || 'Unknown Manager';
            subtitle = item.property_manager_email || 'No email';
            description = `Property: ${item.property_name}`;
            relevance = calculateRelevance(query, [item.property_manager_name, item.property_manager_email]);
            break;
          
          default:
            title = 'Unknown Item';
            subtitle = 'No data';
            description = '';
            relevance = 0;
        }

        return {
          id: item.id,
          type: activeFilter,
          title,
          subtitle,
          description,
          metadata: item,
          relevance
        };
      })
      .filter((result: SearchResult) => result.relevance > 0)
      .sort((a: SearchResult, b: SearchResult) => {
        switch (sortBy) {
          case 'relevance':
            return b.relevance - a.relevance;
          case 'name':
            return a.title.localeCompare(b.title);
          case 'date':
            return new Date(b.metadata.created_at || 0).getTime() - new Date(a.metadata.created_at || 0).getTime();
          default:
            return 0;
        }
      });
  }, [searchData, searchQuery, activeFilter, sortBy]);

  // Update filter counts
  useEffect(() => {
    searchFilters.forEach(filter => {
      if (filter.id !== 'all') {
        filter.query().then(data => {
          filter.count = data.length;
        });
      }
    });
  }, []);


  // Action handlers
  const exportItem = (item: any) => {
    console.log('Export item:', item);
  };

  const contactClient = (item: any) => {
    console.log('Contact client:', item);
  };

  const assignWork = (item: any) => {
    console.log('Assign work to vendor:', item);
  };

  const editBudget = (item: any) => {
    console.log('Edit budget:', item);
  };

  const renewWarranty = (item: any) => {
    console.log('Renew warranty:', item);
  };

  const scheduleMaintenance = (item: any) => {
    console.log('Schedule maintenance:', item);
  };

  const contactManager = (item: any) => {
    console.log('Contact manager:', item);
  };

  const viewChart = (item: any) => {
    console.log('View chart:', item);
  };

  const exportAnalytics = (item: any) => {
    console.log('Export analytics:', item);
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search across all your data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">AI-Powered Search</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {searchFilters.map(filter => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(filter.id)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <filter.icon className="h-4 w-4" />
              {filter.label}
              {filter.count !== undefined && (
                <Badge variant="secondary" className="ml-1">
                  {filter.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Search Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {searchResults.length > 0 && (
              <>
                <span>{searchResults.length} results found</span>
                {searchQuery && <span>for "{searchQuery}"</span>}
              </>
            )}
          </div>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-2"></div>
              <p className="text-muted-foreground">Searching...</p>
            </div>
          </div>
        ) : searchQuery.trim() === '' ? (
          <div className="text-center h-64 flex items-center justify-center">
            <div className="space-y-2">
              <Search className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-medium">Start typing to search</h3>
              <p className="text-muted-foreground">Search across clients, vendors, budgets, warranties, and more</p>
            </div>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center h-64 flex items-center justify-center">
            <div className="space-y-2">
              <X className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-medium">No results found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms or filters</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {searchResults.map((result) => {
                const filter = searchFilters.find(f => f.id === result.type);
                return (
                  <Card key={`${result.type}-${result.id}`} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={cn("p-2 rounded-lg", filter?.color || 'bg-gray-500')}>
                            {filter?.icon && <filter.icon className="h-4 w-4 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{result.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                            <p className="text-xs text-muted-foreground mt-1">{result.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {filter?.label}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {Math.round(result.relevance)}% match
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {filter?.actions.map(action => (
                            <Button
                              key={action.id}
                              variant="ghost"
                              size="sm"
                              onClick={() => action.onClick(result.metadata)}
                              className="h-8 w-8 p-0"
                            >
                              <action.icon className="h-4 w-4" />
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Item Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
            <DialogDescription>
              Detailed information for the selected item
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                {JSON.stringify(selectedItem, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}