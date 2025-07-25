import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileDown, Calendar, MapPin, Upload, Eye, MessageCircle } from "lucide-react";
import { ExcelImportDialog } from "@/components/excel/ExcelImportDialog";
import { RoofDetailModal } from "./RoofDetailModal";
import { PropertyDetailsDialog } from "@/components/properties/PropertyDetailsDialog";
import { InspectionSchedulingModal } from "@/components/inspections/InspectionSchedulingModal";
import { supabase } from "@/integrations/supabase/client";

export function RoofsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
  const [selectedRoof, setSelectedRoof] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [propertyDetailsOpen, setPropertyDetailsOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [roofs, setRoofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoofs = async () => {
    try {
      setLoading(true);
      console.log('Fetching roofs...');
      
      let query = supabase
        .from('roofs')
        .select('*')
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`property_name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
      }

      console.log('Query built, executing...');
      const { data, error } = await query.order('created_at', { ascending: false });

      console.log('Query result:', { data: data?.length, error });
      
      if (error) {
        console.error('Error fetching roofs:', error);
        return;
      }

      setRoofs(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoofs();
  }, [statusFilter, searchTerm]);

  const getWarrantyStatus = (roof: any) => {
    const now = new Date();
    const manufacturerExpiry = roof.manufacturer_warranty_expiration ? new Date(roof.manufacturer_warranty_expiration) : null;
    const installerExpiry = roof.installer_warranty_expiration ? new Date(roof.installer_warranty_expiration) : null;
    
    // Check if any warranty is active
    const hasActiveWarranty = (manufacturerExpiry && manufacturerExpiry > now) || (installerExpiry && installerExpiry > now);
    
    if (!hasActiveWarranty) return "expired";
    
    // Check if any warranty is expiring soon (within 90 days)
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(now.getDate() + 90);
    
    const isExpiringSoon = (manufacturerExpiry && manufacturerExpiry <= ninetyDaysFromNow) || 
                          (installerExpiry && installerExpiry <= ninetyDaysFromNow);
    
    return isExpiringSoon ? "expiring" : "active";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case "maintenance":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Maintenance</Badge>;
      case "inactive":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getWarrantyBadge = (warranty: string) => {
    switch (warranty) {
      case "active":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Active</Badge>;
      case "expiring":
        return <Badge variant="destructive" className="bg-orange-100 text-orange-800">Expiring</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{warranty}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search roofs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSchedulingModalOpen(true)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Roof
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Property Name</TableHead>
              <TableHead className="font-semibold">Client</TableHead>
              <TableHead className="font-semibold">Address</TableHead>
              <TableHead className="font-semibold">Roof Type</TableHead>
              <TableHead className="font-semibold">Area (sq ft)</TableHead>
              <TableHead className="font-semibold">Last Inspection</TableHead>
              <TableHead className="font-semibold">Next Inspection</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Warranty</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">Loading roofs...</TableCell>
              </TableRow>
            ) : roofs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">No roofs found</TableCell>
              </TableRow>
            ) : (
              roofs.map((roof) => (
                <TableRow key={roof.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{roof.property_name}</TableCell>
                  <TableCell>{roof.clients?.company_name || roof.customer || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {`${roof.address}, ${roof.city}, ${roof.state} ${roof.zip}`}
                    </div>
                  </TableCell>
                  <TableCell>{roof.roof_type || 'N/A'}</TableCell>
                  <TableCell>{roof.roof_area ? roof.roof_area.toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{roof.last_inspection_date || 'N/A'}</TableCell>
                  <TableCell>{roof.next_inspection_due || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(roof.status || 'active')}</TableCell>
                  <TableCell>{getWarrantyBadge(getWarrantyStatus(roof))}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedProperty(roof);
                          setPropertyDetailsOpen(true);
                        }}
                        title="View property details with comments"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedRoof(roof);
                          setDetailModalOpen(true);
                        }}
                        title="View roof specifications"
                      >
                        View Roof
                      </Button>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Showing 1 to 3 of 1,247 entries</p>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">1</Button>
          <Button variant="outline" size="sm">2</Button>
          <Button variant="outline" size="sm">3</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>

      <ExcelImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={() => {
          fetchRoofs(); // Refresh the roofs data after import
        }}
      />

      <InspectionSchedulingModal
        open={schedulingModalOpen}
        onOpenChange={setSchedulingModalOpen}
      />

      {selectedRoof && (
        <RoofDetailModal
          roof={selectedRoof}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          onSave={(updatedRoof) => {
            fetchRoofs();
          }}
        />
      )}

      <PropertyDetailsDialog
        open={propertyDetailsOpen}
        onOpenChange={setPropertyDetailsOpen}
        property={selectedProperty}
      />
    </div>
  );
}