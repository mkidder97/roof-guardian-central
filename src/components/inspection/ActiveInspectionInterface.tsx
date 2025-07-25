import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StreamlinedInspectionInterface } from "@/components/inspector/StreamlinedInspectionInterface";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/lib/offline-storage";
import { useSyncService } from "@/lib/sync-service";
import {
  Home,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Battery,
  ArrowLeft,
  Settings,
  Upload,
  Phone
} from "lucide-react";
import { cn } from '@/lib/utils';

interface ActiveInspectionProps {
  propertyId: string;
  propertyName: string;
  onComplete: (inspectionData: any) => void;
  onCancel: () => void;
}

export function ActiveInspectionInterface({ 
  propertyId, 
  propertyName, 
  onComplete, 
  onCancel 
}: ActiveInspectionProps) {
  const { toast } = useToast();
  const { saveInspection, syncInspections } = useOfflineStorage();
  const { isOnline, queuedActions } = useSyncService();
  
  const [inspectionData, setInspectionData] = useState<any>(null);

  // Mock project info - in real app this would come from API
  const mockProjectInfo = {
    propertyName,
    address: "3535 North Houston School Road, Lancaster, TX 75134",
    roofArea: 896352,
    yearInstalled: 2003,
    roofSystem: "BUR with gravel",
    propertyManager: {
      name: "Michael Johnson",
      phone: "(555) 123-4567",
      email: "michael.johnson@property.com"
    },
    accessInfo: {
      location: "N Riser Room - Code 0152 - Key box is on stair well",
      requirements: "Interior ladder/hatch",
      safetyNotes: "Check overhead clearance before accessing roof"
    },
    criticalAreas: [
      {
        location: "Drainage system",
        issue: "Routine drainage inspection - Reported 1 times",
        severity: 'medium' as const,
        estimatedCost: 2000
      },
      {
        location: "Northwest corner",
        issue: "Recurring leak area needs immediate attention",
        severity: 'high' as const,
        estimatedCost: 12500
      },
      {
        location: "HVAC penetrations",
        issue: "Sealant failure around multiple units",
        severity: 'medium' as const,
        estimatedCost: 3500
      }
    ]
  };

  const handleCompleteInspection = async (data: any) => {
    try {
      // Save to offline storage first
      await saveInspection(data);
      
      // Try to sync if online
      if (isOnline) {
        await syncInspections();
      }
      
      toast({
        title: "Inspection Complete",
        description: isOnline ? "Saved and synced successfully" : "Saved offline, will sync when online",
      });
      
      onComplete(data);
    } catch (error) {
      console.error('Error saving inspection:', error);
      toast({
        title: "Save Error",
        description: "Failed to save inspection data",
        variant: "destructive"
      });
    }
  };

  return (
    <StreamlinedInspectionInterface
      projectInfo={mockProjectInfo}
      onComplete={handleCompleteInspection}
      onCancel={onCancel}
    />
  );
}