import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Calendar, CheckCircle, X, FileDown, Filter, MapPin, AlertCircle, User, Clock, Zap } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { DirectInspectionWizard } from './DirectInspectionWizard';
import { format } from 'date-fns';
import type { InspectionStatus, InspectionType, InspectionPriority, DirectInspectionData, InspectionItem } from '@/types/inspection';
import { useN8nWorkflow, type CampaignWorkflowData, type ProcessingResult } from '@/hooks/useN8nWorkflow';
import { useInspectors, type Inspector } from '@/hooks/useInspectors';
import { useUnifiedInspectionEvents, useInspectionEventEmitter } from '@/hooks/useUnifiedInspectionEvents';
// Optional monitoring imports - only imported when needed to prevent React context errors
const usePerformanceMonitor = null;
const useOperationTimer = null;
const ComponentHealthMonitor = null;
const useHealthReporting = null;
const useAutoRecovery = null;
const ErrorBoundary = null;
const monitoringService = null;

// Monitoring modules disabled to prevent runtime errors
console.log('🔍 DEBUG: Monitoring modules disabled for debugging')

interface Property {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  market: string;
  region: string;
  roof_type: string;
  roof_area: number;
  last_inspection_date: string | null;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  roof_access: string;
  latitude: number | null;
  longitude: number | null;
  manufacturer_warranty_expiration: string | null;
  installer_warranty_expiration: string | null;
  client_id: string;
  status: string;
  clients?: {
    company_name: string;
  };
  property_contact_assignments?: Array<{
    assignment_type: string;
    is_active: boolean;
    client_contacts: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      office_phone: string;
      mobile_phone: string;
      role: string;
      title: string;
    };
  }>;
  property_manager_name?: string;
  property_manager_email?: string;
  property_manager_phone?: string;
  warranty_status?: string;
}

interface InspectionSchedulingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directMode?: boolean;
}

interface WorkflowProgress {
  isProcessing: boolean
  currentCampaign: string
  processedCount: number
  totalCount: number
  results: ProcessingResult[]
}

// Memoized PropertyListItem to prevent unnecessary re-renders
const PropertyListItem = memo(({ 
  property, 
  isSelected, 
  propertyInspector, 
  selectedInspector, 
  onPropertySelection,
  singleSelectMode = false,
  onDirectSelection
}: {
  property: Property;
  isSelected: boolean;
  propertyInspector?: Inspector;
  selectedInspector: Inspector | null;
  onPropertySelection?: (property: Property, checked: boolean) => void;
  singleSelectMode?: boolean;
  onDirectSelection?: (property: Property) => void;
}) => {
  const handleSelectionClick = () => {
    if (singleSelectMode && onDirectSelection) {
      onDirectSelection(property);
    }
  };

  return (
    <div 
      className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${
        singleSelectMode && isSelected ? 'border-blue-500 bg-blue-50' : ''
      }`}
      onClick={singleSelectMode ? handleSelectionClick : undefined}
    >
      {singleSelectMode ? (
        <div className="w-4 h-4 flex items-center justify-center">
          <div className={`w-3 h-3 rounded-full border-2 ${
            isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
          }`}>
            {isSelected && (
              <div className="w-full h-full bg-white rounded-full scale-50" />
            )}
          </div>
        </div>
      ) : (
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onPropertySelection?.(property, Boolean(checked))}
        />
      )}
      <div className="flex-1">
        <div className="font-medium">{property.property_name}</div>
        <div className="text-sm text-gray-600">
          {property.address}, {property.city}, {property.state}
        </div>
        <div className="text-xs text-gray-500">
          PM: {property.property_manager_name || 'Not assigned'} • Last Inspection: {property.last_inspection_date || 'Never'}
        </div>
        
        {/* Inspector Assignment Section */}
        {isSelected && !singleSelectMode && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Inspector:</span>
              <div className="flex items-center space-x-2">
                {propertyInspector ? (
                  <Badge variant="outline" className="text-xs">
                    Override: {propertyInspector.full_name}
                  </Badge>
                ) : selectedInspector ? (
                  <Badge variant="secondary" className="text-xs">
                    Default: {selectedInspector.full_name}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    No inspector selected
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">{property.roof_area?.toLocaleString() || 'N/A'} sq ft</div>
        {singleSelectMode && (
          <div className="text-xs text-gray-500 mt-1">
            {property.market} • {property.region}
          </div>
        )}
      </div>
    </div>
  );
});

export function InspectionSchedulingModal({ open, onOpenChange, directMode = false }: InspectionSchedulingModalProps) {
  const { toast } = useToast();
  const { processCampaignsBatch } = useN8nWorkflow();
  const { inspectors, loading: inspectorsLoading } = useInspectors();
  
  // Unified event system for real-time inspection synchronization
  const { inspectionLifecycle, dataSync } = useUnifiedInspectionEvents();
  const { emitInspectionCreated, emitDataRefresh } = useInspectionEventEmitter();
  
  // Enhanced monitoring and recovery - made optional to prevent React dispatcher errors
  const componentName = 'InspectionSchedulingModal';
  const [monitoringEnabled, setMonitoringEnabled] = useState(Boolean(useHealthReporting && useAutoRecovery));
  
  // Safely initialize monitoring hooks with try-catch
  let healthReporting = null;
  let autoRecovery = null;
  
  if (useHealthReporting && useAutoRecovery) {
    try {
      healthReporting = useHealthReporting(componentName);
      autoRecovery = useAutoRecovery(componentName, [
        {
          id: 'modal-performance-reset',
          name: 'Reset Modal Performance',
          description: 'Reset modal state when performance degrades',
          trigger: {
            performanceThreshold: 150, // 150ms render time
            consecutive: 2
          },
          action: 'reset',
          cooldown: 2,
          enabled: true,
          priority: 8
        },
        {
          id: 'modal-api-recovery',
          name: 'API Call Recovery',
          description: 'Reset when API calls fail consistently',
          trigger: {
            performanceThreshold: 10000, // 10 second API timeout
            consecutive: 3
          },
          action: 'reset',
          cooldown: 5,
          enabled: true,
          priority: 6
        }
      ]);
    } catch (error) {
      console.warn('Monitoring hooks failed to initialize:', error);
      setMonitoringEnabled(false);
      // Continue without monitoring
    }
  }
  
  // Safe destructuring with fallbacks
  const { reportApiCall, reportCustomMetric, updateHealthStatus } = healthReporting || {
    reportApiCall: () => {},
    reportCustomMetric: () => {},
    updateHealthStatus: () => {}
  };
  
  const { remountKey, triggerRecovery, getRecoveryHistory } = autoRecovery || {
    remountKey: 0,
    triggerRecovery: async () => false,
    getRecoveryHistory: () => []
  };
  
  // Performance monitoring with enhanced error reporting - made optional
  let performanceMonitor = null;
  let operationTimer = null;
  
  if (usePerformanceMonitor && useOperationTimer && monitoringEnabled) {
    try {
      performanceMonitor = usePerformanceMonitor({
        componentName,
        slowRenderThreshold: 50, // Allow up to 50ms for this complex component
        onSlowRender: (metrics) => {
          console.warn('InspectionSchedulingModal slow render:', metrics);
          
          // Report to monitoring service if available
          if (typeof monitoringService?.reportPerformanceMetric === 'function') {
            monitoringService.reportPerformanceMetric({
              id: `slow_render_${Date.now()}`,
              componentName,
              metricType: 'render',
              value: metrics.lastRenderTime,
              threshold: 50,
              timestamp: new Date().toISOString(),
              metadata: {
                renderCount: metrics.renderCount,
                averageTime: metrics.averageRenderTime,
                slowRenders: metrics.slowRenders
              }
            });
          }
          
          // Update health status if too many slow renders
          if (metrics.slowRenders > 5 && updateHealthStatus) {
            updateHealthStatus('degraded', [
              `${metrics.slowRenders} slow renders detected`,
              `Average render time: ${metrics.averageRenderTime.toFixed(1)}ms`
            ], {
              renderTime: metrics.averageRenderTime,
              errorRate: 0
            });
          }
        }
      });
      operationTimer = useOperationTimer();
    } catch (error) {
      console.warn('Performance monitoring failed to initialize:', error);
    }
  }
  
  // Safe destructuring with fallbacks
  const { resetMetrics } = performanceMonitor || { resetMetrics: () => {} };
  const { startTimer, endTimer } = operationTimer || {
    startTimer: () => {},
    endTimer: () => {}
  };
  
  const [properties, setProperties] = useState<Property[]>([]);
  // Removed filteredProperties state - now computed via useMemo
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [propertyCache, setPropertyCache] = useState<Map<string, Property[]>>(new Map());
  const [availableZipcodes, setAvailableZipcodes] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [filters, setFilters] = useState({
    clientId: 'all',
    region: 'all',
    market: 'all',
    inspectionType: 'annual',
    zipcodes: [] as string[]
  });

  // Separate filter state for Direct Mode
  const [directFilters, setDirectFilters] = useState({
    region: 'all',
    market: 'all',
    inspectionType: 'annual',
    zipcodes: [] as string[]
  });

  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress>({
    isProcessing: false,
    currentCampaign: '',
    processedCount: 0,
    totalCount: 0,
    results: []
  });

  const itemsPerPage = 50;

  // New inspector-related state
  const [selectedInspector, setSelectedInspector] = useState<Inspector | null>(null);
  const [propertyInspectorOverrides, setPropertyInspectorOverrides] = useState<Record<string, Inspector>>({});

  // Direct Inspection Mode state
  const [directInspectionMode, setDirectInspectionMode] = useState(directMode);
  const [directInspectionData, setDirectInspectionData] = useState({
    selectedProperty: null as Property | null,
    inspector: null as Inspector | null,
    scheduledDate: '',
    scheduledTime: '',
    inspectionType: 'routine' as 'routine' | 'emergency' | 'follow-up',
    priority: 'medium' as 'low' | 'medium' | 'high',
    notes: ''
  });

  // Direct Mode specific state
  const [directSearchTerm, setDirectSearchTerm] = useState('');
  const [directCurrentPage, setDirectCurrentPage] = useState(1);
  const [directProperties, setDirectProperties] = useState<Property[]>([]);
  const [directLoading, setDirectLoading] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Optimized effect - only depend on open state
  useEffect(() => {
    if (open) {
      resetModalState();
      fetchProperties();
    }
  }, [open]);

  // Separate effect for filter changes to avoid duplicate fetches
  useEffect(() => {
    if (open && !directInspectionMode) {
      startTimer('fetchPropertiesWithFilters');
      fetchProperties();
      endTimer('fetchPropertiesWithFilters');
      
      startTimer('fetchZipcodes');
      fetchAvailableZipcodes();
      endTimer('fetchZipcodes');
    }
  }, [filters.zipcodes, filters.region, filters.market, directInspectionMode]); // Remove function dependencies

  // Separate effect for Direct Mode filter changes
  useEffect(() => {
    if (open && directInspectionMode) {
      startTimer('fetchDirectPropertiesWithFilters');
      fetchDirectProperties();
      endTimer('fetchDirectPropertiesWithFilters');
      
      startTimer('fetchDirectZipcodes');
      fetchAvailableZipcodes();
      endTimer('fetchDirectZipcodes');
    }
  }, [directFilters.zipcodes, directFilters.region, directFilters.market, directInspectionMode]);

  // Memoized filtered properties computation
  const filteredProperties = useMemo(() => {
    startTimer('filterProperties');
    const searchLower = searchTerm.toLowerCase();
    const filtered = properties.filter(property => {
      return (
        property.property_name.toLowerCase().includes(searchLower) ||
        property.address.toLowerCase().includes(searchLower) ||
        property.city.toLowerCase().includes(searchLower) ||
        property.market.toLowerCase().includes(searchLower) ||
        property.region.toLowerCase().includes(searchLower) ||
        (property.property_manager_name && property.property_manager_name.toLowerCase().includes(searchLower))
      );
    });
    endTimer('filterProperties');
    return filtered;
  }, [properties, searchTerm, startTimer, endTimer]);

  // Memoized filtered direct properties computation
  const filteredDirectProperties = useMemo(() => {
    startTimer('filterDirectProperties');
    const searchLower = directSearchTerm.toLowerCase();
    const filtered = directProperties.filter(property => {
      return (
        property.property_name.toLowerCase().includes(searchLower) ||
        property.address.toLowerCase().includes(searchLower) ||
        property.city.toLowerCase().includes(searchLower) ||
        property.market.toLowerCase().includes(searchLower) ||
        property.region.toLowerCase().includes(searchLower) ||
        (property.property_manager_name && property.property_manager_name.toLowerCase().includes(searchLower))
      );
    });
    endTimer('filterDirectProperties');
    return filtered;
  }, [directProperties, directSearchTerm, startTimer, endTimer]);
  
  // Update current page when filtered properties change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProperties]);

  // Update direct mode current page when filtered properties change
  useEffect(() => {
    setDirectCurrentPage(1);
  }, [directProperties, directSearchTerm]);

  // Set default inspector (Michael Kidder) when inspectors load
  useEffect(() => {
    if (inspectors.length > 0 && !selectedInspector) {
      const defaultInspector = inspectors.find(inspector => 
        inspector.email === 'mkidder@southernroof.biz'
      ) || inspectors[0]; // Fallback to first inspector if Michael not found
      
      setSelectedInspector(defaultInspector);
    }
  }, [inspectors, selectedInspector]);

  // Separate useEffect for direct inspection mode default inspector
  useEffect(() => {
    if (directInspectionMode && !directInspectionData.inspector && selectedInspector) {
      setDirectInspectionData(prev => ({ ...prev, inspector: selectedInspector }));
    }
  }, [directInspectionMode, directInspectionData.inspector, selectedInspector]);

  const getWarrantyStatus = useCallback((expirationDate: string | null): string => {
    if (!expirationDate) return 'none';
    const expiry = new Date(expirationDate);
    const now = new Date();
    const monthsUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsUntilExpiry < 0) return 'expired';
    if (monthsUntilExpiry <= 12) return 'expiring';
    return 'active';
  }, []);

  const processPropertyData = useCallback((rawProperties: any[]): Property[] => {
    return rawProperties.map(property => {
      const propertyManager = property.property_contact_assignments?.find(
        assignment => assignment.assignment_type === 'property_manager' && assignment.is_active
      )?.client_contacts;
      
      const pmName = propertyManager 
        ? `${propertyManager.first_name} ${propertyManager.last_name}`
        : property.property_manager_name || 'Not assigned';
      
      const pmEmail = propertyManager?.email || property.property_manager_email || '';
      const pmPhone = propertyManager?.office_phone || propertyManager?.mobile_phone || property.property_manager_phone || '';
      
      return {
        ...property,
        property_manager_name: pmName,
        property_manager_email: pmEmail,
        property_manager_phone: pmPhone,
        warranty_status: getWarrantyStatus(property.manufacturer_warranty_expiration)
      };
    });
  }, [getWarrantyStatus]);

  const fetchAvailableZipcodes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('roofs')
        .select('zip')
        .eq('status', 'active')
        .neq('is_deleted', true)
        .not('zip', 'is', null)
        .order('zip');

      if (error) throw error;

      const uniqueZipcodes = [...new Set(data?.map(item => item.zip))].filter(Boolean);
      setAvailableZipcodes(uniqueZipcodes);
    } catch (error) {
      console.error('Error fetching zipcodes:', error);
    }
  }, []);

  const fetchProperties = useCallback(async () => {
    const cacheKey = `${filters.clientId}-${filters.region}-${filters.market}-${filters.zipcodes.join(',')}`;
    
    if (propertyCache.has(cacheKey)) {
      const cachedProperties = propertyCache.get(cacheKey)!;
      setProperties(cachedProperties);
      return;
    }

    setLoading(true);
    const apiStartTime = performance.now();
    console.log('Fetching properties with filters:', filters);
    
    try {
      let query = supabase
        .from('roofs')
        .select(`
          id,
          property_name,
          address,
          city,
          state,
          zip,
          market,
          region,
          roof_type,
          roof_area,
          last_inspection_date,
          site_contact_name,
          site_contact_phone,
          roof_access,
          latitude,
          longitude,
          manufacturer_warranty_expiration,
          installer_warranty_expiration,
          client_id,
          status,
          property_manager_name,
          property_manager_email,
          property_manager_phone,
          clients!inner(company_name),
          property_contact_assignments!left(
            assignment_type,
            is_active,
            client_contacts!left(
              id,
              first_name,
              last_name,
              email,
              office_phone,
              mobile_phone,
              role,
              title
            )
          )
        `)
        .eq('status', 'active')
        .neq('is_deleted', true);

      if (filters.clientId !== 'all') {
        query = query.eq('client_id', filters.clientId);
      }
      
      if (filters.region !== 'all') {
        console.log('Filtering by region:', filters.region);
        query = query.eq('region', filters.region);
      }
      
      if (filters.market !== 'all') {
        console.log('Filtering by market:', filters.market);
        query = query.eq('market', filters.market);
      }
      
      if (filters.zipcodes.length > 0) {
        console.log('Filtering by zipcodes:', filters.zipcodes);
        query = query.in('zip', filters.zipcodes);
      }

      const { data, error } = await query;
      const apiEndTime = performance.now();
      const apiDuration = apiEndTime - apiStartTime;
      
      // Report API performance if monitoring enabled
      if (monitoringEnabled && reportApiCall) {
        try {
          reportApiCall(apiDuration);
        } catch (error) {
          console.warn('Failed to report API call:', error);
        }
      }
      
      console.log('Query result:', { data: data?.length || 0, error, duration: `${apiDuration.toFixed(1)}ms` });

      if (error) {
        // Report API error if monitoring enabled
        if (monitoringEnabled && typeof monitoringService?.reportError === 'function') {
          try {
            monitoringService.reportError({
              id: `api_error_${Date.now()}`,
              message: `Properties fetch failed: ${error.message}`,
              stack: error.stack || '',
              componentStack: '',
              componentName,
              level: 'component',
              timestamp: new Date().toISOString(),
              retryCount: 0,
              url: window.location.href,
              userAgent: navigator.userAgent,
              additionalInfo: {
                apiDuration,
                filters,
                errorCode: error.code
              }
            });
          } catch (monitoringError) {
            console.warn('Failed to report error to monitoring service:', monitoringError);
          }
        }
        throw error;
      }

      const processedProperties: Property[] = processPropertyData(data || []);
      const finalProperties = processedProperties;

      setProperties(finalProperties);
      setPropertyCache(prev => new Map(prev.set(cacheKey, finalProperties)));
      
      // Report successful operation if monitoring enabled
      if (monitoringEnabled && reportCustomMetric) {
        try {
          reportCustomMetric('properties_loaded', finalProperties.length, {
            apiDuration,
            cacheKey,
            filters
          });
        } catch (error) {
          console.warn('Failed to report custom metric:', error);
        }
      }
      
      // Update health status if monitoring enabled
      if (monitoringEnabled && updateHealthStatus) {
        try {
          updateHealthStatus('healthy', [], {
            renderTime: 0,
            errorRate: 0,
            apiResponseTime: apiDuration,
            lastOperation: 'fetchProperties'
          });
        } catch (error) {
          console.warn('Failed to update health status:', error);
        }
      }
      
    } catch (error) {
      console.error('Error fetching properties:', error);
      
      // Update health status on error if monitoring enabled
      if (monitoringEnabled && updateHealthStatus) {
        try {
          updateHealthStatus('degraded', [
            `Properties fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          ], {
            renderTime: 0,
            errorRate: 0.1,
            apiResponseTime: performance.now() - apiStartTime
          });
        } catch (monitoringError) {
          console.warn('Failed to update health status on error:', monitoringError);
        }
      }
      
      toast({
        title: "Error",
        description: "Failed to fetch properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters.clientId, filters.region, filters.market, filters.zipcodes, propertyCache, toast, processPropertyData]);

  const fetchDirectProperties = useCallback(async () => {
    const cacheKey = `direct-all-${directFilters.region}-${directFilters.market}-${directFilters.zipcodes.join(',')}`;
    
    if (propertyCache.has(cacheKey)) {
      const cachedProperties = propertyCache.get(cacheKey)!;
      setDirectProperties(cachedProperties);
      return;
    }

    setDirectLoading(true);
    const apiStartTime = performance.now();
    console.log('Fetching direct properties with filters:', directFilters);
    
    try {
      let query = supabase
        .from('roofs')
        .select(`
          id,
          property_name,
          address,
          city,
          state,
          zip,
          market,
          region,
          roof_type,
          roof_area,
          last_inspection_date,
          site_contact_name,
          site_contact_phone,
          roof_access,
          latitude,
          longitude,
          manufacturer_warranty_expiration,
          installer_warranty_expiration,
          client_id,
          status,
          property_manager_name,
          property_manager_email,
          property_manager_phone,
          clients!inner(company_name),
          property_contact_assignments!left(
            assignment_type,
            is_active,
            client_contacts!left(
              id,
              first_name,
              last_name,
              email,
              office_phone,
              mobile_phone,
              role,
              title
            )
          )
        `)
        .eq('status', 'active')
        .neq('is_deleted', true);

      if (directFilters.region !== 'all') {
        console.log('Filtering by region:', directFilters.region);
        query = query.eq('region', directFilters.region);
      }
      
      if (directFilters.market !== 'all') {
        console.log('Filtering by market:', directFilters.market);
        query = query.eq('market', directFilters.market);
      }
      
      if (directFilters.zipcodes.length > 0) {
        console.log('Filtering by zipcodes:', directFilters.zipcodes);
        query = query.in('zip', directFilters.zipcodes);
      }

      const { data, error } = await query;
      const apiEndTime = performance.now();
      const apiDuration = apiEndTime - apiStartTime;
      
      console.log('Direct query result:', { data: data?.length || 0, error, duration: `${apiDuration.toFixed(1)}ms` });

      if (error) {
        throw error;
      }

      const processedProperties: Property[] = processPropertyData(data || []);
      setDirectProperties(processedProperties);
      setPropertyCache(prev => new Map(prev.set(cacheKey, processedProperties)));
      
    } catch (error) {
      console.error('Error fetching direct properties:', error);
      toast({
        title: "Error",
        description: "Failed to fetch properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDirectLoading(false);
    }
  }, [directFilters.region, directFilters.market, directFilters.zipcodes, propertyCache, toast, processPropertyData]);

  const resetModalState = useCallback(() => {
    setSelectedProperties([]);
    setSearchTerm('');
    setCurrentPage(1);
    setSelectedInspector(null);
    setPropertyInspectorOverrides({});
    setDirectInspectionMode(false);
    setDirectInspectionData({
      selectedProperty: null,
      inspector: null,
      scheduledDate: '',
      scheduledTime: '',
      inspectionType: 'routine',
      priority: 'medium',
      notes: ''
    });
    // Reset Direct Mode state
    setDirectSearchTerm('');
    setDirectCurrentPage(1);
    setDirectProperties([]);
    setDirectFilters({
      region: 'all',
      market: 'all',
      inspectionType: 'annual',
      zipcodes: []
    });
    setWorkflowProgress({
      isProcessing: false,
      currentCampaign: '',
      processedCount: 0,
      totalCount: 0,
      results: []
    });
  }, []);

  const generateCampaignName = useCallback(async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .rpc('generate_campaign_name', {
          p_market: filters.market === 'all' ? 'Multi-Market' : filters.market,
          p_inspection_type: filters.inspectionType,
          p_total_properties: selectedProperties.length
        });
      
      if (error) {
        console.warn('Campaign name RPC function failed, using fallback:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error generating campaign name:', error);
      const market = filters.market === 'all' ? 'Multi-Market' : filters.market;
      const type = filters.inspectionType.charAt(0).toUpperCase() + filters.inspectionType.slice(1);
      const date = format(new Date(), 'MM/dd/yyyy');
      return `${market} - ${type} Campaign - ${selectedProperties.length} Properties (${date})`;
    }
  }, [filters.market, filters.inspectionType, selectedProperties.length]);

  const generateCampaignId = useCallback(async (): Promise<string> => {
    try {
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
      return `CAMP-${timestamp}-${randomPart}`;
    } catch (error) {
      console.error('Error generating campaign ID:', error);
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
      return `CAMP-${timestamp}-${randomPart}`;
    }
  }, []);

  const handleCreateDirectInspection = useCallback(async () => {
    startTimer('createDirectInspection');
    const { selectedProperty, inspector, scheduledDate, scheduledTime, inspectionType, priority, notes } = directInspectionData;

    if (!selectedProperty) {
      toast({
        title: "No Property Selected",
        description: "Please select a property for direct inspection.",
        variant: "destructive",
      });
      return;
    }

    if (!inspector) {
      toast({
        title: "No Inspector Selected",
        description: "Please select an inspector for this inspection.",
        variant: "destructive",
      });
      return;
    }

    if (!scheduledDate) {
      toast({
        title: "No Date Selected",
        description: "Please select a scheduled date for the inspection.",
        variant: "destructive",
      });
      return;
    }

    try {
      setWorkflowProgress({
        isProcessing: true,
        currentCampaign: 'Creating direct inspection...',
        processedCount: 0,
        totalCount: 1,
        results: []
      });

      // Combine date and time for scheduled datetime
      const scheduledDateTime = scheduledTime 
        ? new Date(`${scheduledDate}T${scheduledTime}`)
        : new Date(`${scheduledDate}T09:00:00`);

      // Get current user for created_by field
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Create inspection record
      const { data: inspectionData, error: inspectionError } = await supabase
        .from('inspections')
        .insert({
          roof_id: selectedProperty.id,
          inspector_id: inspector.id, // Use public.users.id for proper foreign key relationship
          scheduled_date: scheduledDate,
          status: 'scheduled',
          inspection_type: inspectionType,
          priority: priority as InspectionPriority,
          notes: notes || `Direct inspection scheduled for ${selectedProperty.property_name}`,
          created_by: user.user.id,
          created_via: 'direct' // Mark as direct-mode creation
        })
        .select()
        .single();

      if (inspectionError) throw inspectionError;

      // Create inspection session with proper status
      const { data: sessionData, error: sessionError } = await supabase
        .from('inspection_sessions')
        .insert({
          property_id: selectedProperty.id,
          inspector_id: inspector.auth_user_id, // inspection_sessions uses auth.users.id
          inspection_status: 'scheduled',
          session_data: {
            inspectionType,
            priority,
            notes,
            scheduledDateTime: scheduledDateTime.toISOString(),
            directInspection: true,
            propertyName: selectedProperty.property_name,
            propertyAddress: `${selectedProperty.address}, ${selectedProperty.city}, ${selectedProperty.state}`
          },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Transform inspection data for unified event system
      const createdInspection = {
        ...inspectionData,
        priority: priority as InspectionPriority,
        roofs: {
          property_name: selectedProperty.property_name,
          address: selectedProperty.address,
          city: selectedProperty.city,
          state: selectedProperty.state
        },
        users: {
          first_name: inspector.full_name.split(' ')[0],
          last_name: inspector.full_name.split(' ').slice(1).join(' '),
          email: inspector.email
        },
        inspection_status: 'scheduled' as InspectionStatus
      };

      // Emit unified events for real-time synchronization
      emitInspectionCreated(createdInspection);
      
      // Sync building history for the property
      dataSync.syncBuildingHistory(selectedProperty.id);
      
      // Trigger data refresh for all components
      emitDataRefresh(['inspections_tab', 'inspection_history', 'inspector_interface']);

      setWorkflowProgress(prev => ({
        ...prev,
        isProcessing: false,
        processedCount: 1,
        results: [{
          success: true,
          attempts: 1,
          campaignData: {
            campaign_id: inspectionData.id,
            campaign_name: `Direct Inspection - ${selectedProperty.property_name}`,
            client_name: selectedProperty.clients?.company_name || 'Unknown Client',
            property_manager_email: selectedProperty.property_manager_email || '',
            region: selectedProperty.region,
            market: selectedProperty.market,
            inspector_id: inspector.id,
            inspector_name: inspector.full_name,
            inspector_email: inspector.email,
            properties: []
          }
        }]
      }));

      toast({
        title: "Direct Inspection Created Successfully!",
        description: `Inspection scheduled for ${selectedProperty.property_name} with ${inspector.full_name} on ${format(new Date(scheduledDate), 'MMM dd, yyyy')}.`,
      });

      // Reset form
      setDirectInspectionData({
        selectedProperty: null,
        inspector: null,
        scheduledDate: '',
        scheduledTime: '',
        inspectionType: 'routine',
        priority: 'medium',
        notes: ''
      });

    } catch (error) {
      console.error('Error creating direct inspection:', error);
      setWorkflowProgress(prev => ({
        ...prev,
        isProcessing: false
      }));
      
      toast({
        title: "Failed to Create Inspection",
        description: "An error occurred while creating the direct inspection. Please try again.",
        variant: "destructive",
      });
    }
    endTimer('createDirectInspection');
  }, [directInspectionData, toast, startTimer, endTimer]);

  // Create Supabase inspections for successful n8n campaigns
  const createInspectionsForSuccessfulCampaigns = useCallback(async (successfulResults: ProcessingResult[]) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const inspectionInserts = [];
      
      // Build inspection records from successful campaign results
      for (const result of successfulResults) {
        if (!result.campaignData) continue;
        
        for (const property of result.campaignData.properties) {
          // Use property-specific inspector override if available, otherwise use campaign default
          const propertyInspector = propertyInspectorOverrides[property.roof_id] || selectedInspector;
          if (!propertyInspector) continue;

          inspectionInserts.push({
            roof_id: property.roof_id,
            inspector_id: propertyInspector.id, // Use public.users.id instead of auth_user_id
            status: 'scheduled',
            inspection_type: filters.inspectionType || 'annual',
            created_by: user.user.id,
            created_via: 'n8n', // Mark as n8n-created
            scheduled_date: new Date().toISOString().split('T')[0], // Use today as placeholder
            notes: `Campaign: ${result.campaignData.campaign_name}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      if (inspectionInserts.length > 0) {
        console.log(`Creating ${inspectionInserts.length} Supabase inspections for successful campaigns`);
        
        const { data: insertedInspections, error: insertError } = await supabase
          .from('inspections')
          .insert(inspectionInserts)
          .select('id, roof_id, inspector_id');

        if (insertError) {
          console.error('Failed to create Supabase inspections:', insertError);
          
          // Show warning but don't fail the entire operation
          toast({
            title: "Warning: Inspection Records",
            description: `n8n campaigns created successfully, but failed to create ${inspectionInserts.length} inspection records in database. Inspectors may not see assignments immediately.`,
            variant: "destructive",
          });
          
          return;
        }

        console.log(`Successfully created ${insertedInspections?.length || 0} inspection records`);
        
        // Emit inspection creation events for each created inspection
        if (insertedInspections) {
          insertedInspections.forEach((inspection, index) => {
            const originalInsert = inspectionInserts[index];
            const inspector = propertyInspectorOverrides[originalInsert.roof_id] || selectedInspector;
            const property = selectedProperties.find(p => p.id === originalInsert.roof_id);
            
            if (inspector && property) {
              // Create a properly formatted inspection object for the event system
              const createdInspection = {
                ...inspection,
                scheduled_date: originalInsert.scheduled_date,
                completed_date: originalInsert.completed_date,
                status: originalInsert.status as InspectionStatus,
                inspection_type: originalInsert.inspection_type as InspectionType,
                notes: originalInsert.notes,
                weather_conditions: originalInsert.weather_conditions,
                roofs: {
                  property_name: property.property_name,
                  address: property.address,
                  city: property.city,
                  state: property.state
                },
                users: {
                  first_name: inspector.full_name.split(' ')[0],
                  last_name: inspector.full_name.split(' ').slice(1).join(' '),
                  email: inspector.email
                },
                created_at: originalInsert.created_at,
                updated_at: originalInsert.updated_at
              };

              emitInspectionCreated(createdInspection);
            }
          });
        }
      }

    } catch (error) {
      console.error('Error creating Supabase inspections for campaigns:', error);
      
      toast({
        title: "Warning: Database Integration",
        description: "Campaigns were created successfully, but there was an issue syncing with the inspector dashboard. Please contact support if inspections don't appear.",
        variant: "destructive",
      });
    }
  }, [propertyInspectorOverrides, selectedInspector, selectedProperties, filters.inspectionType, toast, emitInspectionCreated]);

  const handleStartWorkflow = useCallback(async () => {
    startTimer('startWorkflow');
    if (selectedProperties.length === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select at least one property for inspection.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedInspector) {
      toast({
        title: "No Inspector Selected",
        description: "Please select an inspector for this campaign.",
        variant: "destructive",
      });
      return;
    }

    // Group properties by property manager with enhanced validation
    const propertiesByManager = selectedProperties.reduce((groups, property) => {
      const pmEmail = property.property_manager_email;
      
      if (!pmEmail || pmEmail === 'Not assigned' || !pmEmail.includes('@') || !pmEmail.includes('.')) {
        console.warn(`Skipping property ${property.property_name} - invalid PM email: ${pmEmail}`);
        return groups;
      }
      
      if (!groups[pmEmail]) {
        groups[pmEmail] = [];
      }
      groups[pmEmail].push(property);
      return groups;
    }, {} as Record<string, Property[]>);

    const managerEmails = Object.keys(propertiesByManager);
    const skippedProperties = selectedProperties.length - Object.values(propertiesByManager).flat().length;
    
    console.log(`Properties grouped by ${managerEmails.length} property managers:`);
    managerEmails.forEach(email => {
      console.log(`- ${email}: ${propertiesByManager[email].length} properties`);
    });
    
    if (skippedProperties > 0) {
      toast({
        title: "Properties Skipped",
        description: `${skippedProperties} properties were skipped due to missing or invalid property manager assignments.`,
        variant: "destructive",
      });
    }

    if (managerEmails.length === 0) {
      toast({
        title: "No Valid Property Managers",
        description: "None of the selected properties have valid property manager email assignments.",
        variant: "destructive",
      });
      return;
    }

    // Create enhanced campaign data for each property manager
    const campaignsToProcess: CampaignWorkflowData[] = [];
    
    for (const [pmEmail, properties] of Object.entries(propertiesByManager)) {
      const campaignId = await generateCampaignId();
      const campaignName = await generateCampaignName();

      const campaignData: CampaignWorkflowData = {
        campaign_id: campaignId,
        campaign_name: `${campaignName} - ${properties[0].property_manager_name}`,
        client_name: properties[0]?.clients?.company_name || 'Unknown Client',
        property_manager_email: pmEmail,
        region: filters.region === 'all' ? properties[0].region : filters.region,
        market: filters.market === 'all' ? properties[0].market : filters.market,
        // Include inspector information
        inspector_id: selectedInspector.id,
        inspector_name: selectedInspector.full_name,
        inspector_email: selectedInspector.email,
        properties: properties.map(prop => {
          const propertyInspector = propertyInspectorOverrides[prop.id] || selectedInspector;
          return {
            roof_id: prop.id,
            property_name: prop.property_name,
            address: `${prop.address}, ${prop.city}, ${prop.state}`,
            // Include property-level inspector override if different from campaign default
            inspector_id: propertyInspector.id !== selectedInspector.id ? propertyInspector.id : undefined,
            inspector_email: propertyInspector.id !== selectedInspector.id ? propertyInspector.email : undefined,
          };
        })
      };

      campaignsToProcess.push(campaignData);
    }

    console.log(`About to process ${campaignsToProcess.length} campaigns as a batch with inspector assignments:`, 
      campaignsToProcess.map(c => ({ 
        name: c.campaign_name, 
        email: c.property_manager_email, 
        inspector: c.inspector_name,
        inspector_email: c.inspector_email,
        count: c.properties.length 
      }))
    );

    // Initialize progress tracking for batch processing
    setWorkflowProgress({
      isProcessing: true,
      currentCampaign: 'Processing campaign batch with inspector assignments...',
      processedCount: 0,
      totalCount: 1, // Single batch operation
      results: []
    });

    try {
      // Process all campaigns as a single batch
      const results = await processCampaignsBatch(campaignsToProcess);

      setWorkflowProgress(prev => ({
        ...prev,
        isProcessing: false,
        processedCount: 1,
        results: [...results.successful, ...results.failed]
      }));

      // Create Supabase inspections for successful campaigns
      if (results.successful.length > 0) {
        await createInspectionsForSuccessfulCampaigns(results.successful);
        
        // Trigger global data refresh for all inspection-related components
        emitDataRefresh(['inspections_tab', 'inspection_history', 'inspector_interface']);
        
        // Emit campaign creation events for each successful campaign
        results.successful.forEach(result => {
          if (result.campaignData) {
            console.log('Batch campaign created with Supabase inspections:', result.campaignData.campaign_name);
          }
        });
      }

      // Show detailed results toast
      if (results.failed.length === 0) {
        toast({
          title: "Batch Campaign Created Successfully!",
          description: `Successfully created campaigns for ${results.successful.length} property managers with inspector ${selectedInspector.full_name} assigned.`,
        });
      } else if (results.successful.length > 0) {
        toast({
          title: "Partial Success",
          description: `${results.successful.length} campaigns succeeded, ${results.failed.length} failed. Check details below.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Batch Processing Failed",
          description: `Failed to create campaigns. ${results.failed[0]?.error || 'Unknown error'}`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Batch processing failed:', error);
      setWorkflowProgress(prev => ({
        ...prev,
        isProcessing: false
      }));
      
      toast({
        title: "Batch Processing Failed",
        description: "An unexpected error occurred while processing the campaign batch.",
        variant: "destructive",
      });
    }
    endTimer('startWorkflow');
  }, [selectedProperties, selectedInspector, filters.region, filters.market, processCampaignsBatch, toast, startTimer, endTimer]);

  const exportSelectedProperties = useCallback(() => {
    if (selectedProperties.length === 0) {
      toast({
        title: "No Properties Selected",
        description: "Please select properties to export.",
        variant: "destructive",
      });
      return;
    }

    startTimer('exportProperties');
    const csvContent = [
      ['Property Name', 'Address', 'City', 'State', 'Market', 'Region', 'Property Manager', 'PM Email'].join(','),
      ...selectedProperties.map(p => 
        [p.property_name, p.address, p.city, p.state, p.market, p.region, p.property_manager_name, p.property_manager_email].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-properties-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    endTimer('exportProperties');
  }, [selectedProperties, toast, startTimer, endTimer]);

  const handlePropertyInspectorOverride = useCallback((propertyId: string, inspector: Inspector | null) => {
    if (inspector && inspector.id !== selectedInspector?.id) {
      setPropertyInspectorOverrides(prev => ({
        ...prev,
        [propertyId]: inspector
      }));
    } else {
      setPropertyInspectorOverrides(prev => {
        const newOverrides = { ...prev };
        delete newOverrides[propertyId];
        return newOverrides;
      });
    }
  }, [selectedInspector?.id]);

  // Memoized property selection handler to prevent recreating inline functions
  const handlePropertySelection = useCallback((property: Property, checked: boolean) => {
    if (checked) {
      setSelectedProperties(prev => [...prev, property]);
    } else {
      setSelectedProperties(prev => prev.filter(p => p.id !== property.id));
      // Clear any inspector override when deselecting
      setPropertyInspectorOverrides(prev => {
        const newOverrides = { ...prev };
        delete newOverrides[property.id];
        return newOverrides;
      });
    }
  }, []);

  // Direct property selection handler for single selection mode
  const handleDirectPropertySelection = useCallback((property: Property) => {
    setDirectInspectionData(prev => ({ ...prev, selectedProperty: property }));
  }, []);

  // Memoized pagination computation
  const filteredAndPaginatedProperties = useMemo(() => {
    const totalCount = filteredProperties.length;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return {
      properties: filteredProperties.slice(startIndex, endIndex),
      totalPages,
      totalCount
    };
  }, [filteredProperties, currentPage, itemsPerPage]);

  // Memoized direct properties pagination computation
  const filteredAndPaginatedDirectProperties = useMemo(() => {
    const totalCount = filteredDirectProperties.length;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const startIndex = (directCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return {
      properties: filteredDirectProperties.slice(startIndex, endIndex),
      totalPages,
      totalCount
    };
  }, [filteredDirectProperties, directCurrentPage, itemsPerPage]);

  const handleSelectAll = useCallback(() => {
    if (filteredProperties.length > 100) {
      // Show confirmation for large selections
      const confirmed = window.confirm(
        `You're about to select all ${filteredProperties.length} properties. This may take a moment to process. Continue?`
      );
      if (!confirmed) return;
    }

    const selectedIds = new Set(selectedProperties.map(p => p.id));
    const allCurrentSelected = filteredProperties.every(prop => selectedIds.has(prop.id));
    
    if (allCurrentSelected) {
      // Deselect all filtered properties
      const filteredIds = new Set(filteredProperties.map(p => p.id));
      setSelectedProperties(prev => 
        prev.filter(selected => !filteredIds.has(selected.id))
      );
    } else {
      // Select all filtered properties that aren't already selected
      const newSelections = filteredProperties.filter(prop => !selectedIds.has(prop.id));
      setSelectedProperties(prev => [...prev, ...newSelections]);
    }
  }, [filteredProperties, selectedProperties]);

  const handleSelectCurrentPage = useCallback(() => {
    const currentPageProperties = filteredAndPaginatedProperties.properties;
    const selectedIds = new Set(selectedProperties.map(p => p.id));
    const allCurrentPageSelected = currentPageProperties.every(prop => selectedIds.has(prop.id));
    
    if (allCurrentPageSelected) {
      // Deselect current page properties
      const currentPageIds = new Set(currentPageProperties.map(p => p.id));
      setSelectedProperties(prev => 
        prev.filter(selected => !currentPageIds.has(selected.id))
      );
    } else {
      // Select current page properties that aren't already selected
      const newSelections = currentPageProperties.filter(prop => !selectedIds.has(prop.id));
      setSelectedProperties(prev => [...prev, ...newSelections]);
    }
  }, [filteredAndPaginatedProperties.properties, selectedProperties]);

  // Memoized selection stats computation
  const selectionStats = useMemo(() => {
    const totalFiltered = filteredProperties.length;
    const totalSelected = selectedProperties.length;
    const selectedIds = new Set(selectedProperties.map(p => p.id)); // Optimize lookups
    
    const currentPageSelected = filteredAndPaginatedProperties.properties.filter(prop =>
      selectedIds.has(prop.id)
    ).length;
    const currentPageTotal = filteredAndPaginatedProperties.properties.length;
    
    return {
      totalFiltered,
      totalSelected,
      currentPageSelected,
      currentPageTotal,
      allFilteredSelected: totalFiltered > 0 && filteredProperties.every(prop => 
        selectedIds.has(prop.id)
      ),
      allCurrentPageSelected: currentPageTotal > 0 && filteredAndPaginatedProperties.properties.every(prop => 
        selectedIds.has(prop.id)
      )
    };
  }, [filteredProperties, selectedProperties, filteredAndPaginatedProperties]);

  // Render the main dialog content
  const renderDialogContent = () => (
    <>
      <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {directInspectionMode ? <Zap className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                <span>{directInspectionMode ? 'Create Direct Inspection' : 'Schedule Inspection Campaign'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="direct-mode" className="text-sm font-normal">
                  Direct Inspection Mode
                </Label>
                <Switch
                  id="direct-mode"
                  checked={directInspectionMode}
                  onCheckedChange={setDirectInspectionMode}
                />
              </div>
          </DialogTitle>
        </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="space-y-4 p-1 overflow-y-auto flex-1">{/* Added padding to prevent content cutoff */}

              {(() => {
                console.log('🔍 DEBUG: About to render directInspectionMode:', directInspectionMode);
                console.log('🔍 DEBUG: directInspectionData:', directInspectionData);
                return null;
              })()}
              
              {directInspectionMode ? (
                <>
                {/* Direct Mode Filter Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <Filter className="h-4 w-4" />
                      <span>Property Filters</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Filter Row Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-center">
                      {/* Property Filters */}
                      <Select value={directFilters.region} onValueChange={(value) => setDirectFilters(prev => ({ ...prev, region: value }))}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Regions</SelectItem>
                          <SelectItem value="Central">Central</SelectItem>
                          <SelectItem value="East">East</SelectItem>
                          <SelectItem value="West">West</SelectItem>
                          <SelectItem value="North">North</SelectItem>
                          <SelectItem value="South">South</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={directFilters.market} onValueChange={(value) => setDirectFilters(prev => ({ ...prev, market: value }))}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Market" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Markets</SelectItem>
                          <SelectItem value="Dallas">Dallas</SelectItem>
                          <SelectItem value="Houston">Houston</SelectItem>
                          <SelectItem value="Austin">Austin</SelectItem>
                          <SelectItem value="San Antonio">San Antonio</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={directFilters.inspectionType} onValueChange={(value) => setDirectFilters(prev => ({ ...prev, inspectionType: value }))}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annual">Annual</SelectItem>
                          <SelectItem value="preventative">Preventative</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Compact Zipcode Filter */}
                      <div className="relative">
                        <Select 
                          value={directFilters.zipcodes.length === 0 ? "all" : "custom"}
                          onValueChange={(value) => {
                            if (value === "all") {
                              setDirectFilters(prev => ({ ...prev, zipcodes: [] }));
                            }
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Zipcodes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Zipcodes</SelectItem>
                            <SelectItem value="custom">
                              {directFilters.zipcodes.length > 0 ? `${directFilters.zipcodes.length} selected` : "Select specific"}
                            </SelectItem>
                            <div className="p-2 border-t">
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {availableZipcodes.map((zipcode) => (
                                  <div key={zipcode} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`direct-zipcode-${zipcode}`}
                                      checked={directFilters.zipcodes.includes(zipcode)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setDirectFilters(prev => ({ ...prev, zipcodes: [...prev.zipcodes, zipcode] }));
                                        } else {
                                          setDirectFilters(prev => ({ ...prev, zipcodes: prev.zipcodes.filter(z => z !== zipcode) }));
                                        }
                                      }}
                                    />
                                    <label htmlFor={`direct-zipcode-${zipcode}`} className="text-sm cursor-pointer">
                                      {zipcode}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button onClick={fetchDirectProperties} size="sm" className="h-8">
                        Apply Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Property Selection Card */}
                <Card className="flex-1 min-h-0 flex flex-col">
                  <CardHeader className="pb-2 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Available Properties ({filteredAndPaginatedDirectProperties.totalCount})
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant={directInspectionData.selectedProperty ? "default" : "secondary"} className="text-sm">
                          {directInspectionData.selectedProperty ? '1 selected' : 'Select property'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search properties..."
                          value={directSearchTerm}
                          onChange={(e) => setDirectSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
                    <ScrollArea className="h-full w-full pointer-events-auto">
                      <div className="space-y-2 p-6">
                        {directLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                            <p className="text-gray-600">Loading properties...</p>
                          </div>
                        ) : filteredAndPaginatedDirectProperties.totalCount === 0 ? (
                          <div className="text-center py-8">
                            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600">No properties found matching your criteria.</p>
                          </div>
                        ) : (
                          filteredAndPaginatedDirectProperties.properties.map((property) => {
                            const isSelected = directInspectionData.selectedProperty?.id === property.id;
                            
                            return (
                              <PropertyListItem
                                key={property.id}
                                property={property}
                                isSelected={isSelected}
                                selectedInspector={selectedInspector}
                                singleSelectMode={true}
                                onDirectSelection={handleDirectPropertySelection}
                              />
                            );
                          })
                        )}
                        {/* Add bottom padding to ensure content doesn't get cut off */}
                        <div className="h-4"></div>
                      </div>
                    </ScrollArea>
                    
                    {/* Pagination for Direct Mode */}
                    {filteredAndPaginatedDirectProperties.totalPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t bg-background flex-shrink-0">
                        <div className="text-sm text-gray-600">
                          Showing {((directCurrentPage - 1) * itemsPerPage) + 1} to {Math.min(directCurrentPage * itemsPerPage, filteredAndPaginatedDirectProperties.totalCount)} of {filteredAndPaginatedDirectProperties.totalCount} properties
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setDirectCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={directCurrentPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm">
                            Page {directCurrentPage} of {filteredAndPaginatedDirectProperties.totalPages}
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setDirectCurrentPage(prev => Math.min(filteredAndPaginatedDirectProperties.totalPages, prev + 1))}
                            disabled={directCurrentPage === filteredAndPaginatedDirectProperties.totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {(() => {
                  console.log('🔍 FORM CHECKPOINT: About to render Inspection Details card');
                  return null;
                })()}
                
                {/* Direct Inspection Form - Always visible in Direct Mode */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="h-5 w-5" />
                      <span>Inspection Details</span>
                      {directInspectionData.selectedProperty && (
                        <Badge variant="outline" className="text-xs">
                          Property Selected
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Inspector Assignment */}
                    <div className="space-y-2">
                      <Label htmlFor="inspector-select">Inspector *</Label>
                      <Select 
                        value={directInspectionData.inspector?.id || ''} 
                        onValueChange={(value) => {
                          const inspector = inspectors.find(i => i.id === value);
                          setDirectInspectionData(prev => ({ ...prev, inspector: inspector || null }));
                        }}
                        disabled={inspectorsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={inspectorsLoading ? "Loading..." : "Select inspector"} />
                        </SelectTrigger>
                        <SelectContent>
                          {inspectors.map((inspector) => (
                            <SelectItem key={inspector.id} value={inspector.id}>
                              {inspector.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheduled-date">Scheduled Date *</Label>
                        <Input
                          id="scheduled-date"
                          type="date"
                          value={directInspectionData.scheduledDate}
                          onChange={(e) => setDirectInspectionData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                          min={format(new Date(), 'yyyy-MM-dd')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="scheduled-time">Scheduled Time</Label>
                        <Input
                          id="scheduled-time"
                          type="time"
                          value={directInspectionData.scheduledTime}
                          onChange={(e) => setDirectInspectionData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Inspection Type and Priority */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="inspection-type">Inspection Type</Label>
                        <Select 
                          value={directInspectionData.inspectionType} 
                          onValueChange={(value: 'routine' | 'emergency' | 'follow-up') => 
                            setDirectInspectionData(prev => ({ ...prev, inspectionType: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="routine">Routine</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="follow-up">Follow-up</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority Level</Label>
                        <Select 
                          value={directInspectionData.priority} 
                          onValueChange={(value: 'low' | 'medium' | 'high') => 
                            setDirectInspectionData(prev => ({ ...prev, priority: value }))
                          }
                        >
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
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="inspection-notes">Notes</Label>
                      <Textarea
                        id="inspection-notes"
                        placeholder="Enter any special instructions or notes for this inspection..."
                        value={directInspectionData.notes}
                        onChange={(e) => setDirectInspectionData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    {/* Selected Property Summary */}
                    {directInspectionData.selectedProperty && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Selected Property</h4>
                          <div className="text-sm space-y-1">
                            <div><strong>Name:</strong> {directInspectionData.selectedProperty.property_name}</div>
                            <div><strong>Address:</strong> {directInspectionData.selectedProperty.address}, {directInspectionData.selectedProperty.city}, {directInspectionData.selectedProperty.state}</div>
                            <div><strong>Roof Type:</strong> {directInspectionData.selectedProperty.roof_type || 'N/A'}</div>
                            <div><strong>Area:</strong> {directInspectionData.selectedProperty.roof_area?.toLocaleString() || 'N/A'} sq ft</div>
                            <div><strong>Last Inspection:</strong> {directInspectionData.selectedProperty.last_inspection_date || 'Never'}</div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
                </>
              ) : (
                <>
                {/* Compact Filter Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <span>Campaign Settings & Filters</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Single Row Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-7 gap-2 items-center">
                    {/* Inspector Selection */}
                    <div className="lg:col-span-2 flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Inspector:</span>
                      <Select
                        value={selectedInspector?.id || ''}
                        onValueChange={(value) => {
                          const inspector = inspectors.find(i => i.id === value);
                          setSelectedInspector(inspector || null);
                        }}
                        disabled={inspectorsLoading}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder={inspectorsLoading ? "Loading..." : "Select"} />
                        </SelectTrigger>
                        <SelectContent>
                          {inspectors.map((inspector) => (
                            <SelectItem key={inspector.id} value={inspector.id}>
                              {inspector.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Property Filters */}
                    <Select value={filters.region} onValueChange={(value) => setFilters(prev => ({ ...prev, region: value }))}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        <SelectItem value="Central">Central</SelectItem>
                        <SelectItem value="East">East</SelectItem>
                        <SelectItem value="West">West</SelectItem>
                        <SelectItem value="North">North</SelectItem>
                        <SelectItem value="South">South</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.market} onValueChange={(value) => setFilters(prev => ({ ...prev, market: value }))}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Market" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Markets</SelectItem>
                        <SelectItem value="Dallas">Dallas</SelectItem>
                        <SelectItem value="Houston">Houston</SelectItem>
                        <SelectItem value="Austin">Austin</SelectItem>
                        <SelectItem value="San Antonio">San Antonio</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.inspectionType} onValueChange={(value) => setFilters(prev => ({ ...prev, inspectionType: value }))}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="preventative">Preventative</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Compact Zipcode Filter */}
                    <div className="relative">
                      <Select 
                        value={filters.zipcodes.length === 0 ? "all" : "custom"}
                        onValueChange={(value) => {
                          if (value === "all") {
                            setFilters(prev => ({ ...prev, zipcodes: [] }));
                          }
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Zipcodes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Zipcodes</SelectItem>
                          <SelectItem value="custom">
                            {filters.zipcodes.length > 0 ? `${filters.zipcodes.length} selected` : "Select specific"}
                          </SelectItem>
                          <div className="p-2 border-t">
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {availableZipcodes.map((zipcode) => (
                                <div key={zipcode} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`zipcode-${zipcode}`}
                                    checked={filters.zipcodes.includes(zipcode)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setFilters(prev => ({ ...prev, zipcodes: [...prev.zipcodes, zipcode] }));
                                      } else {
                                        setFilters(prev => ({ ...prev, zipcodes: prev.zipcodes.filter(z => z !== zipcode) }));
                                      }
                                    }}
                                  />
                                  <label htmlFor={`zipcode-${zipcode}`} className="text-sm cursor-pointer">
                                    {zipcode}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={fetchProperties} size="sm" className="h-8">
                      Apply Filters
                    </Button>
                   </div>
                 </CardContent>
               </Card>

                
                {/* Property Selection Card */}
                <Card className="flex-1 min-h-0 flex flex-col">
                  <CardHeader className="pb-2 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Available Properties ({filteredAndPaginatedProperties.totalCount})
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-sm">
                        {selectedProperties.length} selected
                      </Badge>
                      
                      {/* Enhanced Selection Controls */}
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAll}
                          className="whitespace-nowrap text-xs h-7 px-2"
                        >
                          {selectionStats.allFilteredSelected ? 'Deselect All' : `Select All ${selectionStats.totalFiltered}`}
                        </Button>
                        
                        {filteredAndPaginatedProperties.totalPages > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectCurrentPage}
                            className="whitespace-nowrap text-xs h-7 px-2"
                          >
                            {selectionStats.allCurrentPageSelected ? 'Deselect Page' : 'Select Page'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Selection Status Indicator */}
                  {selectedProperties.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {selectionStats.allFilteredSelected ? (
                        <span className="text-green-600 font-medium">All {selectionStats.totalFiltered} filtered properties selected</span>
                      ) : (
                        <span>
                          {selectedProperties.length} of {selectionStats.totalFiltered} properties selected
                          {filteredAndPaginatedProperties.totalPages > 1 && (
                            <span className="ml-2">
                              ({selectionStats.currentPageSelected} of {selectionStats.currentPageTotal} on this page)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search properties..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
                  <ScrollArea className="h-full w-full pointer-events-auto">
                    <div className="space-y-2 p-6">
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                          <p className="text-gray-600">Loading properties...</p>
                        </div>
                      ) : filteredAndPaginatedProperties.totalCount === 0 ? (
                        <div className="text-center py-8">
                          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">No properties found matching your criteria.</p>
                          {propertyCache.size > 0 && (
                            <div className="mt-4">
                              <p className="text-sm text-gray-500 mb-2">Clear cache and try again?</p>
                              <Button 
                                variant="link"
                                size="sm"
                                onClick={() => setPropertyCache(new Map())}
                                className="mt-2"
                              >
                                Clear cached results
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        filteredAndPaginatedProperties.properties.map((property) => {
                          const propertyInspector = propertyInspectorOverrides[property.id];
                          const selectedIds = new Set(selectedProperties.map(p => p.id));
                          const isSelected = selectedIds.has(property.id);
                          
                          return (
                            <PropertyListItem
                              key={property.id}
                              property={property}
                              isSelected={isSelected}
                              propertyInspector={propertyInspector}
                              selectedInspector={selectedInspector}
                              onPropertySelection={handlePropertySelection}
                            />
                          );
                        })
                     )}
                     {/* Add bottom padding to ensure content doesn't get cut off */}
                     <div className="h-4"></div>
                   </div>
                 </ScrollArea>
               </CardContent>
             </Card>
               </>
              )}
            </div>
          </div>

          {/* Enhanced Status Cards with batch processing feedback */}
          <div className="space-y-3 mt-4 mb-4">
            {/* Batch Processing State */}
            {workflowProgress.isProcessing && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Processing campaign batch with inspector assignments...
                    </span>
                    <span className="text-sm text-blue-600">
                      {workflowProgress.processedCount}/{workflowProgress.totalCount}
                    </span>
                  </div>
                  <Progress 
                    value={(workflowProgress.processedCount / workflowProgress.totalCount) * 100} 
                    className="w-full" 
                  />
                  <div className="text-sm text-blue-700">
                    Sending all campaigns to N8n with inspector information...
                  </div>
                </div>
              </Card>
            )}

            {/* Results Display */}
            {workflowProgress.results.length > 0 && !workflowProgress.isProcessing && (
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Batch Processing Results</span>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-green-600">
                          ✓ {workflowProgress.results.filter(r => r.success).length} succeeded
                        </span>
                        <span className="text-red-600">
                          ✗ {workflowProgress.results.filter(r => !r.success).length} failed
                        </span>
                      </div>
                      <button
                        onClick={() => setWorkflowProgress(prev => ({ ...prev, results: [] }))}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Close results"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {workflowProgress.results.map((result, index) => (
                      <div key={index} className={`text-sm p-2 rounded flex items-center space-x-2 ${
                        result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                      }`}>
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{result.campaignData.campaign_name}</div>
                          {result.campaignData.inspector_name && (
                            <div className="text-xs opacity-75">Inspector: {result.campaignData.inspector_name}</div>
                          )}
                          {result.error && (
                            <div className="text-xs opacity-75">{result.error}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          <DialogFooter className="flex justify-between items-center pt-4 border-t bg-background flex-shrink-0 relative z-10">
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {!directInspectionMode && (
                <Button variant="outline" onClick={exportSelectedProperties}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export List
                </Button>
              )}
            </div>
            
            {directInspectionMode ? (
              <Button 
                onClick={handleCreateDirectInspection}
                disabled={
                  !directInspectionData.selectedProperty || 
                  !directInspectionData.inspector || 
                  !directInspectionData.scheduledDate || 
                  workflowProgress.isProcessing
                }
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {workflowProgress.isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Creating Inspection...
                  </>
                ) : workflowProgress.results.length > 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Inspection Created
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Create Direct Inspection
                    {directInspectionData.inspector && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {directInspectionData.inspector.full_name}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleStartWorkflow}
                disabled={selectedProperties.length === 0 || !selectedInspector || workflowProgress.isProcessing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {workflowProgress.isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Processing Batch...
                  </>
                ) : workflowProgress.results.length > 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Batch Complete
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Start Campaign ({selectedProperties.length} properties)
                    {selectedInspector && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {selectedInspector.full_name}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
    </>
  );

  // Show Direct Inspection Wizard when in direct mode
  if (directInspectionMode) {
    return (
      <DirectInspectionWizard
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }

  // Return the wrapped component based on monitoring availability
  if (monitoringEnabled && ErrorBoundary && ComponentHealthMonitor) {
    return (
      <ErrorBoundary 
        componentName={componentName}
        level="component"
        onError={(error, errorInfo) => {
          if (updateHealthStatus) {
            try {
              updateHealthStatus('unhealthy', [
                `Error boundary triggered: ${error.message}`,
                'Component may need recovery'
              ], {
                renderTime: 0,
                errorRate: 1,
                lastError: error.message
              });
            } catch (monitoringError) {
              console.warn('Failed to update health status on error boundary:', monitoringError);
            }
          }
        }}
      >
        <ComponentHealthMonitor
          componentName={componentName}
          criticalComponent={true}
          healthCheckInterval={30000}
          performanceThresholds={{
            maxRenderTime: 100,
            maxErrorRate: 0.05,
            maxMemoryUsage: 100 * 1024 * 1024, // 100MB
            maxApiTime: 5000
          }}
          onHealthChange={(status, metrics, issues) => {
            if (status === 'unhealthy' && issues.length > 0) {
              console.warn(`🚨 ${componentName} health critical:`, { status, metrics, issues });
              
              // Consider triggering recovery if health is critical
              if (issues.some(issue => issue.includes('Error boundary') || issue.includes('critical'))) {
                if (triggerRecovery) {
                  triggerRecovery().then(success => {
                    if (success) {
                      console.log(`✅ ${componentName} recovery completed successfully`);
                    } else {
                      console.error(`❌ ${componentName} recovery failed`);
                    }
                  }).catch(error => {
                    console.warn('Recovery trigger failed:', error);
                  });
                }
              }
            }
          }}
        >
          <Dialog key={remountKey} open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
              {renderDialogContent()}
            </DialogContent>
          </Dialog>
        </ComponentHealthMonitor>
      </ErrorBoundary>
    );
  }

  // Return dialog without monitoring
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );
}
