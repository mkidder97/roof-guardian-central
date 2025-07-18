import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Building, ChevronDown, ChevronRight, Search, Users, DollarSign, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RegionalHierarchy {
  [region: string]: {
    [market: string]: {
      [group: string]: any[];
    };
  };
}

export function RegionalTab() {
  const [roofs, setRoofs] = useState<any[]>([]);
  const [regionalData, setRegionalData] = useState<RegionalHierarchy>({});
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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
      const group = roof.roof_group || 'Ungrouped';
      
      if (!hierarchy[region]) {
        hierarchy[region] = {};
      }
      if (!hierarchy[region][market]) {
        hierarchy[region][market] = {};
      }
      if (!hierarchy[region][market][group]) {
        hierarchy[region][market][group] = [];
      }
      
      hierarchy[region][market][group].push(roof);
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

  const toggleMarket = (marketKey: string) => {
    const newExpanded = new Set(expandedMarkets);
    if (newExpanded.has(marketKey)) {
      newExpanded.delete(marketKey);
    } else {
      newExpanded.add(marketKey);
    }
    setExpandedMarkets(newExpanded);
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
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

  const getAllProperties = (data: RegionalHierarchy) => {
    const allProps: any[] = [];
    Object.values(data).forEach(markets => {
      Object.values(markets).forEach(groups => {
        Object.values(groups).forEach(properties => {
          allProps.push(...properties);
        });
      });
    });
    return allProps;
  };

  const filteredRegions = Object.keys(regionalData).filter(region =>
    region.toLowerCase().includes(searchTerm.toLowerCase()) ||
    Object.keys(regionalData[region]).some(market =>
      market.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.keys(regionalData[region][market]).some(group =>
        group.toLowerCase().includes(searchTerm.toLowerCase()) ||
        regionalData[region][market][group].some((prop: any) =>
          prop.property_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
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
            <div className="text-2xl font-bold">{getAllProperties(regionalData).length}</div>
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
              ${getTotalBudget(getAllProperties(regionalData)).toLocaleString()}
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
              {getTotalSqFt(getAllProperties(regionalData)).toLocaleString()}
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
              {getActiveWarranties(getAllProperties(regionalData))}
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
              const regionProperties = getAllProperties({ [region]: markets });
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
                      {Object.entries(markets).map(([market, groups]) => {
                        const marketProperties = Object.values(groups).flat();
                        const marketBudget = getTotalBudget(marketProperties);
                        const marketSqFt = getTotalSqFt(marketProperties);
                        const marketWarranties = getActiveWarranties(marketProperties);
                        const marketKey = `${region}-${market}`;
                        const isMarketExpanded = expandedMarkets.has(marketKey);

                        return (
                          <div key={market} className="border-t">
                            <div 
                              className="flex items-center justify-between p-4 pl-12 hover:bg-gray-100 cursor-pointer"
                              onClick={() => toggleMarket(marketKey)}
                            >
                              <div className="flex items-center gap-3">
                                {isMarketExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <Building className="h-4 w-4 text-green-600" />
                                <div>
                                  <div className="font-medium">{market}</div>
                                  <div className="text-sm text-gray-500">
                                    {Object.keys(groups).length} groups, {marketProperties.length} properties
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 text-sm">
                                <div className="text-right">
                                  <div className="font-medium">{marketProperties.length} properties</div>
                                  <div className="text-gray-500">{marketSqFt.toLocaleString()} sq ft</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">${marketBudget.toLocaleString()}</div>
                                  <div className="text-gray-500">{marketWarranties} warranties</div>
                                </div>
                              </div>
                            </div>

                            {/* Group Level */}
                            {isMarketExpanded && (
                              <div className="bg-gray-100">
                                {Object.entries(groups).map(([group, properties]) => {
                                  const groupBudget = getTotalBudget(properties);
                                  const groupSqFt = getTotalSqFt(properties);
                                  const groupWarranties = getActiveWarranties(properties);
                                  const groupKey = `${region}-${market}-${group}`;
                                  const isGroupExpanded = expandedGroups.has(groupKey);

                                  return (
                                    <div key={group} className="border-t border-gray-200">
                                      <div 
                                        className="flex items-center justify-between p-4 pl-20 hover:bg-gray-200 cursor-pointer"
                                        onClick={() => toggleGroup(groupKey)}
                                      >
                                        <div className="flex items-center gap-3">
                                          {isGroupExpanded ? (
                                            <ChevronDown className="h-3 w-3" />
                                          ) : (
                                            <ChevronRight className="h-3 w-3" />
                                          )}
                                          <Users className="h-3 w-3 text-purple-600" />
                                          <div>
                                            <div className="font-medium text-sm">{group}</div>
                                            <div className="text-xs text-gray-500">
                                              {properties.length} properties
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-6 text-xs">
                                          <div className="text-right">
                                            <div className="font-medium">{properties.length}</div>
                                            <div className="text-gray-500">{groupSqFt.toLocaleString()} sq ft</div>
                                          </div>
                                          <div className="text-right">
                                            <div className="font-medium">${groupBudget.toLocaleString()}</div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Individual Properties */}
                                      {isGroupExpanded && (
                                        <div className="bg-white border-t border-gray-200">
                                          <div className="px-6 py-2 bg-gray-50 border-b text-xs font-medium text-gray-600">
                                            <div className="grid grid-cols-4 gap-4">
                                              <div>Property</div>
                                              <div>Location</div>
                                              <div>Type</div>
                                              <div className="text-right">Budget</div>
                                            </div>
                                          </div>
                                          {properties.map((property: any, index: number) => (
                                            <div key={property.id} className="px-6 py-3 border-b border-gray-100 hover:bg-gray-50">
                                              <div className="grid grid-cols-4 gap-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                  <Home className="h-3 w-3 text-blue-500" />
                                                  <span className="font-medium">{property.property_name}</span>
                                                </div>
                                                <div className="text-gray-600">
                                                  {property.city}, {property.state}
                                                </div>
                                                <div className="text-gray-600">
                                                  {property.roof_type || 'N/A'}
                                                </div>
                                                <div className="text-right font-medium">
                                                  ${((property.capital_budget_estimated || 0) + (property.preventative_budget_estimated || 0)).toLocaleString()}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
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