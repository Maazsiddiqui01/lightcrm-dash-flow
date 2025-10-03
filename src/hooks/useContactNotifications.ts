import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContactNotification {
  id: string;
  notification_type: 'duplicate_detected' | 'duplicate_resolved' | 'contact_requested';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  read_at?: string;
  contact_id?: string;
  duplicate_id?: string;
}

export function useContactNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['contact-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ContactNotification[];
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('contact_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('contact_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-notifications'] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
}
