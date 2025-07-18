import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Clock, MapPin, User, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, addMonths, parseISO, isBefore, isAfter } from 'date-fns';

interface MaintenanceRecommendation {
  id: string;
  propertyId: string;
  propertyName: string;
  maintenanceType: string;
  priority: 'high' | 'medium' | 'low';
  recommendedDate: Date;
  estimatedCost: number;
  reason: string;
  seasonality: 'spring' | 'summer' | 'fall' | 'winter' | 'any';
  lastPerformed?: Date;
  riskScore: number;
}

interface MaintenanceTask {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  scheduledDate: Date;
  completedDate?: Date;
  assignedContractor?: string;
  estimatedCost: number;
  actualCost?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  maintenanceType: string;
}

export function MaintenanceScheduler() {
  const [recommendations, setRecommendations] = useState<MaintenanceRecommendation[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<MaintenanceRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    generateMaintenanceRecommendations();
    fetchScheduledTasks();
  }, []);

  const generateMaintenanceRecommendations = async () => {
    try {
      setLoading(true);
      const { data: roofs, error } = await supabase
        .from('roofs')
        .select('*')
        .eq('is_deleted', false);

      if (error) throw error;

      const recommendations: MaintenanceRecommendation[] = [];
      const currentDate = new Date();

      roofs?.forEach(roof => {
        // Generate recommendations based on property age and last inspection
        const installYear = roof.install_year || new Date().getFullYear() - 10;
        const propertyAge = currentDate.getFullYear() - installYear;
        const lastInspection = roof.last_inspection_date ? parseISO(roof.last_inspection_date) : null;
        
        // Roof inspection recommendations
        if (!lastInspection || addMonths(lastInspection, 12) < currentDate) {
          recommendations.push({
            id: `inspection-${roof.id}`,
            propertyId: roof.id,
            propertyName: roof.property_name,
            maintenanceType: 'Roof Inspection',
            priority: lastInspection ? 'medium' : 'high',
            recommendedDate: addDays(currentDate, lastInspection ? 30 : 7),
            estimatedCost: 500,
            reason: lastInspection ? 'Annual inspection due' : 'No recent inspection recorded',
            seasonality: 'spring',
            lastPerformed: lastInspection || undefined,
            riskScore: lastInspection ? 60 : 85
          });
        }

        // Preventative maintenance based on age
        if (propertyAge > 10) {
          recommendations.push({
            id: `preventative-${roof.id}`,
            propertyId: roof.id,
            propertyName: roof.property_name,
            maintenanceType: 'Preventative Maintenance',
            priority: propertyAge > 15 ? 'high' : 'medium',
            recommendedDate: addDays(currentDate, 60),
            estimatedCost: 1500,
            reason: `Property is ${propertyAge} years old - preventative care recommended`,
            seasonality: 'fall',
            riskScore: Math.min(95, propertyAge * 4)
          });
        }

        // Gutter cleaning (seasonal)
        const season = getSeason(currentDate);
        if (season === 'fall' || season === 'spring') {
          recommendations.push({
            id: `gutter-${roof.id}`,
            propertyId: roof.id,
            propertyName: roof.property_name,
            maintenanceType: 'Gutter Cleaning',
            priority: 'low',
            recommendedDate: addDays(currentDate, 14),
            estimatedCost: 200,
            reason: 'Seasonal gutter cleaning recommended',
            seasonality: season,
            riskScore: 30
          });
        }

        // Warranty expiration maintenance
        if (roof.manufacturer_warranty_expiration) {
          const warrantyExpiration = parseISO(roof.manufacturer_warranty_expiration);
          const daysUntilExpiration = Math.ceil((warrantyExpiration.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiration > 0 && daysUntilExpiration <= 90) {
            recommendations.push({
              id: `warranty-${roof.id}`,
              propertyId: roof.id,
              propertyName: roof.property_name,
              maintenanceType: 'Pre-Warranty Expiration Check',
              priority: 'high',
              recommendedDate: addDays(currentDate, 7),
              estimatedCost: 300,
              reason: `Warranty expires in ${daysUntilExpiration} days - final inspection recommended`,
              seasonality: 'any',
              riskScore: 75
            });
          }
        }
      });

      // Sort by priority and risk score
      recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.riskScore - a.riskScore;
      });

      setRecommendations(recommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to generate maintenance recommendations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledTasks = async () => {
    // This would fetch from a maintenance_tasks table in a real implementation
    // For now, we'll use mock data
    const mockTasks: MaintenanceTask[] = [
      {
        id: '1',
        propertyId: 'prop1',
        title: 'Roof Inspection - Central Office',
        description: 'Annual roof inspection and assessment',
        scheduledDate: addDays(new Date(), 3),
        estimatedCost: 500,
        status: 'scheduled',
        priority: 'high',
        maintenanceType: 'Inspection',
        assignedContractor: 'ABC Roofing'
      },
      {
        id: '2',
        propertyId: 'prop2',
        title: 'Gutter Cleaning - Warehouse A',
        description: 'Seasonal gutter cleaning and debris removal',
        scheduledDate: addDays(new Date(), 7),
        estimatedCost: 200,
        status: 'scheduled',
        priority: 'medium',
        maintenanceType: 'Preventative',
        assignedContractor: 'Gutter Pros'
      }
    ];
    
    setTasks(mockTasks);
  };

  const getSeason = (date: Date): 'spring' | 'summer' | 'fall' | 'winter' => {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 75) return 'text-red-600';
    if (riskScore >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const scheduleMaintenanceTask = async (recommendation: MaintenanceRecommendation, scheduledDate: Date, contractor?: string) => {
    // In a real implementation, this would create a work order and update the database
    toast({
      title: "Maintenance Scheduled",
      description: `${recommendation.maintenanceType} scheduled for ${format(scheduledDate, 'MMM dd, yyyy')}`,
    });
    setIsScheduleDialogOpen(false);
    setSelectedRecommendation(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Generating maintenance recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Intelligent Maintenance Scheduling</h2>
          <p className="text-muted-foreground">AI-driven maintenance recommendations and scheduling</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {recommendations.length} Recommendations
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Maintenance Recommendations */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Predictive Maintenance Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendations.slice(0, 6).map((rec) => (
                <div key={rec.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{rec.maintenanceType}</h4>
                      <Badge variant={getPriorityColor(rec.priority) as any}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{rec.propertyName}</p>
                    <p className="text-sm">{rec.reason}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(rec.recommendedDate, 'MMM dd')}
                      </span>
                      <span>${rec.estimatedCost}</span>
                      <span className={`flex items-center gap-1 ${getRiskColor(rec.riskScore)}`}>
                        <TrendingUp className="h-3 w-3" />
                        Risk: {rec.riskScore}%
                      </span>
                    </div>
                  </div>
                  <Dialog open={isScheduleDialogOpen && selectedRecommendation?.id === rec.id}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setSelectedRecommendation(rec);
                          setIsScheduleDialogOpen(true);
                        }}
                      >
                        Schedule
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Schedule Maintenance Task</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Property</Label>
                          <Input value={rec.propertyName} disabled />
                        </div>
                        <div>
                          <Label>Maintenance Type</Label>
                          <Input value={rec.maintenanceType} disabled />
                        </div>
                        <div>
                          <Label>Scheduled Date</Label>
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            className="rounded-md border"
                          />
                        </div>
                        <div>
                          <Label>Assigned Contractor</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select contractor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="abc-roofing">ABC Roofing</SelectItem>
                              <SelectItem value="roof-masters">Roof Masters</SelectItem>
                              <SelectItem value="commercial-maintenance">Commercial Maintenance Inc</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => scheduleMaintenanceTask(rec, selectedDate)}
                            className="flex-1"
                          >
                            Schedule Task
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setIsScheduleDialogOpen(false);
                              setSelectedRecommendation(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Scheduled Tasks & Calendar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium text-sm">{task.title}</h5>
                    <Badge variant={getPriorityColor(task.priority) as any}>
                      {task.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarIcon className="h-3 w-3" />
                    {format(task.scheduledDate, 'MMM dd')}
                  </div>
                  {task.assignedContractor && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3" />
                      {task.assignedContractor}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}