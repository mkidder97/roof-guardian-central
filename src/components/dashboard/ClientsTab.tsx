import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileDown, Phone, Mail, MapPin, Building, Loader2, Users, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientContactsDialog } from './ClientContactsDialog';

interface Client {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: string | null;
  properties_count: number;
  total_sq_ft: number;
  contacts_count: number;
  primary_contact: string | null;
}

export function ClientsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [contactsDialogOpen, setContactsDialogOpen] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchTerm, statusFilter, clients]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .order('company_name');
        
      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }
      
      // Calculate total sq ft, property count, and contacts for each client
      const clientsWithMetrics = await Promise.all(
        (clientsData || []).map(async (client) => {
          // Get properties data
          const { data: roofs } = await supabase
            .from('roofs')
            .select('roof_area')
            .eq('client_id', client.id)
            .eq('is_deleted', false);

          // Get contacts data
          const { data: contacts } = await supabase
            .from('client_contacts')
            .select('id, first_name, last_name, is_primary')
            .eq('client_id', client.id)
            .eq('is_active', true);
            
          const total_sq_ft = roofs?.reduce((sum, roof) => sum + (roof.roof_area || 0), 0) || 0;
          const properties_count = roofs?.length || 0;
          const contacts_count = contacts?.length || 0;
          
          const primaryContact = contacts?.find(c => c.is_primary);
          const primary_contact = primaryContact 
            ? `${primaryContact.first_name} ${primaryContact.last_name}`
            : client.contact_name;
          
          return {
            ...client,
            properties_count,
            total_sq_ft,
            contacts_count,
            primary_contact
          };
        })
      );
      
      setClients(clientsWithMetrics);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = clients;

    if (searchTerm) {
      filtered = filtered.filter(client => 
        client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.primary_contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(client => client.status === statusFilter);
    }

    setFilteredClients(filtered);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const exportData = () => {
    const csvData = filteredClients.map(client => ({
      'Company Name': client.company_name,
      'Primary Contact': client.primary_contact || '',
      'Contacts Count': client.contacts_count,
      'Email': client.email || '',
      'Phone': client.phone || '',
      'Address': `${client.address || ''}, ${client.city || ''}, ${client.state || ''} ${client.zip || ''}`.trim(),
      'Properties Count': client.properties_count,
      'Total Sq Ft': client.total_sq_ft,
      'Status': client.status || ''
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleViewContacts = (client: Client) => {
    setSelectedClient(client);
    setContactsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Loading clients...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients..."
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
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={exportData}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Company Name</TableHead>
              <TableHead className="font-semibold">Primary Contact</TableHead>
              <TableHead className="font-semibold">Contacts</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Address</TableHead>
              <TableHead className="font-semibold">Properties</TableHead>
              <TableHead className="font-semibold">Total Sq Ft</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <div className="text-gray-500">
                    <Building className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No clients found matching your criteria.</p>
                    {clients.length === 0 && (
                      <p className="text-sm mt-2">Import your first clients to get started.</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {client.company_name}
                    </div>
                  </TableCell>
                  <TableCell>{client.primary_contact || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{client.contacts_count} contact{client.contacts_count !== 1 ? 's' : ''}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.email ? (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                          {client.email}
                        </a>
                      </div>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {client.phone ? (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {client.phone}
                      </div>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="max-w-xs truncate">
                        {[client.address, client.city, client.state, client.zip].filter(Boolean).join(', ') || 'N/A'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2 text-gray-400" />
                      {client.properties_count}
                    </div>
                  </TableCell>
                  <TableCell>{client.total_sq_ft.toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(client.status)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewContacts(client)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Contacts
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Showing {filteredClients.length} of {clients.length} clients</p>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Total Properties: {clients.reduce((sum, c) => sum + c.properties_count, 0)}</span>
          <span>Total Sq Ft: {clients.reduce((sum, c) => sum + c.total_sq_ft, 0).toLocaleString()}</span>
          <span>Total Contacts: {clients.reduce((sum, c) => sum + c.contacts_count, 0)}</span>
        </div>
      </div>

      {/* Client Contacts Dialog */}
      <ClientContactsDialog
        open={contactsDialogOpen}
        onOpenChange={setContactsDialogOpen}
        client={selectedClient}
      />
    </div>
  );
}