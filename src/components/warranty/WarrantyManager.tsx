import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertTriangle, Clock, TrendingUp, FileText, DollarSign, Calendar, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';

interface WarrantyAlert {
  id: string;
  propertyId: string;
  propertyName: string;
  warrantyType: 'manufacturer' | 'installer';
  expirationDate: Date;
  daysRemaining: number;
  warrantyNumber?: string;
  manufacturer?: string;
  installer?: string;
  renewalRecommended: boolean;
  estimatedRenewalCost: number;
  riskScore: number;
}

interface WarrantyClaim {
  id: string;
  propertyId: string;
  propertyName: string;
  claimNumber: string;
  warrantyType: 'manufacturer' | 'installer';
  issueType: string;
  submitDate: Date;
  status: 'submitted' | 'under_review' | 'approved' | 'denied' | 'completed';
  claimAmount: number;
  approvedAmount?: number;
  completionDate?: Date;
  manufacturer?: string;
  notes: string;
}

interface ManufacturerPerformance {
  manufacturer: string;
  totalWarranties: number;
  totalClaims: number;
  claimApprovalRate: number;
  avgClaimTime: number; // days
  totalClaimValue: number;
  approvedClaimValue: number;
  performanceScore: number;
}

export function WarrantyManager() {
  const [warrantyAlerts, setWarrantyAlerts] = useState<WarrantyAlert[]>([]);
  const [warrantyClaims, setWarrantyClaims] = useState<WarrantyClaim[]>([]);
  const [manufacturerPerformance, setManufacturerPerformance] = useState<ManufacturerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewClaimDialogOpen, setIsNewClaimDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWarrantyData();
  }, []);

  const fetchWarrantyData = async () => {
    try {
      setLoading(true);
      
      const { data: roofs, error } = await supabase
        .from('roofs')
        .select('*')
        .eq('is_deleted', false);

      if (error) throw error;

      // Generate warranty alerts
      const alerts: WarrantyAlert[] = [];
      const currentDate = new Date();

      roofs?.forEach(roof => {
        // Manufacturer warranty alerts
        if (roof.manufacturer_warranty_expiration) {
          const expirationDate = parseISO(roof.manufacturer_warranty_expiration);
          const daysRemaining = differenceInDays(expirationDate, currentDate);
          
          if (daysRemaining <= 90 && daysRemaining >= 0) {
            alerts.push({
              id: `mfg-${roof.id}`,
              propertyId: roof.id,
              propertyName: roof.property_name,
              warrantyType: 'manufacturer',
              expirationDate,
              daysRemaining,
              warrantyNumber: roof.manufacturer_warranty_number,
              manufacturer: roof.manufacturer,
              renewalRecommended: daysRemaining <= 30,
              estimatedRenewalCost: 2500,
              riskScore: Math.max(0, 100 - daysRemaining)
            });
          }
        }

        // Installer warranty alerts
        if (roof.installer_warranty_expiration) {
          const expirationDate = parseISO(roof.installer_warranty_expiration);
          const daysRemaining = differenceInDays(expirationDate, currentDate);
          
          if (daysRemaining <= 90 && daysRemaining >= 0) {
            alerts.push({
              id: `inst-${roof.id}`,
              propertyId: roof.id,
              propertyName: roof.property_name,
              warrantyType: 'installer',
              expirationDate,
              daysRemaining,
              warrantyNumber: roof.installer_warranty_number,
              installer: roof.installing_contractor,
              renewalRecommended: daysRemaining <= 30,
              estimatedRenewalCost: 1500,
              riskScore: Math.max(0, 100 - daysRemaining)
            });
          }
        }
      });

      // Sort alerts by urgency
      alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
      setWarrantyAlerts(alerts);

      // Generate mock warranty claims and manufacturer performance data
      generateMockClaimsData();
      generateManufacturerPerformance(roofs || []);
      
    } catch (error) {
      console.error('Error fetching warranty data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch warranty data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMockClaimsData = () => {
    const mockClaims: WarrantyClaim[] = [
      {
        id: '1',
        propertyId: 'prop1',
        propertyName: 'Central Distribution Center',
        claimNumber: 'WC-2024-001',
        warrantyType: 'manufacturer',
        issueType: 'Membrane Defect',
        submitDate: new Date('2024-01-15'),
        status: 'approved',
        claimAmount: 15000,
        approvedAmount: 12000,
        completionDate: new Date('2024-02-20'),
        manufacturer: 'GAF',
        notes: 'Membrane delamination in section 3'
      },
      {
        id: '2',
        propertyId: 'prop2',
        propertyName: 'Warehouse Complex A',
        claimNumber: 'WC-2024-002',
        warrantyType: 'installer',
        issueType: 'Installation Defect',
        submitDate: new Date('2024-02-01'),
        status: 'under_review',
        claimAmount: 8000,
        manufacturer: 'Firestone',
        notes: 'Improper seaming causing leaks'
      }
    ];
    
    setWarrantyClaims(mockClaims);
  };

  const generateManufacturerPerformance = (roofs: any[]) => {
    const manufacturerStats = new Map<string, any>();
    
    roofs.forEach(roof => {
      if (roof.manufacturer) {
        if (!manufacturerStats.has(roof.manufacturer)) {
          manufacturerStats.set(roof.manufacturer, {
            manufacturer: roof.manufacturer,
            totalWarranties: 0,
            totalClaims: 0,
            approvedClaims: 0,
            totalClaimValue: 0,
            approvedClaimValue: 0,
            claimTimes: []
          });
        }
        
        const stats = manufacturerStats.get(roof.manufacturer);
        stats.totalWarranties++;
      }
    });

    // Add mock claim data to calculate performance metrics
    const mockClaimData = [
      { manufacturer: 'GAF', claims: 5, approved: 4, totalValue: 45000, approvedValue: 38000, avgTime: 28 },
      { manufacturer: 'Firestone', claims: 3, approved: 2, totalValue: 25000, approvedValue: 18000, avgTime: 35 },
      { manufacturer: 'Carlisle', claims: 2, approved: 2, totalValue: 15000, approvedValue: 15000, avgTime: 21 }
    ];

    const performance: ManufacturerPerformance[] = [];
    
    manufacturerStats.forEach((stats, manufacturer) => {
      const claimData = mockClaimData.find(m => m.manufacturer === manufacturer);
      if (claimData) {
        const claimApprovalRate = (claimData.approved / claimData.claims) * 100;
        const payoutRate = (claimData.approvedValue / claimData.totalValue) * 100;
        const timeScore = Math.max(0, 100 - claimData.avgTime);
        const performanceScore = (claimApprovalRate * 0.4) + (payoutRate * 0.3) + (timeScore * 0.3);
        
        performance.push({
          manufacturer,
          totalWarranties: stats.totalWarranties,
          totalClaims: claimData.claims,
          claimApprovalRate,
          avgClaimTime: claimData.avgTime,
          totalClaimValue: claimData.totalValue,
          approvedClaimValue: claimData.approvedValue,
          performanceScore: Math.round(performanceScore)
        });
      }
    });

    performance.sort((a, b) => b.performanceScore - a.performanceScore);
    setManufacturerPerformance(performance);
  };

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining <= 7) return 'destructive';
    if (daysRemaining <= 30) return 'default';
    return 'secondary';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': case 'completed': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Loading warranty data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Warranty Management</h2>
          <p className="text-muted-foreground">Proactive warranty optimization and claims management</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {warrantyAlerts.length} Expiring Soon
          </Badge>
          <Dialog open={isNewClaimDialogOpen} onOpenChange={setIsNewClaimDialogOpen}>
            <DialogTrigger asChild>
              <Button>Submit Claim</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Warranty Claim</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Property</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prop1">Central Distribution Center</SelectItem>
                      <SelectItem value="prop2">Warehouse Complex A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Warranty Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warranty type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      <SelectItem value="installer">Installer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Issue Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material-defect">Material Defect</SelectItem>
                      <SelectItem value="installation-defect">Installation Defect</SelectItem>
                      <SelectItem value="premature-failure">Premature Failure</SelectItem>
                      <SelectItem value="weather-damage">Weather Damage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estimated Claim Amount</Label>
                  <Input type="number" placeholder="Enter amount" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the issue and damage..." />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1">Submit Claim</Button>
                  <Button variant="outline" onClick={() => setIsNewClaimDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts">Warranty Alerts</TabsTrigger>
          <TabsTrigger value="claims">Claims Tracking</TabsTrigger>
          <TabsTrigger value="performance">Manufacturer Performance</TabsTrigger>
          <TabsTrigger value="analytics">Warranty Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warrantyAlerts.map((alert) => (
              <Card key={alert.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      {alert.warrantyType === 'manufacturer' ? 'Manufacturer' : 'Installer'}
                    </CardTitle>
                    <Badge variant={getUrgencyColor(alert.daysRemaining) as any}>
                      {alert.daysRemaining} days
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-medium">{alert.propertyName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {alert.manufacturer || alert.installer}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Expiration Date</span>
                      <span>{format(alert.expirationDate, 'MMM dd, yyyy')}</span>
                    </div>
                    {alert.warrantyNumber && (
                      <div className="flex justify-between text-sm">
                        <span>Warranty #</span>
                        <span className="font-mono text-xs">{alert.warrantyNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Risk Score</span>
                      <span className={getPerformanceColor(100 - alert.riskScore)}>
                        {alert.riskScore}%
                      </span>
                    </div>
                  </div>

                  {alert.renewalRecommended && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Renewal Recommended</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Est. renewal cost: ${alert.estimatedRenewalCost.toLocaleString()}
                      </p>
                      <Button size="sm" className="w-full mt-2">
                        Initiate Renewal
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <div className="space-y-4">
            {warrantyClaims.map((claim) => (
              <Card key={claim.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5" />
                      <div>
                        <h4 className="font-medium">{claim.claimNumber}</h4>
                        <p className="text-sm text-muted-foreground">{claim.propertyName}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(claim.status)}>
                      {claim.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Issue Type</span>
                      <p className="font-medium">{claim.issueType}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Submit Date</span>
                      <p className="font-medium">{format(claim.submitDate, 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Claim Amount</span>
                      <p className="font-medium">${claim.claimAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Manufacturer</span>
                      <p className="font-medium">{claim.manufacturer}</p>
                    </div>
                  </div>
                  
                  {claim.approvedAmount && (
                    <div className="flex items-center gap-4 mb-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Approved Amount</span>
                        <p className="font-medium text-green-600">${claim.approvedAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Approval Rate</span>
                        <p className="font-medium">
                          {Math.round((claim.approvedAmount / claim.claimAmount) * 100)}%
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm">{claim.notes}</p>
                  
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline">View Details</Button>
                    {claim.status === 'under_review' && (
                      <Button size="sm" variant="outline">Follow Up</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="space-y-4">
            {manufacturerPerformance.map((perf) => (
              <Card key={perf.manufacturer}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Star className="h-5 w-5" />
                      <div>
                        <h4 className="font-medium">{perf.manufacturer}</h4>
                        <p className="text-sm text-muted-foreground">
                          {perf.totalWarranties} warranties, {perf.totalClaims} claims
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getPerformanceColor(perf.performanceScore)}`}>
                        {perf.performanceScore}
                      </div>
                      <p className="text-sm text-muted-foreground">Performance Score</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Approval Rate</span>
                      <p className="font-medium">{perf.claimApprovalRate.toFixed(1)}%</p>
                      <Progress value={perf.claimApprovalRate} className="mt-1" />
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Avg. Claim Time</span>
                      <p className="font-medium">{perf.avgClaimTime} days</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Total Claim Value</span>
                      <p className="font-medium">${perf.totalClaimValue.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Approved Value</span>
                      <p className="font-medium text-green-600">
                        ${perf.approvedClaimValue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Warranty ROI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">342%</div>
                <p className="text-sm text-muted-foreground">
                  Claims recovered vs warranty costs
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Avg. Claim Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28 days</div>
                <p className="text-sm text-muted-foreground">
                  Average claim processing time
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87%</div>
                <p className="text-sm text-muted-foreground">
                  Claims approval rate
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}