import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Search, Download, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, parseISO } from "date-fns";

interface WarrantyData {
  id: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  manufacturer: string | null;
  manufacturer_warranty_expiration: string | null;
  manufacturer_warranty_term: string | null;
  manufacturer_warranty_number: string | null;
  manufacturer_has_warranty: boolean | null;
  installing_contractor: string | null;
  installer_warranty_expiration: string | null;
  installer_warranty_term: string | null;
  installer_warranty_number: string | null;
  installer_has_warranty: boolean | null;
}

export function WarrantiesTab() {
  const [warranties, setWarranties] = useState<WarrantyData[]>([]);
  const [filteredWarranties, setFilteredWarranties] = useState<WarrantyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [warrantyTypeFilter, setWarrantyTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchWarranties();
  }, []);

  useEffect(() => {
    filterWarranties();
  }, [warranties, searchTerm, warrantyTypeFilter, statusFilter]);

  const fetchWarranties = async () => {
    try {
      const { data, error } = await supabase
        .from('roofs')
        .select(`
          id,
          property_name,
          address,
          city,
          state,
          manufacturer,
          manufacturer_warranty_expiration,
          manufacturer_warranty_term,
          manufacturer_warranty_number,
          manufacturer_has_warranty,
          installing_contractor,
          installer_warranty_expiration,
          installer_warranty_term,
          installer_warranty_number,
          installer_has_warranty
        `)
        .eq('is_deleted', false)
        .order('property_name');

      if (error) throw error;
      setWarranties(data || []);
    } catch (error) {
      console.error('Error fetching warranties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterWarranties = () => {
    let filtered = warranties;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((warranty) =>
        warranty.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warranty.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warranty.installing_contractor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warranty.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Warranty type filter
    if (warrantyTypeFilter !== "all") {
      filtered = filtered.filter((warranty) => {
        if (warrantyTypeFilter === "manufacturer") {
          return warranty.manufacturer_has_warranty;
        } else if (warrantyTypeFilter === "installer") {
          return warranty.installer_has_warranty;
        }
        return true;
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((warranty) => {
        const status = getWarrantyStatus(warranty);
        return status === statusFilter;
      });
    }

    setFilteredWarranties(filtered);
  };

  const getWarrantyStatus = (warranty: WarrantyData): string => {
    const today = new Date();
    const manufacturerExpiry = warranty.manufacturer_warranty_expiration ? parseISO(warranty.manufacturer_warranty_expiration) : null;
    const installerExpiry = warranty.installer_warranty_expiration ? parseISO(warranty.installer_warranty_expiration) : null;
    
    const manufacturerDays = manufacturerExpiry ? differenceInDays(manufacturerExpiry, today) : null;
    const installerDays = installerExpiry ? differenceInDays(installerExpiry, today) : null;
    
    const hasActiveManufacturer = manufacturerDays !== null && manufacturerDays > 0;
    const hasActiveInstaller = installerDays !== null && installerDays > 0;
    const hasExpiredManufacturer = manufacturerDays !== null && manufacturerDays <= 0;
    const hasExpiredInstaller = installerDays !== null && installerDays <= 0;
    const hasExpiringSoon = (manufacturerDays !== null && manufacturerDays <= 90 && manufacturerDays > 0) || 
                           (installerDays !== null && installerDays <= 90 && installerDays > 0);

    if (hasExpiredManufacturer || hasExpiredInstaller) return "expired";
    if (hasExpiringSoon) return "expiring-soon";
    if (hasActiveManufacturer || hasActiveInstaller) return "active";
    return "no-warranty";
  };

  const getStatusBadge = (warranty: WarrantyData) => {
    const status = getWarrantyStatus(warranty);
    const today = new Date();
    
    const manufacturerExpiry = warranty.manufacturer_warranty_expiration ? parseISO(warranty.manufacturer_warranty_expiration) : null;
    const installerExpiry = warranty.installer_warranty_expiration ? parseISO(warranty.installer_warranty_expiration) : null;
    
    const manufacturerDays = manufacturerExpiry ? differenceInDays(manufacturerExpiry, today) : null;
    const installerDays = installerExpiry ? differenceInDays(installerExpiry, today) : null;

    const nearestExpiry = [manufacturerDays, installerDays].filter(d => d !== null).sort((a, b) => a! - b!)[0];

    switch (status) {
      case "expired":
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Expired</Badge>;
      case "expiring-soon":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" />Expires in {nearestExpiry} days</Badge>;
      case "active":
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Active</Badge>;
      default:
        return <Badge variant="outline">No Warranty</Badge>;
    }
  };

  const exportWarranties = () => {
    const csvContent = [
      ["Property Name", "Location", "Manufacturer", "Manufacturer Expiry", "Installer", "Installer Expiry", "Status"],
      ...filteredWarranties.map(warranty => [
        warranty.property_name,
        `${warranty.address}, ${warranty.city}, ${warranty.state}`,
        warranty.manufacturer || "N/A",
        warranty.manufacturer_warranty_expiration ? format(parseISO(warranty.manufacturer_warranty_expiration), 'MMM dd, yyyy') : "N/A",
        warranty.installing_contractor || "N/A",
        warranty.installer_warranty_expiration ? format(parseISO(warranty.installer_warranty_expiration), 'MMM dd, yyyy') : "N/A",
        getWarrantyStatus(warranty)
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "warranties-report.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-semibold">Warranty Management</h2>
        </div>
        <Button onClick={exportWarranties} className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Export Report</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search properties, manufacturers, contractors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={warrantyTypeFilter} onValueChange={setWarrantyTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Warranty Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="manufacturer">Manufacturer Only</SelectItem>
                <SelectItem value="installer">Installer Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="no-warranty">No Warranty</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {filteredWarranties.filter(w => getWarrantyStatus(w) === "active").length}
            </div>
            <p className="text-sm text-gray-600">Active Warranties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredWarranties.filter(w => getWarrantyStatus(w) === "expiring-soon").length}
            </div>
            <p className="text-sm text-gray-600">Expiring Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {filteredWarranties.filter(w => getWarrantyStatus(w) === "expired").length}
            </div>
            <p className="text-sm text-gray-600">Expired</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {filteredWarranties.filter(w => getWarrantyStatus(w) === "no-warranty").length}
            </div>
            <p className="text-sm text-gray-600">No Warranty</p>
          </CardContent>
        </Card>
      </div>

      {/* Warranties Table */}
      <Card>
        <CardHeader>
          <CardTitle>Warranty Details ({filteredWarranties.length} properties)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Manufacturer Warranty</TableHead>
                  <TableHead>Installer Warranty</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWarranties.map((warranty) => (
                  <TableRow key={warranty.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{warranty.property_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{warranty.address}</div>
                        <div className="text-gray-500">{warranty.city}, {warranty.state}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="font-medium">{warranty.manufacturer || "N/A"}</div>
                        {warranty.manufacturer_warranty_expiration && (
                          <div className="text-gray-600">
                            Expires: {format(parseISO(warranty.manufacturer_warranty_expiration), 'MMM dd, yyyy')}
                          </div>
                        )}
                        {warranty.manufacturer_warranty_number && (
                          <div className="text-gray-500 text-xs">#{warranty.manufacturer_warranty_number}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="font-medium">{warranty.installing_contractor || "N/A"}</div>
                        {warranty.installer_warranty_expiration && (
                          <div className="text-gray-600">
                            Expires: {format(parseISO(warranty.installer_warranty_expiration), 'MMM dd, yyyy')}
                          </div>
                        )}
                        {warranty.installer_warranty_number && (
                          <div className="text-gray-500 text-xs">#{warranty.installer_warranty_number}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(warranty)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}