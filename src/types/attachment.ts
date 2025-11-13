export interface EntityAttachment {
  id: string;
  entity_type: 'contact' | 'opportunity';
  entity_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  description?: string;
  uploaded_by?: string;
  uploaded_at: string;
  created_at: string;
}

export interface AttachmentUploadOptions {
  entityType: 'contact' | 'opportunity';
  entityId: string;
  file: File;
  description?: string;
  onProgress?: (progress: number) => void;
}
