import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AttachmentUpload } from './AttachmentUpload';
import { AttachmentList } from './AttachmentList';
import { useEntityAttachments } from '@/hooks/useEntityAttachments';
import { Separator } from '@/components/ui/separator';

interface AttachmentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'contact' | 'opportunity';
  entityId: string;
  entityName: string;
}

export function AttachmentUploadDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
}: AttachmentUploadDialogProps) {
  const {
    attachments,
    isLoading,
    uploadFile,
    isUploading,
    deleteFile,
    isDeleting,
    downloadFile,
  } = useEntityAttachments(entityType, entityId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Attachments</DialogTitle>
          <DialogDescription>
            Upload and manage documents for {entityName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <AttachmentUpload
            onUpload={(file, description) => uploadFile({ file, description })}
            isUploading={isUploading}
          />

          {attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3">Existing Attachments</h3>
                <AttachmentList
                  attachments={attachments}
                  onDownload={downloadFile}
                  onDelete={deleteFile}
                  isDeleting={isDeleting}
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
