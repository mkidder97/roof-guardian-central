import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Building, ChevronDown, ChevronRight, Search, Users, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RegionalHierarchy {
  [region: string]: {
    [market: string]: any[];
  };
}

export function RegionalTab() {
  const [roofs, setRoofs] = useState<any[]>([]);
  const [regionalData, setRegionalData] = useState<RegionalHierarchy>({});
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoofsData();
  }, []);

  const fetchRoofsData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('roofs')
        .select('*')
        .eq('is_deleted', false)
        .order('region')
        .order('market')
        .order('property_name');

      if (error) throw error;

      setRoofs(data || []);
      processRegionalHierarchy(data || []);
    } catch (error) {
      console.error('Error fetching roofs:', error);
    } finally {
      setLoading(false);
    }
  };

  const processRegionalHierarchy = (roofsData: any[]) => {
    const hierarchy: RegionalHierarchy = {};
    
    roofsData.forEach(roof => {
      const region = roof.region || 'Unknown Region';
      const market = roof.market || 'Unknown Market';
      
      if (!hierarchy[region]) {
        hierarchy[region] = {};
      }
      if (!hierarchy[region][market]) {
        hierarchy[region][market] = [];
      }
      
      hierarchy[region][market].push(roof);
    });
    
    setRegionalData(hierarchy);
  };

  const toggleRegion = (region: string) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(region)) {
      newExpanded.delete(region);
    } else {
      newExpanded.add(region);
    }
    setExpandedRegions(newExpanded);
  };

  const getTotalBudget = (properties: any[]) => {
    return properties.reduce((sum, prop) => {
      const capital = prop.capital_budget_estimated || 0;
      const preventative = prop.preventative_budget_estimated || 0;
      return sum + capital + preventative;
    }, 0);
  };

  const getTotalSqFt = (properties: any[]) => {
    return properties.reduce((sum, prop) => sum + (prop.roof_area || 0), 0);
  };

  const getActiveWarranties = (properties: any[]) => {
    return properties.filter(prop => {
      const today = new Date();
      const mfgWarranty = prop.manufacturer_warranty_expiration;
      const installWarranty = prop.installer_warranty_expiration;
      
      return (mfgWarranty && new Date(mfgWarranty) > today) || 
             (installWarranty && new Date(installWarranty) > today);
    }).length;
  };

  const filteredRegions = Object.keys(regionalData).filter(region =>
    region.toLowerCase().includes(searchTerm.toLowerCase()) ||
    Object.keys(regionalData[region]).some(market =>
      market.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Loading regional data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Regional Management
          </h1>
          <p className="text-muted-foreground">Hierarchical view of properties by region and market</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roofs.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all regions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${getTotalBudget(roofs).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined estimated budgets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Area</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getTotalSqFt(roofs).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Square feet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Warranties</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getActiveWarranties(roofs)}
            </div>
            <p className="text-xs text-muted-foreground">
              Properties with coverage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search regions, markets, groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredRegions.length} regions
        </div>
      </div>

      {/* Hierarchical View */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-2">
            {filteredRegions.map(region => {
              const markets = regionalData[region];
              const regionProperties = Object.values(markets).flat();
              const regionTotal = regionProperties.length;
              const regionBudget = getTotalBudget(regionProperties);
              const regionSqFt = getTotalSqFt(regionProperties);
              const regionWarranties = getActiveWarranties(regionProperties);
              const isExpanded = expandedRegions.has(region);

              return (
                <div key={region} className="border-b last:border-b-0">
                  {/* Region Level */}
                  <div
                    className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleRegion(region)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{region}</div>
                        <div className="text-sm text-gray-500">
                          {Object.keys(markets).length} markets
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="font-medium">{regionTotal} properties</div>
                        <div className="text-gray-500">{regionSqFt.toLocaleString()} sq ft</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${regionBudget.toLocaleString()}</div>
                        <div className="text-gray-500">{regionWarranties} warranties</div>
                      </div>
                    </div>
                  </div>

                  {/* Market Level */}
                  {isExpanded && (
                    <div className="bg-gray-50">
                      {Object.entries(markets).map(([market, properties]) => {
                        const marketBudget = getTotalBudget(properties);
                        const marketSqFt = getTotalSqFt(properties);
                        const marketWarranties = getActiveWarranties(properties);

                        return (
                          <div key={market} className="border-t">
                            <div className="flex items-center justify-between p-4 pl-12">
                              <div className="flex items-center gap-3">
                                <Building className="h-4 w-4 text-green-600" />
                                <div>
                                  <div className="font-medium">{market}</div>
                                  <div className="text-sm text-gray-500">
                                    {properties.length} properties
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 text-sm">
                                <div className="text-right">
                                  <div className="font-medium">{properties.length} properties</div>
                                  <div className="text-gray-500">{marketSqFt.toLocaleString()} sq ft</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">${marketBudget.toLocaleString()}</div>
                                  <div className="text-gray-500">{marketWarranties} warranties</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}