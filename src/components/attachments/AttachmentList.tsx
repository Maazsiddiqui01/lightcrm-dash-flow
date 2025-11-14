import { Button } from '@/components/ui/button';
import { Download, Trash2, Loader2, Eye } from 'lucide-react';
import { AttachmentIcon } from './AttachmentIcon';
import { formatDistanceToNow } from 'date-fns';
import type { EntityAttachment } from '@/types/attachment';
import { FilePreviewDialog } from './FilePreviewDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from 'react';

interface AttachmentListProps {
  attachments: EntityAttachment[];
  onDownload: (attachment: EntityAttachment) => void;
  onDelete: (attachment: EntityAttachment) => void;
  onGetFileUrl: (attachment: EntityAttachment) => Promise<string>;
  isDeleting?: boolean;
}

export function AttachmentList({ attachments, onDownload, onDelete, onGetFileUrl, isDeleting }: AttachmentListProps) {
  const [deleteTarget, setDeleteTarget] = useState<EntityAttachment | null>(null);
  const [previewTarget, setPreviewTarget] = useState<EntityAttachment | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No attachments yet
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <AttachmentIcon fileType={attachment.file_type} className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-foreground">{attachment.file_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(attachment.uploaded_at), { addSuffix: true })}</span>
                </div>
                {attachment.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{attachment.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewTarget(attachment)}
                className="h-8 w-8 p-0"
                title="Preview"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(attachment)}
                className="h-8 w-8 p-0"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(attachment)}
                disabled={isDeleting}
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                title="Delete"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FilePreviewDialog
        attachment={previewTarget}
        open={!!previewTarget}
        onOpenChange={(open) => !open && setPreviewTarget(null)}
        onGetFileUrl={onGetFileUrl}
        onDownload={onDownload}
      />
    </>
  );
}
