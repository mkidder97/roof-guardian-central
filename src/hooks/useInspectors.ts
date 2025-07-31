
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Inspector {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  full_name: string;
  auth_user_id: string;
  current_campaigns?: number;
  region?: string;
}

export function useInspectors() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchInspectors = async () => {
    setLoading(true);
    try {
      // Fetch company users (employees who can inspect)
      const { data: inspectorUsers, error } = await supabase
        .from('users')
        .select(`
          id,
          auth_user_id,
          first_name,
          last_name,
          email,
          role
        `)
        .eq('is_active', true);

      if (error) throw error;

      const processedInspectors: Inspector[] = (inspectorUsers || []).map(user => ({
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        auth_user_id: user.auth_user_id,
        current_campaigns: 0, // TODO: Calculate from active campaigns
      }));

      setInspectors(processedInspectors);
    } catch (error) {
      console.error('Error fetching inspectors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inspectors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspectors();
  }, []);

  return {
    inspectors,
    loading,
    refetch: fetchInspectors
  };
}
