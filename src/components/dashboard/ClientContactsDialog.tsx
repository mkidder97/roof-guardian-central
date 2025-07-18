import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Phone, Mail, Edit, Trash2, User, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  company_name: string;
}

interface ClientContact {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  office_phone?: string;
  mobile_phone?: string;
  role: string;
  title?: string;
  department?: string;
  is_primary: boolean;
  is_active: boolean;
  notes?: string;
  properties_count?: number;
}

interface ClientContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

const roleOptions = [
  { value: 'primary', label: 'Primary Contact', color: 'bg-blue-100 text-blue-800' },
  { value: 'property_manager', label: 'Property Manager', color: 'bg-green-100 text-green-800' },
  { value: 'regional_manager', label: 'Regional Manager', color: 'bg-purple-100 text-purple-800' },
  { value: 'billing', label: 'Billing Contact', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'emergency', label: 'Emergency Contact', color: 'bg-red-100 text-red-800' },
  { value: 'contact', label: 'General Contact', color: 'bg-gray-100 text-gray-800' }
];

export function ClientContactsDialog({ open, onOpenChange, client }: ClientContactsDialogProps) {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [newContact, setNewContact] = useState({
    first_name: '',
    last_name: '',
    email: '',
    office_phone: '',
    mobile_phone: '',
    role: 'contact',
    title: '',
    department: '',
    notes: ''
  });

  useEffect(() => {
    if (client && open) {
      fetchContacts();
    }
  }, [client, open]);

  const fetchContacts = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      // Fetch contacts with property assignment counts
      const { data: contactsData, error } = await supabase
        .from('client_contacts')
        .select(`
          *,
          property_contact_assignments(count)
        `)
        .eq('client_id', client.id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('last_name');

      if (error) throw error;

      const contactsWithCounts = contactsData?.map(contact => ({
        ...contact,
        properties_count: contact.property_contact_assignments?.[0]?.count || 0
      })) || [];

      setContacts(contactsWithCounts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!client || !newContact.first_name || !newContact.last_name) return;

    try {
      const { error } = await supabase
        .from('client_contacts')
        .insert({
          client_id: client.id,
          ...newContact,
          is_primary: newContact.role === 'primary'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact added successfully"
      });

      setNewContact({
        first_name: '',
        last_name: '',
        email: '',
        office_phone: '',
        mobile_phone: '',
        role: 'contact',
        title: '',
        department: '',
        notes: ''
      });
      setIsAddingContact(false);
      fetchContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive"
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('client_contacts')
        .update({ is_active: false })
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact deactivated successfully"
      });

      fetchContacts();
    } catch (error) {
      console.error('Error deactivating contact:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate contact",
        variant: "destructive"
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = roleOptions.find(r => r.value === role);
    return (
      <Badge className={roleConfig?.color || 'bg-gray-100 text-gray-800'}>
        {roleConfig?.label || role}
      </Badge>
    );
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {client.company_name} - Contact Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Contact Button */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''} found
            </div>
            <Button
              onClick={() => setIsAddingContact(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
          </div>

          {/* Add Contact Form */}
          {isAddingContact && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={newContact.first_name}
                      onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={newContact.last_name}
                      onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      placeholder="john.doe@company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newContact.role}
                      onValueChange={(value) => setNewContact({ ...newContact, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="office_phone">Office Phone</Label>
                    <Input
                      id="office_phone"
                      value={newContact.office_phone}
                      onChange={(e) => setNewContact({ ...newContact, office_phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile_phone">Mobile Phone</Label>
                    <Input
                      id="mobile_phone"
                      value={newContact.mobile_phone}
                      onChange={(e) => setNewContact({ ...newContact, mobile_phone: e.target.value })}
                      placeholder="(555) 987-6543"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newContact.title}
                      onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                      placeholder="Property Manager"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={newContact.department}
                      onChange={(e) => setNewContact({ ...newContact, department: e.target.value })}
                      placeholder="Real Estate"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddContact} disabled={!newContact.first_name || !newContact.last_name}>
                    Add Contact
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingContact(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Contacts List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding your first contact.</p>
              </div>
            ) : (
              contacts.map(contact => (
                <Card key={contact.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">
                            {contact.first_name} {contact.last_name}
                          </h3>
                          {getRoleBadge(contact.role)}
                          {contact.is_primary && (
                            <Badge variant="outline" className="text-blue-600 border-blue-200">
                              Primary
                            </Badge>
                          )}
                        </div>

                        {contact.title && (
                          <p className="text-sm text-muted-foreground mb-1">{contact.title}</p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm">
                          {contact.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                                {contact.email}
                              </a>
                            </div>
                          )}
                          {contact.office_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              <a href={`tel:${contact.office_phone}`} className="text-blue-600 hover:underline">
                                {contact.office_phone}
                              </a>
                            </div>
                          )}
                          {contact.mobile_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              <a href={`tel:${contact.mobile_phone}`} className="text-blue-600 hover:underline">
                                {contact.mobile_phone} (Mobile)
                              </a>
                            </div>
                          )}
                        </div>

                        {contact.properties_count > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Assigned to {contact.properties_count} propert{contact.properties_count !== 1 ? 'ies' : 'y'}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingContact(contact)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}