import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileDown, Calendar, MapPin } from "lucide-react";

export function RoofsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock data - replace with actual Supabase data
  const roofs = [
    {
      id: "1",
      property_name: "Westfield Shopping Center",
      address: "123 Main St, Dallas, TX",
      client: "Westfield Properties",
      roof_type: "EPDM",
      roof_area: 50000,
      last_inspection: "2024-01-10",
      next_inspection: "2024-04-10",
      status: "active",
      warranty_status: "active"
    },
    {
      id: "2", 
      property_name: "Tech Office Building",
      address: "456 Innovation Dr, Austin, TX",
      client: "Tech Corp",
      roof_type: "TPO",
      roof_area: 35000,
      last_inspection: "2023-12-15",
      next_inspection: "2024-01-20",
      status: "active",
      warranty_status: "expiring"
    },
    {
      id: "3",
      property_name: "Manufacturing Plant A",
      address: "789 Industrial Blvd, Houston, TX", 
      client: "Manufacturing Inc",
      roof_type: "Modified Bitumen",
      roof_area: 75000,
      last_inspection: "2023-11-30",
      next_inspection: "2024-01-15",
      status: "active",
      warranty_status: "expired"
    }
  ];

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
          <Button variant="outline" size="sm">
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
            {roofs.map((roof) => (
              <TableRow key={roof.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{roof.property_name}</TableCell>
                <TableCell>{roof.client}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                    {roof.address}
                  </div>
                </TableCell>
                <TableCell>{roof.roof_type}</TableCell>
                <TableCell>{roof.roof_area.toLocaleString()}</TableCell>
                <TableCell>{roof.last_inspection}</TableCell>
                <TableCell>{roof.next_inspection}</TableCell>
                <TableCell>{getStatusBadge(roof.status)}</TableCell>
                <TableCell>{getWarrantyBadge(roof.warranty_status)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View</Button>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
    </div>
  );
}