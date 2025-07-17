import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileDown, Phone, Mail, MapPin, Wrench } from "lucide-react";

export function VendorsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Mock data
  const vendors = [
    {
      id: "1",
      company_name: "ABC Roofing Solutions",
      contact_name: "Mark Thompson",
      email: "mark@abcroofing.com",
      phone: "(555) 111-2222",
      address: "150 Contractor Way, Dallas, TX 75202",
      vendor_type: "roofing",
      status: "active",
      rating: 4.8,
      active_jobs: 8
    },
    {
      id: "2",
      company_name: "HVAC Solutions Inc",
      contact_name: "Amanda Rodriguez",
      email: "amanda@hvacsolutions.com",
      phone: "(555) 222-3333",
      address: "250 Service Dr, Austin, TX 78702",
      vendor_type: "hvac",
      status: "active",
      rating: 4.6,
      active_jobs: 5
    },
    {
      id: "3",
      company_name: "Maintenance Corp",
      contact_name: "Steve Johnson",
      email: "steve@maintenancecorp.com",
      phone: "(555) 333-4444",
      address: "350 Industrial Ave, Houston, TX 77002",
      vendor_type: "maintenance",
      status: "active",
      rating: 4.3,
      active_jobs: 12
    },
    {
      id: "4",
      company_name: "Emergency Repairs Inc",
      contact_name: "Rachel Davis",
      email: "rachel@emergencyrepairs.com",
      phone: "(555) 444-5555",
      address: "450 Emergency Blvd, San Antonio, TX 78202",
      vendor_type: "emergency",
      status: "active",
      rating: 4.9,
      active_jobs: 3
    },
    {
      id: "5",
      company_name: "Inspection Experts",
      contact_name: "Tom Wilson",
      email: "tom@inspectionexperts.com",
      phone: "(555) 555-6666",
      address: "550 Quality St, Fort Worth, TX 76101",
      vendor_type: "inspection",
      status: "inactive",
      rating: 4.2,
      active_jobs: 0
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      roofing: "bg-blue-100 text-blue-800",
      hvac: "bg-purple-100 text-purple-800",
      maintenance: "bg-orange-100 text-orange-800",
      emergency: "bg-red-100 text-red-800",
      inspection: "bg-green-100 text-green-800"
    };
    
    return (
      <Badge variant="outline" className={colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const getRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    return (
      <div className="flex items-center">
        <span className="text-sm font-medium mr-1">{rating}</span>
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <span key={i} className={`text-xs ${i < fullStars ? 'text-yellow-400' : 'text-gray-300'}`}>
              ★
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="roofing">Roofing</SelectItem>
              <SelectItem value="hvac">HVAC</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Send RFQ
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Company Name</TableHead>
              <TableHead className="font-semibold">Contact Person</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Rating</TableHead>
              <TableHead className="font-semibold">Active Jobs</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{vendor.company_name}</TableCell>
                <TableCell>{vendor.contact_name}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline">
                      {vendor.email}
                    </a>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {vendor.phone}
                  </div>
                </TableCell>
                <TableCell>{getTypeBadge(vendor.vendor_type)}</TableCell>
                <TableCell>{getRatingStars(vendor.rating)}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Wrench className="h-4 w-4 mr-2 text-gray-400" />
                    {vendor.active_jobs}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View</Button>
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="outline" size="sm">Assign</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Showing 1 to 5 of 32 entries</p>
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