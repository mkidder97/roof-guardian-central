import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map as MapIcon, Building, TrendingUp, DollarSign, Shield, ChevronRight, ChevronDown, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface RegionalData {
  regions: RegionSummary[];
  totalRoofs: number;
  totalBudget: number;
  totalWarranties: number;
}

interface RegionSummary {
  name: string;
  roofCount: number;
  totalBudget: number;
  avgBudget: number;
  activeWarranties: number;
  expiredWarranties: number;
  markets: MarketSummary[];
}

interface MarketSummary {
  name: string;
  roofCount: number;
  totalBudget: number;
  activeWarranties: number;
  expiredWarranties: number;
  roofGroups: RoofGroupSummary[];
}

interface RoofGroupSummary {
  name: string;
  roofCount: number;
  totalBudget: number;
  activeWarranties: number;
  roofs: RoofDetails[];
}

interface RoofDetails {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  roof_type: string | null;
  capital_budget_estimated: number | null;
  preventative_budget_estimated: number | null;
  manufacturer_warranty_expiration: string | null;
  installer_warranty_expiration: string | null;
}

export function RegionalTab() {
  const [regionalData, setRegionalData] = useState<RegionalData>({
    regions: [],
    totalRoofs: 0,
    totalBudget: 0,
    totalWarranties: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [mapboxToken, setMapboxToken] = useState("");
  const [showMapInput, setShowMapInput] = useState(true);

  useEffect(() => {
    fetchRegionalData();
  }, []);

  const fetchRegionalData = async () => {
    try {
      setLoading(true);
      
      const { data: roofs, error } = await supabase
        .from('roofs')
        .select('*')
        .eq('is_deleted', false)
        .order('region, market, roof_group, property_name');

      if (error) throw error;

      const processedData = processRegionalData(roofs || []);
      setRegionalData(processedData);
    } catch (error) {
      console.error('Error fetching regional data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processRegionalData = (roofs: any[]): RegionalData => {
    const today = new Date();
    
    // Group by region -> market -> roof_group
    const regionMap = new Map();

    roofs.forEach(roof => {
      const regionName = roof.region || 'Unknown Region';
      const marketName = roof.market || 'Unknown Market';
      const groupName = roof.roof_group || 'Unknown Group';

      // Initialize region
      if (!regionMap.has(regionName)) {
        regionMap.set(regionName, {
          name: regionName,
          markets: new Map(),
          roofCount: 0,
          totalBudget: 0,
          activeWarranties: 0,
          expiredWarranties: 0,
        });
      }

      const region = regionMap.get(regionName);

      // Initialize market
      if (!region.markets.has(marketName)) {
        region.markets.set(marketName, {
          name: marketName,
          groups: new Map(),
          roofCount: 0,
          totalBudget: 0,
          activeWarranties: 0,
          expiredWarranties: 0,
        });
      }

      const market = region.markets.get(marketName);

      // Initialize group
      if (!market.groups.has(groupName)) {
        market.groups.set(groupName, {
          name: groupName,
          roofs: [],
          roofCount: 0,
          totalBudget: 0,
          activeWarranties: 0,
        });
      }

      const group = market.groups.get(groupName);

      // Calculate budgets
      const capBudget = roof.capital_budget_estimated || 0;
      const prevBudget = roof.preventative_budget_estimated || 0;
      const totalBudget = capBudget + prevBudget;

      // Check warranty status
      const mfgExpired = roof.manufacturer_warranty_expiration && new Date(roof.manufacturer_warranty_expiration) < today;
      const instExpired = roof.installer_warranty_expiration && new Date(roof.installer_warranty_expiration) < today;
      const hasActiveWarranty = (roof.manufacturer_warranty_expiration && new Date(roof.manufacturer_warranty_expiration) > today) ||
                               (roof.installer_warranty_expiration && new Date(roof.installer_warranty_expiration) > today);

      // Add to group
      group.roofs.push({
        id: roof.id,
        property_name: roof.property_name,
        address: roof.address,
        city: roof.city,
        state: roof.state,
        roof_type: roof.roof_type,
        capital_budget_estimated: roof.capital_budget_estimated,
        preventative_budget_estimated: roof.preventative_budget_estimated,
        manufacturer_warranty_expiration: roof.manufacturer_warranty_expiration,
        installer_warranty_expiration: roof.installer_warranty_expiration,
      });

      // Update counts
      group.roofCount++;
      group.totalBudget += totalBudget;
      if (hasActiveWarranty) group.activeWarranties++;

      market.roofCount++;
      market.totalBudget += totalBudget;
      if (hasActiveWarranty) market.activeWarranties++;
      if (mfgExpired || instExpired) market.expiredWarranties++;

      region.roofCount++;
      region.totalBudget += totalBudget;
      if (hasActiveWarranty) region.activeWarranties++;
      if (mfgExpired || instExpired) region.expiredWarranties++;
    });

    // Convert to arrays
    const regions: RegionSummary[] = Array.from(regionMap.values()).map((region: any) => ({
      name: region.name,
      roofCount: region.roofCount,
      totalBudget: region.totalBudget,
      avgBudget: region.roofCount > 0 ? Math.round(region.totalBudget / region.roofCount) : 0,
      activeWarranties: region.activeWarranties,
      expiredWarranties: region.expiredWarranties,
      markets: Array.from(region.markets.values()).map((market: any) => ({
        name: market.name,
        roofCount: market.roofCount,
        totalBudget: market.totalBudget,
        activeWarranties: market.activeWarranties,
        expiredWarranties: market.expiredWarranties,
        roofGroups: Array.from(market.groups.values()).map((group: any) => ({
          name: group.name,
          roofCount: group.roofCount,
          totalBudget: group.totalBudget,
          activeWarranties: group.activeWarranties,
          roofs: group.roofs,
        })),
      })),
    }));

    const totalRoofs = roofs.length;
    const totalBudget = roofs.reduce((sum, roof) => {
      return sum + (roof.capital_budget_estimated || 0) + (roof.preventative_budget_estimated || 0);
    }, 0);
    const totalWarranties = roofs.filter(roof => {
      const hasActive = (roof.manufacturer_warranty_expiration && new Date(roof.manufacturer_warranty_expiration) > today) ||
                       (roof.installer_warranty_expiration && new Date(roof.installer_warranty_expiration) > today);
      return hasActive;
    }).length;

    return {
      regions,
      totalRoofs,
      totalBudget,
      totalWarranties,
    };
  };

  const toggleRegion = (regionName: string) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(regionName)) {
      newExpanded.delete(regionName);
    } else {
      newExpanded.add(regionName);
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

  const filteredRegions = regionalData.regions.filter(region => {
    if (selectedRegion !== "all" && region.name !== selectedRegion) return false;
    if (searchTerm && !region.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-semibold">Regional Management</h2>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{regionalData.totalRoofs}</div>
                <p className="text-sm text-gray-600">Total Properties</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">${(regionalData.totalBudget / 1000000).toFixed(1)}M</div>
                <p className="text-sm text-gray-600">Total Budget</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{regionalData.totalWarranties}</div>
                <p className="text-sm text-gray-600">Active Warranties</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="hierarchy" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hierarchy">Hierarchical View</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchy" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search regions, markets, groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regionalData.regions.map(region => (
                      <SelectItem key={region.name} value={region.name}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Hierarchical Data */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Hierarchy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredRegions.map((region) => (
                  <div key={region.name} className="border rounded-lg">
                    <Collapsible
                      open={expandedRegions.has(region.name)}
                      onOpenChange={() => toggleRegion(region.name)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                          <div className="flex items-center space-x-2">
                            {expandedRegions.has(region.name) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold">{region.name}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <Badge variant="outline">{region.roofCount} properties</Badge>
                            <Badge variant="outline">${(region.totalBudget / 1000000).toFixed(1)}M budget</Badge>
                            <Badge variant="outline">{region.activeWarranties} warranties</Badge>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 pb-4 space-y-2">
                          {region.markets.map((market) => {
                            const marketKey = `${region.name}-${market.name}`;
                            return (
                              <div key={marketKey} className="border rounded-lg">
                                <Collapsible
                                  open={expandedMarkets.has(marketKey)}
                                  onOpenChange={() => toggleMarket(marketKey)}
                                >
                                  <CollapsibleTrigger className="w-full">
                                    <div className="flex items-center justify-between p-3 hover:bg-gray-50">
                                      <div className="flex items-center space-x-2">
                                        {expandedMarkets.has(marketKey) ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                        <Building className="h-4 w-4 text-green-600" />
                                        <span className="font-medium">{market.name}</span>
                                      </div>
                                      <div className="flex items-center space-x-2 text-sm">
                                        <Badge variant="secondary">{market.roofCount} properties</Badge>
                                        <Badge variant="secondary">${(market.totalBudget / 1000).toFixed(0)}K</Badge>
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="pl-6 pb-3 space-y-2">
                                      {market.roofGroups.map((group) => {
                                        const groupKey = `${marketKey}-${group.name}`;
                                        return (
                                          <div key={groupKey} className="border rounded-lg">
                                            <Collapsible
                                              open={expandedGroups.has(groupKey)}
                                              onOpenChange={() => toggleGroup(groupKey)}
                                            >
                                              <CollapsibleTrigger className="w-full">
                                                <div className="flex items-center justify-between p-3 hover:bg-gray-50">
                                                  <div className="flex items-center space-x-2">
                                                    {expandedGroups.has(groupKey) ? (
                                                      <ChevronDown className="h-3 w-3" />
                                                    ) : (
                                                      <ChevronRight className="h-3 w-3" />
                                                    )}
                                                    <span className="text-sm font-medium">{group.name}</span>
                                                  </div>
                                                  <div className="flex items-center space-x-2 text-xs">
                                                    <Badge variant="outline">{group.roofCount}</Badge>
                                                    <Badge variant="outline">${(group.totalBudget / 1000).toFixed(0)}K</Badge>
                                                  </div>
                                                </div>
                                              </CollapsibleTrigger>
                                              <CollapsibleContent>
                                                <div className="pl-6 pb-2">
                                                  <Table>
                                                    <TableHeader>
                                                      <TableRow>
                                                        <TableHead>Property</TableHead>
                                                        <TableHead>Location</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Budget</TableHead>
                                                      </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                      {group.roofs.map((roof) => (
                                                        <TableRow key={roof.id}>
                                                          <TableCell className="font-medium">
                                                            {roof.property_name}
                                                          </TableCell>
                                                          <TableCell>
                                                            {roof.city}, {roof.state}
                                                          </TableCell>
                                                          <TableCell>
                                                            {roof.roof_type || 'N/A'}
                                                          </TableCell>
                                                          <TableCell>
                                                            ${((roof.capital_budget_estimated || 0) + (roof.preventative_budget_estimated || 0)).toLocaleString()}
                                                          </TableCell>
                                                        </TableRow>
                                                      ))}
                                                    </TableBody>
                                                  </Table>
                                                </div>
                                              </CollapsibleContent>
                                            </Collapsible>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          {showMapInput ? (
            <Card>
              <CardHeader>
                <CardTitle>Map Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    To display an interactive map of your properties, please enter your Mapbox public token.
                    You can get one for free at{" "}
                    <a 
                      href="https://mapbox.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      mapbox.com
                    </a>
                  </p>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter your Mapbox public token..."
                      value={mapboxToken}
                      onChange={(e) => setMapboxToken(e.target.value)}
                      type="password"
                    />
                    <Button 
                      onClick={() => setShowMapInput(false)}
                      disabled={!mapboxToken.trim()}
                    >
                      Load Map
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Properties Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Interactive map would be displayed here</p>
                    <p className="text-sm text-gray-500">Showing {regionalData.totalRoofs} properties across all regions</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setShowMapInput(true)}
                    >
                      Configure Map
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}