import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileDown, DollarSign, Calendar, User, Shield } from "lucide-react";

export function AccountsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Real company team members
  const accounts = [
    {
      id: "1",
      first_name: "Jordan",
      last_name: "Bigger",
      email: "jordan.bigger@roofguardian.com",
      role: "manager",
      title: "COO",
      phone: "(555) 200-1001",
      is_active: true,
      last_login: "2025-01-25 08:15",
      permissions: ["full_access", "analytics", "risk_analysis", "team_management"]
    },
    {
      id: "2",
      first_name: "Sam",
      last_name: "Decelles", 
      email: "sam.decelles@roofguardian.com",
      role: "manager",
      title: "Operational Manager",
      phone: "(555) 200-1002",
      is_active: true,
      last_login: "2025-01-25 09:30",
      permissions: ["inspections", "reports", "clients", "vendors", "work_orders", "campaigns"]
    },
    {
      id: "3",
      first_name: "Mandy",
      last_name: "Mccord",
      email: "mandy.mccord@roofguardian.com", 
      role: "admin",
      title: "Office Manager",
      phone: "(555) 200-1003",
      is_active: true,
      last_login: "2025-01-25 07:45",
      permissions: ["full_access", "user_management", "system_settings", "billing"]
    },
    {
      id: "4",
      first_name: "Jennifer",
      last_name: "Eckles",
      email: "jennifer.eckles@roofguardian.com",
      role: "admin", 
      title: "Travel and Logistics Coordinator",
      phone: "(555) 200-1004",
      is_active: true,
      last_login: "2025-01-24 16:20",
      permissions: ["inspections", "scheduling", "logistics", "travel_coordination"]
    },
    {
      id: "5",
      first_name: "Jeremy",
      last_name: "Ragsdale",
      email: "jeremy.ragsdale@roofguardian.com",
      role: "inspector",
      title: "Inspector",
      phone: "(555) 200-1005", 
      is_active: true,
      last_login: "2025-01-25 06:00",
      permissions: ["inspections", "reports", "field_app", "offline_access"]
    },
    {
      id: "6", 
      first_name: "Justin",
      last_name: "Barnette",
      email: "justin.barnette@roofguardian.com",
      role: "inspector",
      title: "Inspector", 
      phone: "(555) 200-1006",
      is_active: true,
      last_login: "2025-01-24 14:30",
      permissions: ["inspections", "reports", "field_app", "offline_access"]
    },
    {
      id: "7",
      first_name: "Scott",
      last_name: "Anderson", 
      email: "scott.anderson@roofguardian.com",
      role: "admin",
      title: "Client Services",
      phone: "(555) 200-1007",
      is_active: true,
      last_login: "2025-01-25 10:15", 
      permissions: ["full_access", "client_communication", "scheduling", "user_management"]
    },
    {
      id: "8",
      first_name: "Bill",
      last_name: "Ricci",
      email: "bill.ricci@roofguardian.com", 
      role: "inspector",
      title: "Project Manager",
      phone: "(555) 200-1008",
      is_active: true,
      last_login: "2025-01-25 11:45",
      permissions: ["inspections", "reports", "project_management", "work_orders"]
    }
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Admin</Badge>;
      case "manager":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Manager</Badge>;
      case "inspector":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Inspector</Badge>;
      case "viewer":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Viewer</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactive</Badge>
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
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="inspector">Inspector</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export Users
          </Button>
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4 mr-2" />
            Manage Permissions
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Title</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Last Login</TableHead>
              <TableHead className="font-semibold">Permissions</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium">{account.first_name} {account.last_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600">{account.title}</span>
                </TableCell>
                <TableCell>{account.email}</TableCell>
                <TableCell>{getRoleBadge(account.role)}</TableCell>
                <TableCell>{account.phone}</TableCell>
                <TableCell>{getStatusBadge(account.is_active)}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {account.last_login}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {account.permissions.slice(0, 2).map((permission, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {permission.replace('_', ' ')}
                      </Badge>
                    ))}
                    {account.permissions.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{account.permissions.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View</Button>
                    <Button variant="outline" size="sm">Edit</Button>
                    {!account.is_active ? (
                      <Button variant="outline" size="sm">Activate</Button>
                    ) : (
                      <Button variant="outline" size="sm">Deactivate</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Account Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold">24</p>
            </div>
            <User className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold">22</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="h-4 w-4 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Admins</p>
              <p className="text-2xl font-bold">3</p>
            </div>
            <Shield className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inspectors</p>
              <p className="text-2xl font-bold">15</p>
            </div>
            <User className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Showing 1 to 5 of 24 entries</p>
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