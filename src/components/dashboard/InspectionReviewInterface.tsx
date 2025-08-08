import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  MapPin, 
  User, 
  AlertTriangle,
  DollarSign,
  Image as ImageIcon,
  FileText,
  Clock,
  CheckCircle,
  Save,
  X,
  Plus,
  Trash2,
  Upload,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { InspectionSyncData, InspectionStatus } from '@/types/inspection';
import type { Deficiency, CapitalExpense } from '@/types/deficiency';

interface InspectionReviewInterfaceProps {
  inspection: InspectionSyncData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (updatedInspection: InspectionSyncData) => void;
}

export function InspectionReviewInterface({ 
  inspection, 
  open, 
  onOpenChange, 
  onSave 
}: InspectionReviewInterfaceProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [editedInspection, setEditedInspection] = useState<InspectionSyncData | null>(null);
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([]);
  const [capitalExpenses, setCapitalExpenses] = useState<CapitalExpense[]>([]);
  const [overviewPhotos, setOverviewPhotos] = useState<any[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [weatherConditions, setWeatherConditions] = useState('');

  useEffect(() => {
    if (inspection) {
      setEditedInspection({ ...inspection });
      
      // Load complete inspection data from both session_data and direct database relationships
      const sessionData = inspection.session_data || {};
      
      // Load deficiencies from database relationships or session data
      const dbDeficiencies = (inspection as any).inspection_deficiencies || [];
      const sessionDeficiencies = sessionData.deficiencies || [];
      setDeficiencies(dbDeficiencies.length > 0 ? dbDeficiencies.map((d: any) => ({
        id: d.id,
        type: d.deficiency_type,
        category: d.deficiency_type,
        location: d.location_description || '',
        description: d.description || '',
        severity: d.severity || 'medium',
        estimatedBudget: d.estimated_cost || 0,
        budgetAmount: d.estimated_cost || 0,
        status: 'identified',
        photos: []
      })) : sessionDeficiencies);
      
      // Load capital expenses from database relationships or session data
      const dbCapitalExpenses = (inspection as any).inspection_capital_expenses || [];
      const sessionCapitalExpenses = sessionData.capitalExpenses || [];
      setCapitalExpenses(dbCapitalExpenses.length > 0 ? dbCapitalExpenses.map((e: any) => ({
        id: e.id,
        type: e.expense_type,
        description: e.description || '',
        estimatedBudget: e.estimated_cost || 0,
        timeline: e.recommended_timeline || '',
        priority: e.priority || 'medium'
      })) : sessionCapitalExpenses);
      
      // Load photos from database relationships or session data
      const dbPhotos = (inspection as any).inspection_photos || [];
      const sessionPhotos = sessionData.overviewPhotos || [];
      setOverviewPhotos(dbPhotos.length > 0 ? dbPhotos.map((p: any) => ({
        id: p.id,
        url: p.file_url,
        type: p.photo_type,
        caption: p.caption || '',
        timestamp: p.metadata?.timestamp || new Date().toISOString()
      })) : sessionPhotos);
      
      // Load notes and conditions
      setInspectionNotes(sessionData.inspectionNotes || inspection.notes || '');
      setWeatherConditions(sessionData.weatherConditions || inspection.weather_conditions || '');
    }
  }, [inspection]);

  if (!inspection || !editedInspection) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'ready_for_review': return 'bg-purple-100 text-purple-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApproveAndComplete = async () => {
    try {
      setSaving(true);
      
      const updatedSessionData = {
        ...editedInspection.session_data,
        deficiencies,
        capitalExpenses,
        overviewPhotos,
        inspectionNotes,
        weatherConditions,
        reviewedAt: new Date().toISOString(),
        reviewedBy: 'Current User' // Would get from auth context
      };

      // Update main inspection record
      const { error: inspectionError } = await supabase
        .from('inspections')
        .update({
          status: 'completed',
          notes: inspectionNotes,
          weather_conditions: weatherConditions,
          updated_at: new Date().toISOString()
        })
        .eq('id', editedInspection.id);

      if (inspectionError) throw inspectionError;

      // Update or insert deficiencies
      for (const deficiency of deficiencies) {
        const deficiencyData = {
          inspection_id: editedInspection.id,
          deficiency_type: deficiency.category || deficiency.type,
          severity: deficiency.severity,
          description: deficiency.description,
          location_description: deficiency.location,
          estimated_cost: deficiency.budgetAmount || deficiency.estimatedBudget
        };

        if (deficiency.id && !deficiency.id.toString().startsWith('temp-')) {
          // Update existing deficiency
          await supabase
            .from('inspection_deficiencies')
            .update(deficiencyData)
            .eq('id', deficiency.id);
        } else {
          // Insert new deficiency
          await supabase
            .from('inspection_deficiencies')
            .insert(deficiencyData);
        }
      }

      // Update or insert capital expenses
      for (const expense of capitalExpenses) {
        const expenseData = {
          inspection_id: editedInspection.id,
          expense_type: expense.type,
          description: expense.description,
          estimated_cost: expense.estimatedBudget,
          priority: expense.priority,
          recommended_timeline: expense.timeline
        };

        if (expense.id && !expense.id.toString().startsWith('temp-')) {
          // Update existing expense
          await supabase
            .from('inspection_capital_expenses')
            .update(expenseData)
            .eq('id', expense.id);
        } else {
          // Insert new expense
          await supabase
            .from('inspection_capital_expenses')
            .insert(expenseData);
        }
      }

      const updatedInspection = {
        ...editedInspection,
        status: 'completed' as InspectionStatus,
        notes: inspectionNotes,
        weather_conditions: weatherConditions,
        session_data: updatedSessionData
      };

      onSave?.(updatedInspection);
      
      // Trigger n8n workflows for completed inspection
      try {
        const { n8nWorkflowTriggers } = await import('@/lib/n8nWorkflowTriggers');
        
        console.log('🚀 Triggering n8n workflows for completed inspection:', updatedInspection.id);
        
        // Format the inspection data for n8n
        const workflowData = {
          id: updatedInspection.id,
          property_name: updatedInspection.roofs?.property_name || 'Unknown Property',
          property_address: updatedInspection.roofs ? 
            `${updatedInspection.roofs.address || ''}, ${updatedInspection.roofs.city || ''}, ${updatedInspection.roofs.state || ''}`.replace(/^, |, $/g, '') : '',
          status: 'completed',
          deficiencies: deficiencies.map(def => ({
            id: def.id,
            category: def.category || def.type,
            description: def.description,
            location: def.location,
            budgetAmount: def.budgetAmount || def.estimatedBudget,
            estimatedCost: def.estimatedCost,
            severity: def.severity,
            // Check if it's immediate repair based on category name
            isImmediateRepair: def.isImmediateRepair || (def.category || def.type || '').toLowerCase().includes('immediate repair'),
            needsSupervisorAlert: def.needsSupervisorAlert || false,
            criticalityScore: def.criticalityScore,
            detectionTimestamp: new Date().toISOString(),
            photos: def.photos || []
          })),
          executiveSummary: {
            summaryText: inspectionNotes || 'Inspection completed',
            overallCondition: 'Fair',
            overallRating: 3,
            keyFindings: deficiencies.map(d => d.description).slice(0, 3),
            criticalIssues: deficiencies.filter(d => d.severity === 'high').map(d => d.description),
            recommendedActions: ['Review deficiencies', 'Schedule repairs as needed'],
            budgetRecommendation: 'As per deficiencies listed'
          },
          capitalExpenses: capitalExpenses,
          overviewPhotos: overviewPhotos || [],
          notes: inspectionNotes,
          weather_conditions: weatherConditions,
          roofs: updatedInspection.roofs,
          users: updatedInspection.users
        };
        
        const workflowResults = await n8nWorkflowTriggers.triggerInspectionWorkflows(workflowData);
        
        console.log('✅ n8n workflow results:', workflowResults);
        
        if (workflowResults.deficiencyAlerts.success && deficiencies.length > 0) {
          toast({
            title: "Deficiency Alerts Sent",
            description: "Critical deficiencies have been reported via email",
          });
        }
        
        if (workflowResults.aiReview.success) {
          toast({
            title: "AI Review Initiated", 
            description: "Inspection is being processed for quality review",
          });
        }
      } catch (workflowError) {
        console.error('❌ Failed to trigger n8n workflows:', workflowError);
        // Don't fail the approval if workflows fail
        toast({
          title: "Workflow Warning",
          description: "Inspection approved but automation workflows may not have triggered",
          variant: "default"
        });
      }
      
      toast({
        title: "Inspection Approved",
        description: "The inspection has been reviewed and marked as completed.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error approving inspection:', error);
      toast({
        title: "Approval Failed",
        description: "Failed to approve inspection. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      const updatedSessionData = {
        ...editedInspection.session_data,
        deficiencies,
        capitalExpenses,
        overviewPhotos,
        inspectionNotes,
        weatherConditions
      };

      const { error } = await supabase
        .from('inspections')
        .update({
          notes: inspectionNotes,
          weather_conditions: weatherConditions,
          session_data: updatedSessionData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editedInspection.id);

      if (error) throw error;

      const updatedInspection = {
        ...editedInspection,
        notes: inspectionNotes,
        weather_conditions: weatherConditions,
        session_data: updatedSessionData
      };

      onSave?.(updatedInspection);
      
      toast({
        title: "Changes Saved",
        description: "Inspection changes have been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addDeficiency = () => {
    const newDeficiency: Deficiency = {
      id: `temp-${Date.now()}`,
      type: '',
      category: '',
      location: '',
      description: '',
      severity: 'medium',
      estimatedBudget: 0,
      budgetAmount: 0,
      status: 'identified',
      photos: []
    };
    setDeficiencies([...deficiencies, newDeficiency]);
  };

  const updateDeficiency = (index: number, field: keyof Deficiency, value: any) => {
    const updated = [...deficiencies];
    updated[index] = { ...updated[index], [field]: value };
    setDeficiencies(updated);
  };

  const removeDeficiency = (index: number) => {
    setDeficiencies(deficiencies.filter((_, i) => i !== index));
  };

  const addCapitalExpense = () => {
    const newExpense: CapitalExpense = {
      id: `temp-${Date.now()}`,
      type: '',
      description: '',
      estimatedBudget: 0,
      timeline: '',
      priority: 'medium'
    };
    setCapitalExpenses([...capitalExpenses, newExpense]);
  };

  const updateCapitalExpense = (index: number, field: keyof CapitalExpense, value: any) => {
    const updated = [...capitalExpenses];
    updated[index] = { ...updated[index], [field]: value };
    setCapitalExpenses(updated);
  };

  const removeCapitalExpense = (index: number) => {
    setCapitalExpenses(capitalExpenses.filter((_, i) => i !== index));
  };

  const isReadyForReview = editedInspection.status === 'ready_for_review';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Inspection Review - {editedInspection.roofs?.property_name}
            </div>
            <Badge className={getStatusColor(editedInspection.status || 'scheduled')}>
              {editedInspection.status?.replace('_', ' ').toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  Inspector
                </div>
                <p className="font-medium">
                  {editedInspection.users?.first_name} {editedInspection.users?.last_name}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Completed Date
                </div>
                <p className="font-medium">
                  {editedInspection.completed_date ? format(new Date(editedInspection.completed_date), 'MMM dd, yyyy') : 'Not completed'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Deficiencies
                </div>
                <p className="text-2xl font-bold text-orange-600">{deficiencies.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Total Cost
                </div>
                <p className="text-2xl font-bold text-green-600">
                  ${(deficiencies.reduce((sum, d) => sum + d.budgetAmount, 0) + 
                     capitalExpenses.reduce((sum, e) => sum + e.estimatedBudget, 0)).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deficiencies">Deficiencies ({deficiencies.length})</TabsTrigger>
              <TabsTrigger value="capital">Capital Expenses ({capitalExpenses.length})</TabsTrigger>
              <TabsTrigger value="photos">Photos ({overviewPhotos.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Inspection Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={inspectionNotes}
                      onChange={(e) => setInspectionNotes(e.target.value)}
                      placeholder="Add or edit inspection notes..."
                      className="min-h-[120px]"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Weather Conditions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      value={weatherConditions}
                      onChange={(e) => setWeatherConditions(e.target.value)}
                      placeholder="Weather conditions during inspection..."
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Address:</span>
                      <p className="font-medium">{editedInspection.roofs?.address}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">City, State:</span>
                      <p className="font-medium">{editedInspection.roofs?.city}, {editedInspection.roofs?.state}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deficiencies" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Deficiencies</h3>
                <Button onClick={addDeficiency} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deficiency
                </Button>
              </div>

              <div className="space-y-3">
                {deficiencies.map((deficiency, index) => (
                  <Card key={deficiency.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Input
                            value={deficiency.category}
                            onChange={(e) => updateDeficiency(index, 'category', e.target.value)}
                            placeholder="Deficiency category"
                            className="flex-1 mr-2"
                          />
                          <Select
                            value={deficiency.severity}
                            onValueChange={(value) => updateDeficiency(index, 'severity', value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDeficiency(index)}
                            className="text-red-600 hover:text-red-700 ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          value={deficiency.location}
                          onChange={(e) => updateDeficiency(index, 'location', e.target.value)}
                          placeholder="Location"
                        />
                        <Textarea
                          value={deficiency.description}
                          onChange={(e) => updateDeficiency(index, 'description', e.target.value)}
                          placeholder="Description"
                        />
                        <Input
                          type="number"
                          value={deficiency.budgetAmount}
                          onChange={(e) => updateDeficiency(index, 'budgetAmount', Number(e.target.value))}
                          placeholder="Budget amount"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="capital" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Capital Expenses</h3>
                <Button onClick={addCapitalExpense} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Capital Expense
                </Button>
              </div>

              <div className="space-y-3">
                {capitalExpenses.map((expense, index) => (
                  <Card key={expense.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Input
                            value={expense.type}
                            onChange={(e) => updateCapitalExpense(index, 'type', e.target.value)}
                            placeholder="Expense type"
                            className="flex-1 mr-2"
                          />
                          <Select
                            value={expense.priority}
                            onValueChange={(value) => updateCapitalExpense(index, 'priority', value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCapitalExpense(index)}
                            className="text-red-600 hover:text-red-700 ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={expense.description}
                          onChange={(e) => updateCapitalExpense(index, 'description', e.target.value)}
                          placeholder="Description"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            value={expense.estimatedBudget}
                            onChange={(e) => updateCapitalExpense(index, 'estimatedBudget', Number(e.target.value))}
                            placeholder="Estimated cost"
                          />
                          <Input
                            value={expense.timeline}
                            onChange={(e) => updateCapitalExpense(index, 'timeline', e.target.value)}
                            placeholder="Timeline"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="photos" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {overviewPhotos.map((photo, index) => (
                  <Card key={index}>
                    <CardContent className="p-2">
                      <img 
                        src={photo.url} 
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                      />
                      <p className="text-xs text-center mt-2">{photo.location || `Photo ${index + 1}`}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveChanges} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          {isReadyForReview && (
            <Button onClick={handleApproveAndComplete} disabled={saving} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              {saving ? 'Processing...' : 'Approve & Complete'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}