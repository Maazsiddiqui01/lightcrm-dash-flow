import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'admin' | 'user' | 'viewer';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .order('role')
          .limit(1)
          .single();

        if (!error && data) {
          setRole(data.role as AppRole);
        } else {
          // Fallback: if no role found, treat as regular user
          setRole('user');
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchRole();

    // Subscribe to role changes
    const subscription = supabase
      .channel('user_roles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && 'role' in payload.new) {
            setRole(payload.new.role as AppRole);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isUser: role === 'user',
    isViewer: role === 'viewer',
  };
}
