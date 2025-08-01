import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Move,
  CheckCircle,
  AlertCircle,
  Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoofLayer {
  id: string;
  layer: string;
  description: string;
  material: string;
  thickness: string;
  attachment: string;
  manufacturer?: string;
  model?: string;
  color?: string;
}

interface RoofCompositionData {
  layers: RoofLayer[];
  roofSystem: string;
  systemDescription: string;
  installationYear: number;
  originalType: string;
  hasRecover: boolean;
  recoverType?: string;
  recoverYear?: number;
  manufacturer?: string;
  warranty?: string;
  warrantyExpiration?: string;
}

interface RoofCompositionCaptureProps {
  initialData?: Partial<RoofCompositionData>;
  onDataChange: (data: RoofCompositionData) => void;
  isTablet?: boolean;
}

// Professional roof material catalogs
const ROOF_SYSTEMS = [
  'TPO (Thermoplastic Polyolefin)',
  'EPDM (Ethylene Propylene Diene Monomer)',
  'Modified Bitumen',
  'Built-Up Roof (BUR)',
  'PVC (Polyvinyl Chloride)',
  'Metal Roofing',
  'Spray Polyurethane Foam (SPF)',
  'Liquid Applied Membrane',
  'Green Roof System',
  'Ballasted System'
];

const MEMBRANE_MATERIALS = [
  'TPO - White',
  'TPO - Gray', 
  'TPO - Tan',
  'EPDM - Black',
  'EPDM - White',
  'PVC - White',
  'PVC - Gray',
  'Modified Bitumen - Granulated',
  'Modified Bitumen - Smooth',
  'BUR - Gravel',
  'BUR - Smooth',
  'Metal - Standing Seam',
  'Metal - Corrugated',
  'SPF - Elastomeric Coating'
];

const INSULATION_MATERIALS = [
  'Polyisocyanurate (Polyiso)',
  'Expanded Polystyrene (EPS)',
  'Extruded Polystyrene (XPS)',
  'Mineral Wool',
  'Perlite',
  'Gypsum',
  'Wood Fiber',
  'Fiberglass',
  'Cellular Glass',
  'Phenolic Foam'
];

const DECK_MATERIALS = [
  'Steel Deck - Corrugated',
  'Steel Deck - Fluted',
  'Concrete - Structural',
  'Concrete - Lightweight',
  'Wood Plank',
  'Plywood',
  'OSB (Oriented Strand Board)',
  'Gypsum Plank',
  'Cementitious Wood Fiber',
  'Precast Concrete'
];

const ATTACHMENT_METHODS = [
  'Fully Adhered',
  'Mechanically Attached',
  'Ballasted',
  'Self-Adhering',
  'Heat Welded',
  'Solvent Welded',
  'Torched',
  'Nailed',
  'Screwed',
  'Clipped'
];

const THICKNESS_OPTIONS = [
  '15 mil', '20 mil', '30 mil', '45 mil', '60 mil', '80 mil',
  '1/8"', '1/4"', '3/8"', '1/2"', '5/8"', '3/4"', '1"',
  '1.5"', '2"', '2.5"', '3"', '3.5"', '4"', '4.5"', '5"', '6"'
];

const DEFAULT_LAYERS = [
  { 
    layer: 'Membrane', 
    materials: MEMBRANE_MATERIALS,
    defaultThickness: '60 mil',
    defaultAttachment: 'Fully Adhered'
  },
  { 
    layer: 'Insulation', 
    materials: INSULATION_MATERIALS,
    defaultThickness: '3"',
    defaultAttachment: 'Mechanically Attached'
  },
  { 
    layer: 'Deck', 
    materials: DECK_MATERIALS,
    defaultThickness: '22 ga',
    defaultAttachment: 'Structural'
  }
];

export function RoofCompositionCapture({ 
  initialData, 
  onDataChange, 
  isTablet = false 
}: RoofCompositionCaptureProps) {
  const { toast } = useToast();
  
  const [compositionData, setCompositionData] = useState<RoofCompositionData>({
    layers: [],
    roofSystem: '',
    systemDescription: '',
    installationYear: new Date().getFullYear() - 5,
    originalType: '',
    hasRecover: false,
    ...initialData
  });

  const [editingLayer, setEditingLayer] = useState<string | null>(null);

  // Initialize with default layers if none exist
  useEffect(() => {
    if (compositionData.layers.length === 0) {
      const defaultLayers: RoofLayer[] = DEFAULT_LAYERS.map((layerDef, index) => ({
        id: `layer-${Date.now()}-${index}`,
        layer: layerDef.layer,
        description: '',
        material: '',
        thickness: layerDef.defaultThickness,
        attachment: layerDef.defaultAttachment
      }));
      
      setCompositionData(prev => ({
        ...prev,
        layers: defaultLayers
      }));
    }
  }, []);

  // Notify parent of data changes
  useEffect(() => {
    onDataChange(compositionData);
  }, [compositionData, onDataChange]);

  const updateLayer = (layerId: string, updates: Partial<RoofLayer>) => {
    setCompositionData(prev => ({
      ...prev,
      layers: prev.layers.map(layer => 
        layer.id === layerId ? { ...layer, ...updates } : layer
      )
    }));
  };

  const addLayer = () => {
    const newLayer: RoofLayer = {
      id: `layer-${Date.now()}`,
      layer: 'Additional Layer',
      description: '',
      material: '',
      thickness: '',
      attachment: 'Mechanically Attached'
    };
    
    setCompositionData(prev => ({
      ...prev,
      layers: [...prev.layers, newLayer]
    }));
    
    setEditingLayer(newLayer.id);
  };

  const removeLayer = (layerId: string) => {
    setCompositionData(prev => ({
      ...prev,
      layers: prev.layers.filter(layer => layer.id !== layerId)
    }));
    
    toast({
      title: "Layer Removed",
      description: "Roof layer has been removed from the composition"
    });
  };

  const moveLayer = (layerId: string, direction: 'up' | 'down') => {
    setCompositionData(prev => {
      const layers = [...prev.layers];
      const index = layers.findIndex(layer => layer.id === layerId);
      
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= layers.length) return prev;
      
      [layers[index], layers[newIndex]] = [layers[newIndex], layers[index]];
      
      return { ...prev, layers };
    });
  };

  const getMaterialsForLayer = (layerType: string) => {
    switch (layerType.toLowerCase()) {
      case 'membrane':
        return MEMBRANE_MATERIALS;
      case 'insulation':
        return INSULATION_MATERIALS;
      case 'deck':
        return DECK_MATERIALS;
      default:
        return [...MEMBRANE_MATERIALS, ...INSULATION_MATERIALS, ...DECK_MATERIALS];
    }
  };

  const getLayerIcon = (layerType: string) => {
    switch (layerType.toLowerCase()) {
      case 'membrane':
        return '🛡️';
      case 'insulation':
        return '🏠';
      case 'deck':
        return '🏗️';
      default:
        return '📄';
    }
  };

  const validateComposition = () => {
    const hasMembrane = compositionData.layers.some(layer => 
      layer.layer.toLowerCase().includes('membrane')
    );
    const hasDeck = compositionData.layers.some(layer => 
      layer.layer.toLowerCase().includes('deck')
    );
    
    return hasMembrane && hasDeck;
  };

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isTablet ? 'text-2xl' : 'text-xl'}`}>
            <Layers className={isTablet ? 'h-7 w-7' : 'h-6 w-6'} />
            Roof System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={isTablet ? 'text-base' : 'text-sm'}>Primary Roof System *</Label>
              <Select 
                value={compositionData.roofSystem} 
                onValueChange={(value) => setCompositionData(prev => ({ ...prev, roofSystem: value }))}
              >
                <SelectTrigger className={isTablet ? 'h-12 text-base' : 'h-10'}>
                  <SelectValue placeholder="Select roof system type" />
                </SelectTrigger>
                <SelectContent>
                  {ROOF_SYSTEMS.map(system => (
                    <SelectItem key={system} value={system}>{system}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className={isTablet ? 'text-base' : 'text-sm'}>Installation Year</Label>
              <Input
                type="number"
                value={compositionData.installationYear}
                onChange={(e) => setCompositionData(prev => ({ 
                  ...prev, 
                  installationYear: parseInt(e.target.value) || new Date().getFullYear() 
                }))}
                className={isTablet ? 'h-12 text-base' : 'h-10'}
                min="1970"
                max={new Date().getFullYear()}
              />
            </div>
          </div>

          <div>
            <Label className={isTablet ? 'text-base' : 'text-sm'}>System Description</Label>
            <Input
              value={compositionData.systemDescription}
              onChange={(e) => setCompositionData(prev => ({ ...prev, systemDescription: e.target.value }))}
              className={isTablet ? 'h-12 text-base' : 'h-10'}
              placeholder="e.g., 60 mil TPO fully adhered system"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={compositionData.hasRecover}
                onChange={(e) => setCompositionData(prev => ({ ...prev, hasRecover: e.target.checked }))}
                className={isTablet ? 'w-5 h-5' : 'w-4 h-4'}
              />
              <span className={isTablet ? 'text-base' : 'text-sm'}>Has Recover System</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Layer Assembly */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={isTablet ? 'text-xl' : 'text-lg'}>
              Roof Assembly Layers ({compositionData.layers.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              {validateComposition() ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Valid Assembly
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Incomplete
                </Badge>
              )}
              <Button 
                onClick={addLayer} 
                size={isTablet ? "default" : "sm"}
                className={isTablet ? 'h-10' : 'h-8'}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Layer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {compositionData.layers.map((layer, index) => (
              <Card key={layer.id} className="border-l-4 border-l-blue-500">
                <CardContent className={`${isTablet ? 'p-6' : 'p-4'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getLayerIcon(layer.layer)}</span>
                      <div>
                        <h4 className={`font-semibold ${isTablet ? 'text-lg' : 'text-base'}`}>
                          {layer.layer}
                        </h4>
                        <p className={`text-muted-foreground ${isTablet ? 'text-sm' : 'text-xs'}`}>
                          Layer {index + 1}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveLayer(layer.id, 'up')}
                        disabled={index === 0}
                      >
                        <Move className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingLayer(editingLayer === layer.id ? null : layer.id)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLayer(layer.id)}
                        disabled={compositionData.layers.length <= 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {editingLayer === layer.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className={isTablet ? 'text-base' : 'text-sm'}>Material Type</Label>
                        <Select 
                          value={layer.material} 
                          onValueChange={(value) => updateLayer(layer.id, { material: value })}
                        >
                          <SelectTrigger className={isTablet ? 'h-11' : 'h-9'}>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {getMaterialsForLayer(layer.layer).map(material => (
                              <SelectItem key={material} value={material}>{material}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className={isTablet ? 'text-base' : 'text-sm'}>Thickness</Label>
                        <Select 
                          value={layer.thickness} 
                          onValueChange={(value) => updateLayer(layer.id, { thickness: value })}
                        >
                          <SelectTrigger className={isTablet ? 'h-11' : 'h-9'}>
                            <SelectValue placeholder="Select thickness" />
                          </SelectTrigger>
                          <SelectContent>
                            {THICKNESS_OPTIONS.map(thickness => (
                              <SelectItem key={thickness} value={thickness}>{thickness}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className={isTablet ? 'text-base' : 'text-sm'}>Attachment Method</Label>
                        <Select 
                          value={layer.attachment} 
                          onValueChange={(value) => updateLayer(layer.id, { attachment: value })}
                        >
                          <SelectTrigger className={isTablet ? 'h-11' : 'h-9'}>
                            <SelectValue placeholder="Select attachment" />
                          </SelectTrigger>
                          <SelectContent>
                            {ATTACHMENT_METHODS.map(method => (
                              <SelectItem key={method} value={method}>{method}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className={isTablet ? 'text-base' : 'text-sm'}>Description (Optional)</Label>
                        <Input
                          value={layer.description}
                          onChange={(e) => updateLayer(layer.id, { description: e.target.value })}
                          className={isTablet ? 'h-11' : 'h-9'}
                          placeholder="Additional details..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={`grid grid-cols-3 gap-4 ${isTablet ? 'text-base' : 'text-sm'}`}>
                      <div>
                        <span className="text-muted-foreground">Material:</span>
                        <p className="font-medium">{layer.material || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Thickness:</span>
                        <p className="font-medium">{layer.thickness || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Attachment:</span>
                        <p className="font-medium">{layer.attachment || 'Not specified'}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}