import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, 
  Plus, 
  MapPin, 
  FileText, 
  AlertTriangle,
  Image as ImageIcon,
  Trash2,
  Edit,
  Save,
  X,
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Photo {
  id: string;
  url: string;
  file: File;
  type: 'overview' | 'deficiency';
  location?: string;
  timestamp: Date;
}

interface Deficiency {
  id: string;
  category: string;
  location: string;
  description: string;
  budgetAmount: number;
  photos: Photo[];
  severity: 'low' | 'medium' | 'high';
  status: 'identified' | 'documented' | 'resolved';
}

interface CapitalExpense {
  id: string;
  description: string;
  year: number;
  estimatedCost: number;
  scopeOfWork: string;
  completed: boolean;
}

interface ActiveInspectionProps {
  propertyId: string;
  propertyName: string;
  onComplete: (inspectionData: any) => void;
  onCancel: () => void;
  onDataChange?: (data: any) => void;
}

const DEFICIENCY_CATEGORIES = [
  'Perimeter Flashing',
  'Curb Flashing', 
  'Penetration',
  'Roof Top Equipment',
  'Gutters/Downspouts',
  'Roofing Drains',
  'Scuppers',
  'Debris',
  'Membrane Failures',
  'General Wear',
  'Structural Issues'
];

export function ActiveInspectionInterface({ 
  propertyId, 
  propertyName, 
  onComplete, 
  onCancel,
  onDataChange
}: ActiveInspectionProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overviewFileInputRef = useRef<HTMLInputElement>(null);

  // Inspection state
  const [currentTab, setCurrentTab] = useState('deficiencies');
  const [inspectionStarted, setInspectionStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  // Deficiencies
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([]);
  const [showDeficiencyModal, setShowDeficiencyModal] = useState(false);
  const [editingDeficiency, setEditingDeficiency] = useState<Deficiency | null>(null);
  
  // Overview photos
  const [overviewPhotos, setOverviewPhotos] = useState<Photo[]>([]);
  
  // Notes and findings
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [roofSquareFootageConfirmed, setRoofSquareFootageConfirmed] = useState<boolean | null>(null);
  
  // Capital expenses
  const [capitalExpenses, setCapitalExpenses] = useState<CapitalExpense[]>([]);
  const [showCapitalExpenseModal, setShowCapitalExpenseModal] = useState(false);
  const [editingCapitalExpense, setEditingCapitalExpense] = useState<CapitalExpense | null>(null);

  // New deficiency form
  const [newDeficiency, setNewDeficiency] = useState({
    category: '',
    location: '',
    description: '',
    budgetAmount: 0,
    severity: 'medium' as 'low' | 'medium' | 'high'
  });

  // New capital expense form
  const [newCapitalExpense, setNewCapitalExpense] = useState({
    description: '',
    year: new Date().getFullYear() + 1,
    estimatedCost: 0,
    scopeOfWork: ''
  });

  // Auto-save inspection data whenever it changes
  useEffect(() => {
    if (onDataChange) {
      const inspectionData = {
        propertyId,
        propertyName,
        deficiencies,
        overviewPhotos,
        inspectionNotes,
        roofSquareFootageConfirmed,
        capitalExpenses,
        inspectionStarted,
        startTime,
        lastUpdated: new Date().toISOString()
      };
      onDataChange(inspectionData);
    }
  }, [
    propertyId, 
    propertyName, 
    deficiencies, 
    overviewPhotos, 
    inspectionNotes, 
    roofSquareFootageConfirmed, 
    capitalExpenses, 
    inspectionStarted, 
    startTime, 
    onDataChange
  ]);

  useEffect(() => {
    if (!inspectionStarted) {
      setStartTime(new Date());
      setInspectionStarted(true);
    }
  }, [inspectionStarted]);

  const handleCameraCapture = (type: 'overview' | 'deficiency') => {
    const fileInput = type === 'overview' ? overviewFileInputRef : fileInputRef;
    fileInput.current?.click();
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>, type: 'overview' | 'deficiency') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        const photo: Photo = {
          id: `photo-${Date.now()}-${Math.random()}`,
          url,
          file,
          type,
          timestamp: new Date()
        };

        if (type === 'overview') {
          setOverviewPhotos(prev => [...prev, photo]);
        } else {
          // For deficiency photos, we'll add them when creating the deficiency
          console.log('Deficiency photo captured, will be added to deficiency');
        }
      }
    });

    // Reset file input
    event.target.value = '';
  };

  const handleCreateDeficiency = () => {
    if (!newDeficiency.category || !newDeficiency.location) {
      toast({
        title: "Missing Information",
        description: "Please select a category and specify location",
        variant: "destructive"
      });
      return;
    }

    const deficiency: Deficiency = {
      id: `def-${Date.now()}`,
      category: newDeficiency.category,
      location: newDeficiency.location,
      description: newDeficiency.description,
      budgetAmount: newDeficiency.budgetAmount,
      photos: [],
      severity: newDeficiency.severity,
      status: 'identified'
    };

    setDeficiencies(prev => [...prev, deficiency]);
    setNewDeficiency({
      category: '',
      location: '',
      description: '',
      budgetAmount: 0,
      severity: 'medium'
    });
    setShowDeficiencyModal(false);

    toast({
      title: "Deficiency Added",
      description: `${deficiency.category} deficiency documented`,
    });
  };

  const handleAddCapitalExpense = () => {
    if (!newCapitalExpense.description || newCapitalExpense.estimatedCost <= 0) {
      toast({
        title: "Missing Information", 
        description: "Please provide description and cost estimate",
        variant: "destructive"
      });
      return;
    }

    const expense: CapitalExpense = {
      id: `cap-${Date.now()}`,
      description: newCapitalExpense.description,
      year: newCapitalExpense.year,
      estimatedCost: newCapitalExpense.estimatedCost,
      scopeOfWork: newCapitalExpense.scopeOfWork,
      completed: false
    };

    setCapitalExpenses(prev => [...prev, expense]);
    setNewCapitalExpense({
      description: '',
      year: new Date().getFullYear() + 1,
      estimatedCost: 0,
      scopeOfWork: ''
    });
    setShowCapitalExpenseModal(false);

    toast({
      title: "Capital Expense Added",
      description: `$${expense.estimatedCost.toLocaleString()} expense documented`,
    });
  };

  const handleCompleteInspection = async () => {
    if (deficiencies.length === 0 && overviewPhotos.length === 0) {
      toast({
        title: "Incomplete Inspection",
        description: "Please add at least some photos or deficiencies",
        variant: "destructive"
      });
      return;
    }

    const inspectionData = {
      propertyId,
      propertyName,
      startTime,
      endTime: new Date(),
      deficiencies,
      overviewPhotos,
      capitalExpenses,
      inspectionNotes,
      roofSquareFootageConfirmed,
      summary: {
        totalDeficiencies: deficiencies.length,
        highSeverityCount: deficiencies.filter(d => d.severity === 'high').length,
        totalCapitalExpenses: capitalExpenses.reduce((sum, exp) => sum + exp.estimatedCost, 0),
        overviewPhotoCount: overviewPhotos.length
      }
    };

    // Here you would save to database
    console.log('Completing inspection:', inspectionData);
    
    toast({
      title: "Inspection Complete",
      description: `${deficiencies.length} deficiencies and ${overviewPhotos.length} overview photos documented`,
    });

    onComplete(inspectionData);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'deficiencies': return deficiencies.length;
      case 'overview': return overviewPhotos.length;
      case 'notes': return inspectionNotes.length > 0 ? 1 : 0;
      case 'files': return capitalExpenses.length;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-bold truncate">{propertyName}</h1>
            <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm opacity-90">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                {startTime && (
                  <span className="hidden sm:inline">Started: {startTime.toLocaleTimeString()}</span>
                )}
              </div>
              <Badge variant="secondary" className="bg-blue-500 text-xs">
                Active Inspection
              </Badge>
            </div>
          </div>
          <div className="flex gap-1 md:gap-2 ml-2">
            <Button 
              variant="outline" 
              onClick={onCancel} 
              size="sm"
              className="text-blue-600 border-white hover:bg-blue-50 text-xs md:text-sm"
            >
              ← Back
            </Button>
            <Button 
              onClick={handleCompleteInspection} 
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-xs md:text-sm"
            >
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Complete
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-2 md:p-4">
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="w-full h-12 md:h-14 bg-gray-100 rounded-none border-b overflow-x-auto flex-nowrap">
                <TabsTrigger value="deficiencies" className="flex items-center gap-1 md:gap-2 px-2 md:px-4 text-xs md:text-sm whitespace-nowrap">
                  <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Deficiencies</span>
                  <span className="sm:hidden">Def</span>
                  {getTabCount('deficiencies') > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{getTabCount('deficiencies')}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="overview" className="flex items-center gap-1 md:gap-2 px-2 md:px-4 text-xs md:text-sm whitespace-nowrap">
                  <ImageIcon className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Overview Photos</span>
                  <span className="sm:hidden">Photos</span>
                  {getTabCount('overview') > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{getTabCount('overview')}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-1 md:gap-2 px-2 md:px-4 text-xs md:text-sm whitespace-nowrap">
                  <FileText className="h-3 w-3 md:h-4 md:w-4" />
                  <span>Notes</span>
                </TabsTrigger>
                <TabsTrigger value="files" className="flex items-center gap-1 md:gap-2 px-2 md:px-4 text-xs md:text-sm whitespace-nowrap">
                  <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Capital Expenses</span>
                  <span className="sm:hidden">Capital</span>
                  {getTabCount('files') > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">{getTabCount('files')}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Deficiencies Tab */}
              <TabsContent value="deficiencies" className="p-3 md:p-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <h2 className="text-lg md:text-xl font-semibold">Roof Deficiencies</h2>
                    <Button 
                      onClick={() => setShowDeficiencyModal(true)}
                      className="w-full sm:w-auto"
                      size="lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Deficiency
                    </Button>
                  </div>

                  {deficiencies.length === 0 ? (
                    <Card className="p-8 text-center">
                      <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Deficiencies Documented</h3>
                      <p className="text-gray-600 mb-4">Start by adding deficiencies found during your inspection.</p>
                      <Button onClick={() => setShowDeficiencyModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Deficiency
                      </Button>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {deficiencies.map((deficiency) => (
                        <Card key={deficiency.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getSeverityColor(deficiency.severity)}>
                                  {deficiency.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="outline">{deficiency.category}</Badge>
                              </div>
                              <h3 className="font-semibold">{deficiency.location}</h3>
                              {deficiency.description && (
                                <p className="text-gray-600 mt-1">{deficiency.description}</p>
                              )}
                              {deficiency.budgetAmount > 0 && (
                                <p className="text-sm text-green-600 mt-1">
                                  Budget: ${deficiency.budgetAmount.toLocaleString()}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Camera className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Overview Photos Tab */}
              <TabsContent value="overview" className="p-3 md:p-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <h2 className="text-lg md:text-xl font-semibold">Overview Photos</h2>
                    <Button 
                      onClick={() => handleCameraCapture('overview')}
                      className="w-full sm:w-auto"
                      size="lg"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {/* Upload placeholder */}
                    <Card 
                      className="aspect-square flex items-center justify-center cursor-pointer hover:bg-gray-50 border-dashed"
                      onClick={() => handleCameraCapture('overview')}
                    >
                      <div className="text-center">
                        <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Upload Photo</p>
                        <p className="text-xs text-gray-500">(max 20 MB)</p>
                      </div>
                    </Card>

                    {/* Existing photos */}
                    {overviewPhotos.map((photo) => (
                      <Card key={photo.id} className="aspect-square overflow-hidden relative group">
                        <img 
                          src={photo.url} 
                          alt="Overview" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => setOverviewPhotos(prev => prev.filter(p => p.id !== photo.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="p-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Inspection Findings</h2>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        Did you confirm roof square footage? *
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="roofFootage"
                            checked={roofSquareFootageConfirmed === true}
                            onChange={() => setRoofSquareFootageConfirmed(true)}
                            className="mr-2"
                          />
                          Yes
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="roofFootage"
                            checked={roofSquareFootageConfirmed === false}
                            onChange={() => setRoofSquareFootageConfirmed(false)}
                            className="mr-2"
                          />
                          No
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Inspection Findings *
                      </label>
                      <Textarea
                        value={inspectionNotes}
                        onChange={(e) => setInspectionNotes(e.target.value)}
                        placeholder="Enter detailed inspection findings, observations, and recommendations..."
                        rows={12}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Capital Expenses Tab */}
              <TabsContent value="files" className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Capital Expenses</h2>
                    <Button onClick={() => setShowCapitalExpenseModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Capital Expense
                    </Button>
                  </div>

                  {capitalExpenses.length === 0 ? (
                    <Card className="p-8 text-center">
                      <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Capital Expenses</h3>
                      <p className="text-gray-600 mb-4">Add capital expenses identified during inspection.</p>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {capitalExpenses.map((expense) => (
                        <Card key={expense.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{expense.description}</h3>
                              <p className="text-2xl font-bold text-green-600">
                                ${expense.estimatedCost.toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-600">Year: {expense.year}</p>
                              {expense.scopeOfWork && (
                                <p className="text-sm text-gray-600 mt-1">{expense.scopeOfWork}</p>
                              )}
                            </div>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handlePhotoCapture(e, 'deficiency')}
      />
      <input
        ref={overviewFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handlePhotoCapture(e, 'overview')}
      />

      {/* Deficiency Modal */}
      <Dialog open={showDeficiencyModal} onOpenChange={setShowDeficiencyModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adding New Deficiency</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Deficiency *</label>
                <Select value={newDeficiency.category} onValueChange={(value) => 
                  setNewDeficiency(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFICIENCY_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Budget Amount *</label>
                <Input
                  type="number"
                  value={newDeficiency.budgetAmount}
                  onChange={(e) => setNewDeficiency(prev => ({ 
                    ...prev, 
                    budgetAmount: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="Estimated cost"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location/Description</label>
              <Input
                value={newDeficiency.location}
                onChange={(e) => setNewDeficiency(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Describe location and issue details"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Scope of Work *</label>
              <Textarea
                value={newDeficiency.description}
                onChange={(e) => setNewDeficiency(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of work needed"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Severity</label>
              <Select value={newDeficiency.severity} onValueChange={(value: 'low' | 'medium' | 'high') => 
                setNewDeficiency(prev => ({ ...prev, severity: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Upload Photo (max 20 MB)</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => handleCameraCapture('deficiency')}
              >
                Take Photo
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeficiencyModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeficiency}>
              Add Deficiency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Capital Expense Modal */}
      <Dialog open={showCapitalExpenseModal} onOpenChange={setShowCapitalExpenseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Capital Expense</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Input
                value={newCapitalExpense.description}
                onChange={(e) => setNewCapitalExpense(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Roof Replacement (Recover)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Expense Year *</label>
                <Input
                  type="number"
                  value={newCapitalExpense.year}
                  onChange={(e) => setNewCapitalExpense(prev => ({ 
                    ...prev, 
                    year: parseInt(e.target.value) || new Date().getFullYear() 
                  }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Estimated Cost *</label>
                <Input
                  type="number"
                  value={newCapitalExpense.estimatedCost}
                  onChange={(e) => setNewCapitalExpense(prev => ({ 
                    ...prev, 
                    estimatedCost: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="Dollar amount"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Scope of Work *</label>
              <Textarea
                value={newCapitalExpense.scopeOfWork}
                onChange={(e) => setNewCapitalExpense(prev => ({ ...prev, scopeOfWork: e.target.value }))}
                placeholder="Detailed scope of work description"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCapitalExpenseModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCapitalExpense}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}