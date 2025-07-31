import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileDown, DollarSign, Calendar, User, Shield, Loader2 } from "lucide-react";
import { PopulateUsersButton } from "@/components/admin/PopulateUsersButton";

export function AccountsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Fetch real users from database
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('first_name');
      if (error) throw error;
      return data;
    }
  });

  // Process and filter users
  const accounts = useMemo(() => {
    if (!users) return [];
    
    return users
      .filter(user => {
        const matchesSearch = !searchTerm || 
          `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        
        return matchesSearch && matchesRole;
      })
      .map(user => ({
        ...user,
        permissions: getPermissionsForRole(user.role || 'inspector'),
        last_login: user.updated_at ? new Date(user.updated_at).toLocaleString() : 'Never'
      }));
  }, [users, searchTerm, roleFilter]);

  // Get permissions based on role
  const getPermissionsForRole = (role: string) => {
    switch (role) {
      case 'super_admin':
        return ['full_access', 'user_management', 'system_settings'];
      case 'manager':
        return ['inspections', 'reports', 'clients', 'vendors'];
      case 'inspector':
        return ['inspections', 'reports'];
      default:
        return ['basic_access'];
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Super Admin</Badge>;
      case "manager":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Manager</Badge>;
      case "inspector":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Inspector</Badge>;
      case "admin":
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Admin</Badge>;
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
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="inspector">Inspector</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-3">
          {users && users.length === 0 && (
            <PopulateUsersButton onSuccess={() => refetch()} />
          )}
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading users...
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-red-600">
                  Error loading users: {error.message}
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-gray-500">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
              <TableRow key={account.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium">{account.first_name} {account.last_name}</span>
                  </div>
                </TableCell>
                <TableCell>{account.email}</TableCell>
                <TableCell>{getRoleBadge(account.role)}</TableCell>
                <TableCell>{account.phone || 'N/A'}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Account Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold">{users?.length || 0}</p>
            </div>
            <User className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold">{users?.filter(u => u.is_active).length || 0}</p>
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
              <p className="text-2xl font-bold">{users?.filter(u => u.role === 'super_admin' || u.role === 'manager').length || 0}</p>
            </div>
            <Shield className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inspectors</p>
              <p className="text-2xl font-bold">{users?.filter(u => u.role === 'inspector').length || 0}</p>
            </div>
            <User className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {accounts.length} of {users?.length || 0} entries
          {searchTerm && ` (filtered by "${searchTerm}")`}
          {roleFilter !== 'all' && ` (filtered by ${roleFilter})`}
        </p>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">1</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
}