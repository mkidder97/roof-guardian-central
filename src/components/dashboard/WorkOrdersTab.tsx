import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileDown, Calendar, DollarSign, Building, User } from "lucide-react";

export function WorkOrdersTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock data
  const workOrders = [
    {
      id: "WO-001",
      title: "Roof Leak Repair - Section A",
      property_name: "Westfield Shopping Center",
      vendor: "ABC Roofing",
      priority: "high",
      status: "in-progress",
      estimated_cost: 5500,
      scheduled_start: "2024-01-22",
      created_by: "John Smith"
    },
    {
      id: "WO-002",
      title: "Routine Maintenance - HVAC Units",
      property_name: "Tech Office Building",
      vendor: "HVAC Solutions",
      priority: "medium",
      status: "pending",
      estimated_cost: 1200,
      scheduled_start: "2024-01-25",
      created_by: "Sarah Johnson"
    },
    {
      id: "WO-003",
      title: "Gutter Cleaning and Repair",
      property_name: "Manufacturing Plant A",
      vendor: "Maintenance Corp",
      priority: "low",
      status: "completed",
      estimated_cost: 800,
      scheduled_start: "2024-01-15",
      created_by: "Mike Davis"
    },
    {
      id: "WO-004",
      title: "Emergency Roof Patch",
      property_name: "Retail Complex North",
      vendor: "Emergency Repairs Inc",
      priority: "emergency",
      status: "assigned",
      estimated_cost: 3200,
      scheduled_start: "2024-01-20",
      created_by: "Emily Chen"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "assigned":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Assigned</Badge>;
      case "in-progress":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">In Progress</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "emergency":
        return <Badge variant="destructive" className="bg-red-600">Emergency</Badge>;
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
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
              placeholder="Search work orders..."
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
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
          <Button variant="outline" size="sm">
            Assign Vendor
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Work Order
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Work Order ID</TableHead>
              <TableHead className="font-semibold">Title</TableHead>
              <TableHead className="font-semibold">Property</TableHead>
              <TableHead className="font-semibold">Vendor</TableHead>
              <TableHead className="font-semibold">Priority</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Estimated Cost</TableHead>
              <TableHead className="font-semibold">Scheduled Start</TableHead>
              <TableHead className="font-semibold">Created By</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.map((workOrder) => (
              <TableRow key={workOrder.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{workOrder.id}</TableCell>
                <TableCell className="font-medium">{workOrder.title}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Building className="h-4 w-4 mr-2 text-gray-400" />
                    {workOrder.property_name}
                  </div>
                </TableCell>
                <TableCell>{workOrder.vendor}</TableCell>
                <TableCell>{getPriorityBadge(workOrder.priority)}</TableCell>
                <TableCell>{getStatusBadge(workOrder.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                    ${workOrder.estimated_cost.toLocaleString()}
                  </div>
                </TableCell>
                <TableCell>{workOrder.scheduled_start}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    {workOrder.created_by}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View</Button>
                    <Button variant="outline" size="sm">Edit</Button>
                    {workOrder.status === "pending" && (
                      <Button variant="outline" size="sm">Assign</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Showing 1 to 4 of 89 entries</p>
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