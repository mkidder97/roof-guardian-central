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
  Edit,
  Save,
  X,
  Plus,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { InspectionSyncData } from '@/types/inspection';

interface EditableInspectionDetailModalProps {
  inspection: InspectionSyncData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (updatedInspection: InspectionSyncData) => void;
  readonly?: boolean;
}

export function EditableInspectionDetailModal({ 
  inspection, 
  open, 
  onOpenChange, 
  onSave,
  readonly = false 
}: EditableInspectionDetailModalProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedInspection, setEditedInspection] = useState<InspectionSyncData | null>(null);

  useEffect(() => {
    if (inspection) {
      setEditedInspection({ ...inspection });
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

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('inspections')
        .update({
          status: editedInspection.status,
          notes: editedInspection.notes,
          session_data: editedInspection.session_data,
          updated_at: new Date().toISOString()
        })
        .eq('id', editedInspection.id);

      if (error) throw error;

      onSave?.(editedInspection);
      setIsEditing(false);
      
      toast({
        title: "Inspection Updated",
        description: "The inspection has been successfully updated.",
      });
    } catch (error) {
      console.error('Error saving inspection:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save inspection changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedInspection({ ...inspection });
    setIsEditing(false);
  };

  const updateDeficiency = (index: number, field: string, value: any) => {
    const sessionData = editedInspection.session_data || {};
    const deficiencies = [...(sessionData.deficiencies || [])];
    deficiencies[index] = { ...deficiencies[index], [field]: value };
    
    setEditedInspection({
      ...editedInspection,
      session_data: { ...sessionData, deficiencies }
    });
  };

  const addDeficiency = () => {
    const sessionData = editedInspection.session_data || {};
    const newDeficiency = {
      id: Date.now().toString(),
      category: '',
      location: '',
      description: '',
      budgetAmount: 0,
      severity: 'medium',
      status: 'identified',
      photos: []
    };
    
    const deficiencies = [...(sessionData.deficiencies || []), newDeficiency];
    setEditedInspection({
      ...editedInspection,
      session_data: { ...sessionData, deficiencies }
    });
  };

  const removeDeficiency = (index: number) => {
    const sessionData = editedInspection.session_data || {};
    const deficiencies = [...(sessionData.deficiencies || [])];
    deficiencies.splice(index, 1);
    
    setEditedInspection({
      ...editedInspection,
      session_data: { ...sessionData, deficiencies }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Inspection Details - {editedInspection.roofs?.property_name}
            </div>
            {!readonly && (
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Inspection
                  </Button>
                )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Status
                </div>
                {isEditing ? (
                  <Select
                    value={editedInspection.status || 'scheduled'}
                    onValueChange={(value) => setEditedInspection({ ...editedInspection, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="ready_for_review">Ready for Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={getStatusColor(editedInspection.status || 'scheduled')}>
                    {editedInspection.status?.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </CardContent>
            </Card>

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
                  <Clock className="h-4 w-4" />
                  Date
                </div>
                <p className="font-medium">
                  {editedInspection.scheduled_date ? format(new Date(editedInspection.scheduled_date), 'MMM dd, yyyy') : 'Not scheduled'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deficiencies">Deficiencies</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="expenses">Capital Expenses</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
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

              <Card>
                <CardHeader>
                  <CardTitle>Inspection Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editedInspection.notes || ''}
                      onChange={(e) => setEditedInspection({ ...editedInspection, notes: e.target.value })}
                      placeholder="Add inspection notes..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{editedInspection.notes || 'No notes available'}</p>
                  )}
                </CardContent>
              </Card>

              {editedInspection.session_data && (
                <Card>
                  <CardHeader>
                    <CardTitle>Session Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {editedInspection.session_data.deficiencies?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Deficiencies</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {editedInspection.session_data.overviewPhotos?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Photos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {editedInspection.session_data.capitalExpenses?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Capital Items</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          ${(editedInspection.session_data.capitalExpenses?.reduce((sum: number, exp: any) => sum + (exp.estimatedCost || 0), 0) || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Cost</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="deficiencies" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Deficiencies</h3>
                {isEditing && (
                  <Button onClick={addDeficiency} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Deficiency
                  </Button>
                )}
              </div>

              {editedInspection.session_data?.deficiencies?.length > 0 ? (
                <div className="space-y-3">
                  {editedInspection.session_data.deficiencies.map((deficiency: any, index: number) => (
                    <Card key={deficiency.id || index}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            {isEditing ? (
                              <Input
                                value={deficiency.category || ''}
                                onChange={(e) => updateDeficiency(index, 'category', e.target.value)}
                                placeholder="Category"
                                className="flex-1"
                              />
                            ) : (
                              <span className="font-medium">{deficiency.category}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <Select
                                value={deficiency.severity || 'medium'}
                                onValueChange={(value) => updateDeficiency(index, 'severity', value)}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge className={getSeverityColor(deficiency.severity)}>
                                {deficiency.severity?.toUpperCase()}
                              </Badge>
                            )}
                            {isEditing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDeficiency(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Location:</span>
                            {isEditing ? (
                              <Input
                                value={deficiency.location || ''}
                                onChange={(e) => updateDeficiency(index, 'location', e.target.value)}
                                placeholder="Location"
                                className="mt-1"
                              />
                            ) : (
                              <p className="text-sm">{deficiency.location}</p>
                            )}
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Description:</span>
                            {isEditing ? (
                              <Textarea
                                value={deficiency.description || ''}
                                onChange={(e) => updateDeficiency(index, 'description', e.target.value)}
                                placeholder="Description"
                                className="mt-1"
                              />
                            ) : (
                              <p className="text-sm">{deficiency.description}</p>
                            )}
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Budget Amount:</span>
                            {isEditing ? (
                              <Input
                                type="number"
                                value={deficiency.budgetAmount || 0}
                                onChange={(e) => updateDeficiency(index, 'budgetAmount', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="mt-1"
                              />
                            ) : (
                              deficiency.budgetAmount > 0 && (
                                <div className="flex items-center gap-1 text-sm">
                                  <DollarSign className="h-3 w-3" />
                                  <span className="font-medium">${deficiency.budgetAmount.toLocaleString()}</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">No Deficiencies Found</p>
                    <p className="text-muted-foreground">This inspection found no issues requiring attention.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="photos" className="space-y-4">
              {editedInspection.session_data?.overviewPhotos?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {editedInspection.session_data.overviewPhotos.map((photo: any, index: number) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="aspect-square bg-gray-100 flex items-center justify-center">
                          {photo.url ? (
                            <img 
                              src={photo.url} 
                              alt={`Inspection photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {photo.type || 'Overview'}
                          </Badge>
                          {photo.timestamp && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(photo.timestamp), 'MMM dd, HH:mm')}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium">No Photos Available</p>
                    <p className="text-muted-foreground">No photos were captured during this inspection.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="expenses" className="space-y-4">
              {editedInspection.session_data?.capitalExpenses?.length > 0 ? (
                <div className="space-y-3">
                  {editedInspection.session_data.capitalExpenses.map((expense: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{expense.description}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">${expense.estimatedCost?.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">Year {expense.year}</div>
                          </div>
                        </div>
                        {expense.scopeOfWork && (
                          <div>
                            <span className="text-sm text-muted-foreground">Scope of Work:</span>
                            <p className="text-sm">{expense.scopeOfWork}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total Capital Expenses:</span>
                      <span className="text-xl font-bold text-blue-600">
                        ${editedInspection.session_data.capitalExpenses.reduce((sum: number, exp: any) => sum + (exp.estimatedCost || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium">No Capital Expenses</p>
                    <p className="text-muted-foreground">No capital expenses were identified during this inspection.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}