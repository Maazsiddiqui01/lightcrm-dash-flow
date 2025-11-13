import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EntityAttachment, AttachmentUploadOptions } from '@/types/attachment';

export function useEntityAttachments(entityType: 'contact' | 'opportunity', entityId: string) {
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['entity-attachments', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entity_attachments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as EntityAttachment[];
    },
    enabled: !!entityId,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, description }: { file: File; description?: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${entityType}/${entityId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('entity-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from('entity_attachments')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: fileName,
          description,
        })
        .select()
        .single();

      if (insertError) {
        await supabase.storage.from('entity-attachments').remove([fileName]);
        throw insertError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-attachments', entityType, entityId] });
      toast.success('File uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachment: EntityAttachment) => {
      const { error: deleteError } = await supabase
        .from('entity_attachments')
        .delete()
        .eq('id', attachment.id);

      if (deleteError) throw deleteError;

      const { error: storageError } = await supabase.storage
        .from('entity-attachments')
        .remove([attachment.storage_path]);

      if (storageError) throw storageError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-attachments', entityType, entityId] });
      toast.success('File deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const downloadFile = async (attachment: EntityAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('entity-attachments')
        .download(attachment.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('File downloaded');
    } catch (error: any) {
      toast.error(`Download failed: ${error.message}`);
    }
  };

  return {
    attachments,
    isLoading,
    uploadFile: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    deleteFile: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    downloadFile,
  };
}
