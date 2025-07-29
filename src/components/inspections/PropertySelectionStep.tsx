import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, MapPin, Building, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { InspectionSetupData } from './DirectInspectionWizard';

interface Property {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  roof_area?: number;
  property_manager_name?: string;
  property_manager_email?: string;
}

interface PropertySelectionStepProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  setupData: InspectionSetupData;
  onInspectionScheduled: () => void;
}

export function PropertySelectionStep({ 
  open, 
  onOpenChange, 
  onBack, 
  setupData, 
  onInspectionScheduled 
}: PropertySelectionStepProps) {
  const { toast } = useToast();
  const [isCreatingInspection, setIsCreatingInspection] = useState(false);

  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [zipFilter, setZipFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [availableZips, setAvailableZips] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('roofs')
          .select(`
            id,
            property_name,
            address,
            city,
            state,
            zip,
            roof_area,
            property_manager_name,
            property_manager_email
          `)
          .order('property_name');

        if (error) throw error;

        setProperties(data || []);
        
        // Extract unique values for filters
        const zips = [...new Set(data?.map(p => p.zip).filter(Boolean))].sort();
        const cities = [...new Set(data?.map(p => p.city).filter(Boolean))].sort();
        
        setAvailableZips(zips);
        setAvailableCities(cities);
        
      } catch (error) {
        console.error('Error fetching properties:', error);
        toast({
          title: "Error",
          description: "Failed to load properties",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchProperties();
    }
  }, [open, toast]);

  // Filter properties
  useEffect(() => {
    let filtered = properties;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(property =>
        property.property_name.toLowerCase().includes(term) ||
        property.address.toLowerCase().includes(term) ||
        property.city.toLowerCase().includes(term)
      );
    }

    if (zipFilter && zipFilter !== 'all') {
      filtered = filtered.filter(property => property.zip === zipFilter);
    }

    if (cityFilter && cityFilter !== 'all') {
      filtered = filtered.filter(property => property.city === cityFilter);
    }

    setFilteredProperties(filtered);
  }, [properties, searchTerm, zipFilter, cityFilter]);

  const handleSelectAll = () => {
    setSelectedProperties([...filteredProperties]);
  };

  const handleDeselectAll = () => {
    setSelectedProperties([]);
  };

  const handlePropertyToggle = (property: Property) => {
    setSelectedProperties(prev => {
      const isSelected = prev.some(p => p.id === property.id);
      if (isSelected) {
        return prev.filter(p => p.id !== property.id);
      } else {
        return [...prev, property];
      }
    });
  };

  const handleScheduleInspection = async () => {
    if (selectedProperties.length === 0) return;

    try {
      setIsCreatingInspection(true);
      
      // Combine notes with scheduled time and priority information
      const combinedNotes = [
        setupData.notes,
        setupData.scheduledTime ? `Scheduled Time: ${setupData.scheduledTime}` : '',
        setupData.priority ? `Priority: ${setupData.priority}` : ''
      ].filter(Boolean).join('\n');
      
      // Create inspection records for all selected properties
      const inspectionPromises = selectedProperties.map(property => 
        supabase
          .from('inspections')
          .insert({
            roof_id: property.id,
            inspector_id: setupData.inspectorId,
            scheduled_date: setupData.scheduledDate,
            priority: setupData.priority,
            inspection_type: setupData.inspectionType,
            status: 'scheduled',
            notes: combinedNotes
          })
      );

      const results = await Promise.all(inspectionPromises);
      
      // Check for errors with detailed logging
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Database errors encountered:', errors.map(err => err.error));
        throw new Error(`Failed to schedule ${errors.length} inspections: ${errors[0].error?.message || 'Unknown error'}`);
      }

      toast({
        title: "Inspections Scheduled",
        description: `${selectedProperties.length} inspection${selectedProperties.length > 1 ? 's' : ''} scheduled for ${setupData.scheduledDate}`,
      });

      onInspectionScheduled();
      
    } catch (error) {
      console.error('Error scheduling inspections:', error);
      toast({
        title: "Error",
        description: `Failed to schedule inspections: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsCreatingInspection(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Schedule Direct Inspection - Step 2 of 2
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-hidden">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Find Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Property name or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>City</Label>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All cities</SelectItem>
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Select value={zipFilter} onValueChange={setZipFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All ZIP codes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ZIP codes</SelectItem>
                      {availableZips.map((zip) => (
                        <SelectItem key={zip} value={zip}>{zip}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property List */}
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Select Properties ({selectedProperties.length} of {filteredProperties.length} selected)
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={filteredProperties.length === 0 || selectedProperties.length === filteredProperties.length}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={selectedProperties.length === 0}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {loading ? (
                    <p className="text-center text-muted-foreground py-8">Loading properties...</p>
                  ) : filteredProperties.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No properties found</p>
                  ) : (
                    filteredProperties.map((property) => {
                      const isSelected = selectedProperties.some(p => p.id === property.id);
                      return (
                        <Card
                          key={property.id}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-muted/50",
                            isSelected && "ring-2 ring-primary bg-muted"
                          )}
                          onClick={() => handlePropertyToggle(property)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handlePropertyToggle(property)}
                                    className="rounded border-border"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <h4 className="font-medium">{property.property_name}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 ml-6">
                                  <MapPin className="h-3 w-3" />
                                  {property.address}, {property.city}, {property.state} {property.zip}
                                </p>
                                {property.roof_area && (
                                  <p className="text-sm text-muted-foreground ml-6">
                                    {property.roof_area.toLocaleString()} sq ft
                                  </p>
                                )}
                              </div>
                              {isSelected && (
                                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
                {/* Add bottom padding to ensure content doesn't get cut off */}
                <div className="h-4"></div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 mt-4 border-t bg-background flex-shrink-0 relative z-10">
            <Button 
              variant="outline" 
              onClick={onBack} 
              className="flex items-center gap-2 px-6 py-3"
              size="lg"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <Button 
              onClick={handleScheduleInspection}
              disabled={selectedProperties.length === 0 || isCreatingInspection}
              className="px-6 py-3"
              size="lg"
            >
              {isCreatingInspection 
                ? 'Scheduling...' 
                : `Schedule ${selectedProperties.length} Inspection${selectedProperties.length > 1 ? 's' : ''}`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}