import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { EntityAttachment } from '@/types/attachment';
import { formatDistanceToNow } from 'date-fns';

interface FilePreviewDialogProps {
  attachment: EntityAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGetFileUrl: (attachment: EntityAttachment) => Promise<string>;
}

export function FilePreviewDialog({ 
  attachment, 
  open, 
  onOpenChange,
  onGetFileUrl 
}: FilePreviewDialogProps) {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (attachment && open) {
      setIsLoading(true);
      setError('');
      setFileUrl('');

      onGetFileUrl(attachment)
        .then((url) => {
          setFileUrl(url);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load file preview');
          setIsLoading(false);
        });
    }
  }, [attachment, open, onGetFileUrl]);

  if (!attachment) return null;

  const isImage = attachment.file_type.startsWith('image/');
  const isPDF = attachment.file_type === 'application/pdf' || attachment.file_name.toLowerCase().endsWith('.pdf');
  const canPreview = isImage || isPDF;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg truncate pr-8">{attachment.file_name}</DialogTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatFileSize(attachment.file_size)}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(attachment.uploaded_at), { addSuffix: true })}</span>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : !canPreview ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Preview not available for this file type
              </p>
              <p className="text-xs text-muted-foreground">
                Download the file to view it
              </p>
            </div>
          ) : isImage ? (
            <div className="flex items-center justify-center bg-muted/20 rounded-lg p-4 min-h-[400px]">
              <img
                src={fileUrl}
                alt={attachment.file_name}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          ) : isPDF ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </Button>
              </div>
              <div className="border border-border rounded-lg overflow-hidden" style={{ height: '70vh' }}>
                <iframe
                  src={fileUrl}
                  className="w-full h-full"
                  title={attachment.file_name}
                />
              </div>
            </div>
          ) : null}
        </div>

        {attachment.description && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Description:</span> {attachment.description}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
