import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2, 
  AlertTriangle, 
  Camera, 
  Mic, 
  FileText, 
  TrendingUp,
  MapPin,
  Clock,
  DollarSign,
  Loader2
} from "lucide-react";
import { InspectorIntelligenceService } from "@/lib/inspectorIntelligenceService";
import { ActiveInspectionInterface } from "@/components/inspection/ActiveInspectionInterface";
import { useToast } from "@/hooks/use-toast";
import { BuildingDetailsDialog } from "@/components/inspector/BuildingDetailsDialog";

interface InspectionBriefing {
  property: {
    id: string;
    name: string;
    address: string;
    roofType: string;
    squareFootage: number;
    lastInspectionDate: string;
  };
  focusAreas: Array<{
    location: string;
    severity: 'high' | 'medium' | 'low';
    issueType: string;
    recurrenceCount: number;
    lastReported: string;
    estimatedCost: number;
  }>;
  patternInsights: Array<{
    insight: string;
    probability: number;
    basedOnCount: number;
  }>;
  crossPortfolioInsights: Array<{
    pattern: string;
    affectedProperties: number;
    successfulFix?: string;
  }>;
  historicalPhotos: Array<{
    id: string;
    location: string;
    date: string;
    url: string;
    issue: string;
  }>;
}

const InspectorInterface = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<InspectionBriefing | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState<string[]>([]);
  const [availableProperties, setAvailableProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [activeInspection, setActiveInspection] = useState<{propertyId: string; propertyName: string} | null>(null);
  const [showBuildingDetails, setShowBuildingDetails] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  // Mock data for demo - this would come from your API/database
  const mockBriefing: InspectionBriefing = {
    property: {
      id: "1",
      name: "Prologis Dallas Distribution Center",
      address: "2400 Industrial Blvd, Dallas, TX 75207",
      roofType: "Modified Bitumen",
      squareFootage: 150000,
      lastInspectionDate: "2024-10-15"
    },
    focusAreas: [
      {
        location: "Northwest corner",
        severity: "high",
        issueType: "Recurring leak",
        recurrenceCount: 3,
        lastReported: "2024-10-15",
        estimatedCost: 12500
      },
      {
        location: "HVAC penetrations",
        severity: "medium",
        issueType: "Sealant failure",
        recurrenceCount: 2,
        lastReported: "2024-08-20",
        estimatedCost: 3500
      },
      {
        location: "Drainage system",
        severity: "medium",
        issueType: "Pooling water",
        recurrenceCount: 2,
        lastReported: "2024-09-10",
        estimatedCost: 8000
      }
    ],
    patternInsights: [
      {
        insight: "Similar roofs fail at parapet walls",
        probability: 70,
        basedOnCount: 15
      },
      {
        insight: "This material degrades 40% faster near HVAC units",
        probability: 85,
        basedOnCount: 23
      },
      {
        insight: "Average repair cost for this issue type",
        probability: 90,
        basedOnCount: 47
      }
    ],
    crossPortfolioInsights: [
      {
        pattern: "Modified Bitumen roofs showing same drainage issues",
        affectedProperties: 5,
        successfulFix: "Install cricket diverters - 95% success rate"
      },
      {
        pattern: "HVAC sealant failures appear 6 months before major leak",
        affectedProperties: 8
      }
    ],
    historicalPhotos: [
      {
        id: "1",
        location: "Northwest corner",
        date: "2024-10-15",
        url: "/placeholder.svg",
        issue: "Active leak penetration"
      },
      {
        id: "2",
        location: "HVAC Unit 3",
        date: "2024-08-20",
        url: "/placeholder.svg",
        issue: "Deteriorated sealant"
      }
    ]
  };

  // Load available properties on component mount
  useEffect(() => {
    const loadProperties = async () => {
      setLoading(true);
      try {
        const properties = await InspectorIntelligenceService.getAvailableProperties();
        
        // Get property summaries with critical issue counts
        const propertiesWithSummary = await Promise.all(
          properties.slice(0, 10).map(async (property) => {
            const summary = await InspectorIntelligenceService.getPropertySummary(property.id);
            return summary || {
              id: property.id,
              name: property.property_name,
              roofType: property.roof_type || 'Unknown',
              squareFootage: property.roof_area || 0,
              lastInspectionDate: property.last_inspection_date,
              criticalIssues: 0,
              status: 'good'
            };
          })
        );
        
        setAvailableProperties(propertiesWithSummary);
      } catch (error) {
        console.error('Error loading properties:', error);
        toast({
          title: "Error",
          description: "Failed to load properties",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, [toast]);

  // Load briefing data when property is selected
  useEffect(() => {
    const loadBriefing = async () => {
      if (!selectedProperty) return;
      
      setLoadingBriefing(true);
      try {
        const briefingData = await InspectorIntelligenceService.generateInspectionBriefing(selectedProperty);
        if (briefingData) {
          setBriefing(briefingData);
        } else {
          throw new Error('Failed to generate briefing');
        }
      } catch (error) {
        console.error('Error loading briefing:', error);
        toast({
          title: "Error",
          description: "Failed to load inspection briefing",
          variant: "destructive"
        });
      } finally {
        setLoadingBriefing(false);
      }
    };

    loadBriefing();
  }, [selectedProperty, toast]);

  const handleVoiceNote = () => {
    setIsRecording(!isRecording);
    if (isRecording) {
      // Stop recording and add note
      setVoiceNotes([...voiceNotes, `Voice note ${voiceNotes.length + 1}: Northwest corner leak has expanded 6 inches`]);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const handleStartInspection = (propertyId: string, propertyName: string) => {
    setActiveInspection({ propertyId, propertyName });
  };

  const handleCompleteInspection = (inspectionData: any) => {
    console.log('Inspection completed:', inspectionData);
    setActiveInspection(null);
    setSelectedProperty(null);
    toast({
      title: "Inspection Completed",
      description: `Inspection for ${inspectionData.propertyName} has been saved`,
    });
  };

  const handleCancelInspection = () => {
    if (confirm('Are you sure you want to cancel this inspection? Any unsaved data will be lost.')) {
      setActiveInspection(null);
    }
  };

  const handleBuildingClick = (propertyId: string) => {
    setSelectedBuildingId(propertyId);
    setShowBuildingDetails(true);
  };

  const handleBuildingDetailsClose = () => {
    setShowBuildingDetails(false);
    setSelectedBuildingId(null);
  };

  // If there's an active inspection, show the inspection interface
  if (activeInspection) {
    return (
      <ActiveInspectionInterface
        propertyId={activeInspection.propertyId}
        propertyName={activeInspection.propertyName}
        onComplete={handleCompleteInspection}
        onCancel={handleCancelInspection}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Inspector Intelligence</h1>
          </div>
          <Button 
            variant="secondary" 
            onClick={() => navigate("/")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        {!selectedProperty ? (
          // Property Selection
          <Card>
            <CardHeader>
              <CardTitle>Select Property for Inspection</CardTitle>
              <CardDescription>Choose a property to view pre-inspection intelligence</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2">Loading properties...</span>
                </div>
              ) : (
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {availableProperties.map((property) => (
                    <Card 
                      key={property.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleBuildingClick(property.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{property.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {property.roofType} • {property.squareFootage.toLocaleString()} sq ft
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Last inspected: {property.lastInspectionDate 
                                ? new Date(property.lastInspectionDate).toLocaleDateString()
                                : 'Never'
                              }
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {property.criticalIssues > 0 && (
                              <Badge variant="destructive">
                                {property.criticalIssues} Critical Issue{property.criticalIssues > 1 ? 's' : ''}
                              </Badge>
                            )}
                            <Badge 
                              variant={
                                property.status === 'critical' ? 'destructive' :
                                property.status === 'overdue' ? 'destructive' :
                                property.status === 'attention' ? 'secondary' : 'outline'
                              }
                            >
                              {property.status === 'critical' ? 'Critical' :
                               property.status === 'overdue' ? 'Overdue' :
                               property.status === 'attention' ? 'Needs Attention' : 'Good'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {availableProperties.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No properties available for inspection</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : loadingBriefing ? (
          // Loading briefing
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Generating inspection briefing...</span>
              </div>
            </CardContent>
          </Card>
        ) : briefing ? (
          // Pre-Inspection Intelligence
          <div className="space-y-6">
            {/* Property Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <MapPin className="h-6 w-6" />
                      {briefing.property.name}
                    </h2>
                    <p className="text-muted-foreground">{briefing.property.address}</p>
                    <div className="flex gap-4 mt-2">
                      <Badge variant="outline">
                        <Building2 className="h-3 w-3 mr-1" />
                        {briefing.property.roofType}
                      </Badge>
                      <Badge variant="outline">
                        {briefing.property.squareFootage.toLocaleString()} sq ft
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Last: {new Date(briefing.property.lastInspectionDate).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedProperty(null)}
                  >
                    Change Property
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="briefing" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="briefing">Intelligence Briefing</TabsTrigger>
                <TabsTrigger value="patterns">Pattern Analysis</TabsTrigger>
                <TabsTrigger value="photos">Historical Photos</TabsTrigger>
                <TabsTrigger value="notes">Field Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="briefing" className="space-y-4">
                {/* Focus Areas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Critical Focus Areas
                    </CardTitle>
                    <CardDescription>Areas requiring immediate attention during inspection</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {briefing.focusAreas.map((area, index) => (
                        <Alert key={index} variant={area.severity === 'high' ? 'destructive' : 'default'}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="flex items-center justify-between">
                            <span>{area.location}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={getSeverityColor(area.severity)}>
                                {area.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="outline">
                                <DollarSign className="h-3 w-3" />
                                {area.estimatedCost.toLocaleString()}
                              </Badge>
                            </div>
                          </AlertTitle>
                          <AlertDescription>
                            <p>{area.issueType} • Reported {area.recurrenceCount} times</p>
                            <p className="text-sm mt-1">Last reported: {new Date(area.lastReported).toLocaleDateString()}</p>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Cross-Portfolio Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Cross-Portfolio Intelligence
                    </CardTitle>
                    <CardDescription>Insights from similar properties in your portfolio</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {briefing.crossPortfolioInsights.map((insight, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <p className="font-medium">{insight.pattern}</p>
                          <p className="text-sm text-muted-foreground">
                            Affects {insight.affectedProperties} properties
                          </p>
                          {insight.successfulFix && (
                            <p className="text-sm text-green-600 mt-1">
                              ✓ Solution: {insight.successfulFix}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="patterns" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pattern Recognition Insights</CardTitle>
                    <CardDescription>AI-detected patterns based on historical data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {briefing.patternInsights.map((pattern, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{pattern.insight}</p>
                            <p className="text-sm text-muted-foreground">
                              Based on {pattern.basedOnCount} similar cases
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{pattern.probability}%</div>
                            <p className="text-sm text-muted-foreground">Probability</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="photos" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Historical Reference Photos</CardTitle>
                    <CardDescription>Previous damage locations and progression</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {briefing.historicalPhotos.map((photo) => (
                        <div key={photo.id} className="border rounded-lg p-3">
                          <img 
                            src={photo.url} 
                            alt={photo.issue}
                            className="w-full h-48 object-cover rounded mb-2"
                          />
                          <div className="space-y-1">
                            <p className="font-medium">{photo.location}</p>
                            <p className="text-sm text-muted-foreground">{photo.issue}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(photo.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Field Notes</CardTitle>
                    <CardDescription>Voice-to-text inspection notes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button 
                          variant={isRecording ? "destructive" : "default"}
                          size="lg"
                          className="flex-1"
                          onClick={handleVoiceNote}
                        >
                          <Mic className="h-5 w-5 mr-2" />
                          {isRecording ? "Stop Recording" : "Start Voice Note"}
                        </Button>
                        <Button variant="outline" size="lg">
                          <Camera className="h-5 w-5 mr-2" />
                          Take Photo
                        </Button>
                      </div>

                      {voiceNotes.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Recorded Notes:</h4>
                          {voiceNotes.map((note, index) => (
                            <div key={index} className="p-3 bg-muted rounded-lg">
                              <p className="text-sm">{note}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date().toLocaleTimeString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                        onClick={() => handleStartInspection(briefing.property.id, briefing.property.name)}
                      >
                        <Camera className="h-5 w-5 mr-2" />
                        Start Inspection
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Report
                        </Button>
                        <Button variant="outline">
                          Request Repair Quote
                        </Button>
                        <Button variant="outline">
                          Schedule Follow-up
                        </Button>
                        <Button variant="outline">
                          Export Findings
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          // Error state when briefing failed to load
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to Load Briefing</h3>
                <p className="text-gray-600 mb-4">
                  We couldn't generate the inspection briefing for this property.
                </p>
                <div className="space-x-2">
                  <Button onClick={() => setSelectedProperty(null)} variant="outline">
                    Select Different Property
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Building Details Dialog */}
      {selectedBuildingId && (
        <BuildingDetailsDialog
          open={showBuildingDetails}
          onOpenChange={handleBuildingDetailsClose}
          roofId={selectedBuildingId}
        />
      )}
    </div>
  );
};

export default InspectorInterface;