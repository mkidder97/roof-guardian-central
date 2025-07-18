import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  PlayCircle, 
  PauseCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  created_at: string;
  completed_at?: string;
  created_by?: string;
  error_message?: string;
  clients?: { company_name: string };
}

interface CampaignTrackerProps {
  refreshInterval?: number;
  maxCampaigns?: number;
  showCompleted?: boolean;
}

export function CampaignTracker({ 
  refreshInterval = 30000, 
  maxCampaigns = 10,
  showCompleted = true 
}: CampaignTrackerProps) {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchCampaigns();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('campaign-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inspection_campaigns'
        },
        (payload) => {
          console.log('Campaign updated:', payload);
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe();

    // Set up polling as fallback
    const pollInterval = setInterval(fetchCampaigns, refreshInterval);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [refreshInterval]);

  const fetchCampaigns = async () => {
    try {
      let query = supabase
        .from('inspection_campaigns')
        .select(`
          *,
          clients(company_name)
        `)
        .order('created_at', { ascending: false })
        .limit(maxCampaigns);

      if (!showCompleted) {
        query = query.not('status', 'eq', 'completed');
      }

      const { data, error } = await query;

      if (error) throw error;
      setCampaigns(data || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRealtimeUpdate = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setCampaigns(prev => {
      switch (eventType) {
        case 'INSERT':
          return [newRecord, ...prev.slice(0, maxCampaigns - 1)];
        case 'UPDATE':
          return prev.map(campaign => 
            campaign.id === newRecord.id ? { ...campaign, ...newRecord } : campaign
          );
        case 'DELETE':
          return prev.filter(campaign => campaign.id !== oldRecord.id);
        default:
          return prev;
      }
    });
  };

  const cancelCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('inspection_campaigns')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Campaign Cancelled",
        description: "The campaign has been cancelled successfully.",
      });
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      toast({
        title: "Error",
        description: "Failed to cancel campaign",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'initiated':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <PlayCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'cancelled':
        return <PauseCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'initiated':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Active Campaigns</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading campaigns...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Active Campaigns</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              Last updated: {format(lastRefresh, 'HH:mm:ss')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCampaigns}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No active campaigns found
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  {/* Campaign Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(campaign.status)}>
                        {getStatusIcon(campaign.status)}
                        <span className="ml-1 capitalize">{campaign.status}</span>
                      </Badge>
                      {campaign.clients && (
                        <span className="text-sm text-gray-600">
                          {campaign.clients.company_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/dashboard?tab=campaigns&campaign=${campaign.id}`, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {campaign.status === 'processing' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelCampaign(campaign.id)}
                        >
                          <PauseCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Campaign Info */}
                  <div>
                    <h4 className="font-medium text-sm">{campaign.name}</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>
                        {campaign.market && `${campaign.market} • `}
                        {campaign.inspection_type} • {campaign.total_properties} properties
                      </div>
                      <div>
                        Started: {format(new Date(campaign.created_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                      {campaign.estimated_completion && (
                        <div>
                          Est. completion: {format(new Date(campaign.estimated_completion), 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  {campaign.status === 'processing' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{campaign.progress_percentage}%</span>
                      </div>
                      <Progress value={campaign.progress_percentage} className="w-full" />
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Completed: {campaign.completed_properties}</span>
                        <span>Failed: {campaign.failed_properties}</span>
                        <span>Pending: {campaign.total_properties - campaign.completed_properties - campaign.failed_properties}</span>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {campaign.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-700">{campaign.error_message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}