import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  MapPin, 
  Users, 
  AlertTriangle, 
  Calendar,
  Settings,
  Route,
  BarChart3,
  Shuffle,
  Save,
  Eye
} from "lucide-react";
import { IntelligentGroupingService, Property, PropertyGroup, GroupingConfiguration } from "@/lib/intelligentGrouping";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface IntelligentGroupingProps {
  properties: Property[];
  selectedProperties: Property[];
  onGroupsGenerated: (groups: PropertyGroup[]) => void;
  onPropertiesSelected: (properties: Property[]) => void;
}

export function IntelligentGrouping({ 
  properties, 
  selectedProperties,
  onGroupsGenerated,
  onPropertiesSelected
}: IntelligentGroupingProps) {
  const { toast } = useToast();
  const [groupingType, setGroupingType] = useState<'geographic' | 'property_manager' | 'risk_based' | 'seasonal'>('geographic');
  const [generatedGroups, setGeneratedGroups] = useState<PropertyGroup[]>([]);
  const [configurations, setConfigurations] = useState<GroupingConfiguration[]>([]);
  const [currentConfig, setCurrentConfig] = useState<Partial<GroupingConfiguration>>({
    name: 'Default Configuration',
    rules: {
      max_group_size: 8,
      max_distance_miles: 25,
      prefer_same_pm: true,
      avoid_weather_conditions: ['snow', 'ice', 'extreme_heat'],
      priority_by_risk: false,
      seasonal_restrictions: {
        avoid_months: [12, 1, 2],
        preferred_months: [4, 5, 9, 10, 11]
      }
    },
    is_active: true,
    priority: 1
  });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'groups' | 'map' | 'analytics'>('groups');
  const [selectedGroup, setSelectedGroup] = useState<PropertyGroup | null>(null);

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('grouping_configurations')
        .select('*')
        .eq('is_active', true)
        .order('priority');

      if (error) throw error;
      setConfigurations((data || []) as GroupingConfiguration[]);
    } catch (error) {
      console.error('Error fetching grouping configurations:', error);
    }
  };

  const generateGroups = async () => {
    if (selectedProperties.length === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select properties to group.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let groups: PropertyGroup[] = [];

      switch (groupingType) {
        case 'geographic':
          groups = await IntelligentGroupingService.groupByGeographicProximity(
            selectedProperties,
            {
              maxGroupSize: currentConfig.rules?.max_group_size || 8,
              maxDistance: currentConfig.rules?.max_distance_miles || 25
            }
          );
          break;
        case 'property_manager':
          groups = await IntelligentGroupingService.groupByPropertyManager(selectedProperties);
          break;
        case 'risk_based':
          groups = await IntelligentGroupingService.groupByRisk(selectedProperties);
          break;
        default:
          groups = await IntelligentGroupingService.groupByGeographicProximity(
            selectedProperties,
            {
              maxGroupSize: currentConfig.rules?.max_group_size || 8,
              maxDistance: currentConfig.rules?.max_distance_miles || 25
            }
          );
      }

      setGeneratedGroups(groups);
      onGroupsGenerated(groups);

      toast({
        title: "Groups Generated",
        description: `Created ${groups.length} intelligent property groups.`,
      });
    } catch (error) {
      console.error('Error generating groups:', error);
      toast({
        title: "Error",
        description: "Failed to generate property groups.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!currentConfig.name) {
      toast({
        title: "Configuration Name Required",
        description: "Please enter a configuration name.",
        variant: "destructive",
      });
      return;
    }

    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from('grouping_configurations')
        .insert({
          name: currentConfig.name,
          client_id: currentConfig.client_id,
          rules: currentConfig.rules as any,
          is_active: currentConfig.is_active ?? true,
          priority: currentConfig.priority ?? 1,
          created_by: user.data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Configuration Saved",
        description: "Grouping configuration saved successfully.",
      });

      fetchConfigurations();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration.",
        variant: "destructive",
      });
    }
  };

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case 'geographic': return <MapPin className="h-4 w-4" />;
      case 'property_manager': return <Users className="h-4 w-4" />;
      case 'risk_based': return <AlertTriangle className="h-4 w-4" />;
      case 'seasonal': return <Calendar className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getGroupTypeColor = (type: string) => {
    switch (type) {
      case 'geographic': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'property_manager': return 'bg-green-100 text-green-800 border-green-200';
      case 'risk_based': return 'bg-red-100 text-red-800 border-red-200';
      case 'seasonal': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const selectGroupProperties = (group: PropertyGroup) => {
    onPropertiesSelected(group.properties);
    setSelectedGroup(group);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Intelligent Grouping Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grouping-type">Grouping Strategy</Label>
                  <Select value={groupingType} onValueChange={(value: any) => setGroupingType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grouping type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geographic">Geographic Proximity</SelectItem>
                      <SelectItem value="property_manager">Property Manager</SelectItem>
                      <SelectItem value="risk_based">Risk Assessment</SelectItem>
                      <SelectItem value="seasonal">Seasonal Optimization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="config-name">Configuration Name</Label>
                  <Input
                    id="config-name"
                    value={currentConfig.name || ''}
                    onChange={(e) => setCurrentConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter configuration name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Group Size: {currentConfig.rules?.max_group_size || 8}</Label>
                  <Slider
                    value={[currentConfig.rules?.max_group_size || 8]}
                    onValueChange={(value) => setCurrentConfig(prev => ({
                      ...prev,
                      rules: { ...prev.rules, max_group_size: value[0] }
                    }))}
                    max={20}
                    min={2}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Distance (miles): {currentConfig.rules?.max_distance_miles || 25}</Label>
                  <Slider
                    value={[currentConfig.rules?.max_distance_miles || 25]}
                    onValueChange={(value) => setCurrentConfig(prev => ({
                      ...prev,
                      rules: { ...prev.rules, max_distance_miles: value[0] }
                    }))}
                    max={100}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="prefer-same-pm"
                  checked={currentConfig.rules?.prefer_same_pm || false}
                  onCheckedChange={(checked) => setCurrentConfig(prev => ({
                    ...prev,
                    rules: { ...prev.rules, prefer_same_pm: checked }
                  }))}
                />
                <Label htmlFor="prefer-same-pm">Prefer Same Property Manager</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="priority-by-risk"
                  checked={currentConfig.rules?.priority_by_risk || false}
                  onCheckedChange={(checked) => setCurrentConfig(prev => ({
                    ...prev,
                    rules: { ...prev.rules, priority_by_risk: checked }
                  }))}
                />
                <Label htmlFor="priority-by-risk">Prioritize by Risk Assessment</Label>
              </div>
            </TabsContent>

            <TabsContent value="seasonal" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Seasonal Scheduling Preferences</Label>
                  <p className="text-sm text-muted-foreground">Configure optimal months for inspections</p>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                    const monthNum = index + 1;
                    const isPreferred = currentConfig.rules?.seasonal_restrictions?.preferred_months?.includes(monthNum);
                    const isAvoided = currentConfig.rules?.seasonal_restrictions?.avoid_months?.includes(monthNum);
                    
                    return (
                      <div key={month} className="text-center">
                        <div className="text-xs font-medium mb-1">{month}</div>
                        <div 
                          className={`w-full h-8 rounded cursor-pointer border-2 transition-colors ${
                            isPreferred ? 'bg-green-100 border-green-500' :
                            isAvoided ? 'bg-red-100 border-red-500' :
                            'bg-gray-100 border-gray-300 hover:border-gray-400'
                          }`}
                          onClick={() => {
                            const current = currentConfig.rules?.seasonal_restrictions || {};
                            const preferred = current.preferred_months || [];
                            const avoided = current.avoid_months || [];
                            
                            let newPreferred = [...preferred];
                            let newAvoided = [...avoided];
                            
                            if (isPreferred) {
                              newPreferred = preferred.filter(m => m !== monthNum);
                            } else if (isAvoided) {
                              newAvoided = avoided.filter(m => m !== monthNum);
                              newPreferred = [...preferred, monthNum];
                            } else {
                              newAvoided = [...avoided, monthNum];
                            }
                            
                            setCurrentConfig(prev => ({
                              ...prev,
                              rules: {
                                ...prev.rules,
                                seasonal_restrictions: {
                                  preferred_months: newPreferred,
                                  avoid_months: newAvoided
                                }
                              }
                            }));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-100 border border-green-500 rounded"></div>
                    <span>Preferred</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-100 border border-red-500 rounded"></div>
                    <span>Avoid</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                    <span>Neutral</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Advanced Configuration</Label>
                  <p className="text-sm text-muted-foreground">Fine-tune grouping algorithms</p>
                </div>

                <div className="space-y-2">
                  <Label>Weather Conditions to Avoid</Label>
                  <div className="flex flex-wrap gap-2">
                    {['snow', 'ice', 'extreme_heat', 'heavy_rain', 'high_winds'].map(condition => (
                      <Badge
                        key={condition}
                        variant={currentConfig.rules?.avoid_weather_conditions?.includes(condition) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          const current = currentConfig.rules?.avoid_weather_conditions || [];
                          const updated = current.includes(condition)
                            ? current.filter(c => c !== condition)
                            : [...current, condition];
                          
                          setCurrentConfig(prev => ({
                            ...prev,
                            rules: { ...prev.rules, avoid_weather_conditions: updated }
                          }));
                        }}
                      >
                        {condition.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex space-x-2 mt-4">
            <Button onClick={generateGroups} disabled={loading}>
              <Shuffle className="h-4 w-4 mr-2" />
              {loading ? 'Generating...' : 'Generate Groups'}
            </Button>
            <Button variant="outline" onClick={saveConfiguration}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Groups Display */}
      {generatedGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Generated Property Groups ({generatedGroups.length})</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={viewMode === 'groups' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('groups')}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Groups
                </Button>
                <Button
                  variant={viewMode === 'analytics' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('analytics')}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Analytics
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewMode === 'groups' && (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {generatedGroups.map((group, index) => (
                    <div 
                      key={group.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedGroup?.id === group.id ? 'border-primary bg-primary/5' : 'hover:border-gray-300'
                      }`}
                      onClick={() => selectGroupProperties(group)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getGroupTypeIcon(group.group_type)}
                          <h4 className="font-medium">{group.name}</h4>
                          <Badge className={getGroupTypeColor(group.group_type)}>
                            {group.group_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <Badge variant="outline">
                          {group.properties.length} properties
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Total Area:</span><br />
                          {group.metadata.total_area?.toLocaleString() || 0} sq ft
                        </div>
                        {group.metadata.average_distance && (
                          <div>
                            <span className="font-medium">Avg Distance:</span><br />
                            {group.metadata.average_distance.toFixed(1)} miles
                          </div>
                        )}
                        {group.metadata.property_manager && (
                          <div>
                            <span className="font-medium">Property Manager:</span><br />
                            {group.metadata.property_manager}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Optimization:</span><br />
                          {group.metadata.optimization_score?.toFixed(0) || 0}%
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {group.properties.slice(0, 3).map(property => (
                            <Badge key={property.id} variant="secondary" className="text-xs">
                              {property.property_name}
                            </Badge>
                          ))}
                          {group.properties.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{group.properties.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {viewMode === 'analytics' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {generatedGroups.reduce((sum, g) => sum + g.properties.length, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Properties</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {(generatedGroups.reduce((sum, g) => sum + (g.metadata.optimization_score || 0), 0) / generatedGroups.length).toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Optimization</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {(generatedGroups.reduce((sum, g) => sum + g.properties.length, 0) / generatedGroups.length).toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Group Size</div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Group Distribution</h4>
                  <div className="space-y-2">
                    {generatedGroups.map((group, index) => (
                      <div key={group.id} className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(${index * 137.5 % 360}, 70%, 50%)` }}></div>
                        <span className="flex-1">{group.name}</span>
                        <span className="text-sm text-muted-foreground">{group.properties.length} properties</span>
                        <Badge variant="outline">{group.metadata.optimization_score?.toFixed(0) || 0}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}