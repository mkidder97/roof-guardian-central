import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users } from 'lucide-react';

interface PopulateUsersButtonProps {
  onSuccess?: () => void;
}

export function PopulateUsersButton({ onSuccess }: PopulateUsersButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const companyUsers = [
    {
      email: 'kidderswork@gmail.com',
      first_name: 'Michael',
      last_name: 'Kidder',
      role: 'inspector'
    },
    {
      email: 'jragdale@roofmind.com',
      first_name: 'Jeremy',
      last_name: 'Ragdale',
      role: 'inspector'
    },
    {
      email: 'jbiggers@roofmind.com',
      first_name: 'Jordan',
      last_name: 'Biggers',
      role: 'super_admin'
    },
    {
      email: 'bricci@roofmind.com',
      first_name: 'Bill',
      last_name: 'Ricci',
      role: 'inspector'
    },
    {
      email: 'mmccord@roofmind.com',
      first_name: 'Mandy',
      last_name: 'Mccord',
      role: 'manager'
    }
  ];

  const populateUsers = async () => {
    setIsLoading(true);
    try {
      // First check if users already exist
      const { data: existingUsers } = await supabase
        .from('users')
        .select('email')
        .in('email', companyUsers.map(u => u.email));

      const existingEmails = existingUsers?.map(u => u.email) || [];
      const newUsers = companyUsers.filter(u => !existingEmails.includes(u.email));

      if (newUsers.length === 0) {
        toast({
          title: "Users Already Exist",
          description: "All company users are already in the database.",
        });
        return;
      }

      // Add new users
      const usersToInsert = newUsers.map(user => ({
        auth_user_id: crypto.randomUUID(),
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('users')
        .insert(usersToInsert);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Added ${newUsers.length} company users to the database.`,
      });

      // Call success callback to refresh the users list
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Error populating users:', error);
      toast({
        title: "Error",
        description: `Failed to populate users: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={populateUsers} 
      disabled={isLoading}
      className="bg-blue-600 hover:bg-blue-700"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Users className="h-4 w-4 mr-2" />
      )}
      {isLoading ? 'Adding Users...' : 'Populate Company Users'}
    </Button>
  );
}