import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Building,
  User,
  Calendar,
  MapPin
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CampaignProperty {
  id: string;
  campaign_id: string;
  roof_id: string;
  status: string;
  scheduled_date?: string;
  completed_date?: string;
  inspector_id?: string;
  error_message?: string;
  automation_data?: any;
  risk_assessment?: any;
  roofs?: {
    property_name: string;
    address: string;
    city: string;
    state: string;
    property_manager_name?: string;
    roof_area?: number;
  };
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
}

interface Campaign {
  id: string;
  name: string;
  client_id?: string;
  region?: string;
  market?: string;
  inspection_type: string;
  status: string;
  total_properties: number;
  completed_properties: number;
  failed_properties: number;
  progress_percentage: number;
  n8n_workflow_id?: string;
  estimated_completion?: string;
  actual_completion?: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  metadata?: any;
  automation_settings?: any;
  contact_preferences?: any;
  clients?: { company_name: string };
}

interface CampaignDetailModalProps {
  campaignId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignDetailModal({ campaignId, open, onOpenChange }: CampaignDetailModalProps) {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [properties, setProperties] = useState<CampaignProperty[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && campaignId) {
      fetchCampaignDetails();
      
      // Set up real-time subscription for this campaign
      const channel = supabase
        .channel(`campaign-${campaignId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inspection_campaigns',
            filter: `id=eq.${campaignId}`
          },
          (payload) => {
            if (payload.new) {
              setCampaign(prev => prev ? { ...prev, ...payload.new } : null);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'campaign_properties',
            filter: `campaign_id=eq.${campaignId}`
          },
          () => {
            fetchCampaignProperties();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, campaignId]);

  const fetchCampaignDetails = async () => {
    if (!campaignId) return;
    
    setLoading(true);
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from('inspection_campaigns')
        .select(`
          *,
          clients(company_name)
        `)
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      await fetchCampaignProperties();
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaign details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignProperties = async () => {
    if (!campaignId) return;

    try {
      const { data, error } = await supabase
        .from('campaign_properties')
        .select(`
          *,
          roofs(
            property_name,
            address,
            city,
            state,
            property_manager_name,
            roof_area
          )
        `)
        .eq('campaign_id', campaignId)
        .order('created_at');

      if (error) throw error;

      // Fetch inspector profiles separately if inspector_id exists
      const propertiesWithInspectors = await Promise.all(
        (data || []).map(async (property) => {
          if (property.inspector_id) {
            const { data: inspector } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('auth_user_id', property.inspector_id)
              .single();
            
            return { ...property, profiles: inspector };
          }
          return { ...property, profiles: null };
        })
      );

      setProperties(propertiesWithInspectors);
    } catch (error) {
      console.error('Error fetching campaign properties:', error);
    }
  };

  const exportCampaignReport = () => {
    if (!campaign || !properties.length) return;

    const headers = [
      'Property Name',
      'Address',
      'City',
      'State',
      'Status',
      'Inspector',
      'Scheduled Date',
      'Completed Date',
      'Property Manager',
      'Roof Area',
      'Error Message'
    ];

    const csvData = properties.map(property => [
      `"${property.roofs?.property_name || ''}"`,
      `"${property.roofs?.address || ''}"`,
      property.roofs?.city || '',
      property.roofs?.state || '',
      property.status,
      `"${property.profiles ? `${property.profiles.first_name} ${property.profiles.last_name}` : ''}"`,
      property.scheduled_date || '',
      property.completed_date || '',
      `"${property.roofs?.property_manager_name || ''}"`,
      property.roofs?.roof_area || '',
      `"${property.error_message || ''}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaign.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Campaign report exported successfully.`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'skipped':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!campaign) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{campaign.name}</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCampaignDetails}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCampaignReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {/* Campaign Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Campaign Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <Badge className={getStatusBadgeColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Progress</p>
                        <p className="text-lg font-semibold">{campaign.progress_percentage}%</p>
                      </div>
                    </div>
                    
                    <Progress value={campaign.progress_percentage} className="w-full" />
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">{campaign.completed_properties}</p>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{campaign.failed_properties}</p>
                        <p className="text-xs text-gray-600">Failed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-600">
                          {campaign.total_properties - campaign.completed_properties - campaign.failed_properties}
                        </p>
                        <p className="text-xs text-gray-600">Pending</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Campaign Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Campaign Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Client</p>
                        <p>{campaign.clients?.company_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium">Market</p>
                        <p>{campaign.market || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium">Region</p>
                        <p>{campaign.region || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium">Type</p>
                        <p>{campaign.inspection_type}</p>
                      </div>
                      <div>
                        <p className="font-medium">Created</p>
                        <p>{format(new Date(campaign.created_at), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                      <div>
                        <p className="font-medium">Est. Completion</p>
                        <p>
                          {campaign.estimated_completion 
                            ? format(new Date(campaign.estimated_completion), 'MMM dd, yyyy HH:mm')
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {campaign.n8n_workflow_id && (
                      <div>
                        <p className="font-medium text-sm">Workflow ID</p>
                        <p className="text-xs font-mono bg-gray-100 p-2 rounded">
                          {campaign.n8n_workflow_id}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="properties" className="flex-1 min-h-0">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">Properties ({properties.length})</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-3">
                      {properties.map((property) => (
                        <div key={property.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                {getStatusIcon(property.status)}
                                <h4 className="font-medium">
                                  {property.roofs?.property_name}
                                </h4>
                                <Badge className={getStatusBadgeColor(property.status)}>
                                  {property.status}
                                </Badge>
                              </div>
                              
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>
                                    {property.roofs?.address}, {property.roofs?.city}, {property.roofs?.state}
                                  </span>
                                </div>
                                
                                {property.roofs?.property_manager_name && (
                                  <div className="flex items-center space-x-1">
                                    <User className="h-3 w-3" />
                                    <span>PM: {property.roofs.property_manager_name}</span>
                                  </div>
                                )}
                                
                                {property.roofs?.roof_area && (
                                  <div className="flex items-center space-x-1">
                                    <Building className="h-3 w-3" />
                                    <span>{property.roofs.roof_area.toLocaleString()} sq ft</span>
                                  </div>
                                )}
                                
                                {property.profiles && (
                                  <div className="flex items-center space-x-1">
                                    <User className="h-3 w-3" />
                                    <span>
                                      Inspector: {property.profiles.first_name} {property.profiles.last_name}
                                    </span>
                                  </div>
                                )}
                                
                                {property.scheduled_date && (
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      Scheduled: {format(new Date(property.scheduled_date), 'MMM dd, yyyy')}
                                    </span>
                                  </div>
                                )}
                                
                                {property.completed_date && (
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle className="h-3 w-3" />
                                    <span>
                                      Completed: {format(new Date(property.completed_date), 'MMM dd, yyyy')}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {property.error_message && (
                                <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
                                  <p className="text-xs text-red-700">{property.error_message}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Automation Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Automation Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {campaign.automation_settings ? (
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                        {JSON.stringify(campaign.automation_settings, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-gray-500">No automation settings configured</p>
                    )}
                  </CardContent>
                </Card>

                {/* Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Campaign Metadata</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {campaign.metadata ? (
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                        {JSON.stringify(campaign.metadata, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-gray-500">No metadata available</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}