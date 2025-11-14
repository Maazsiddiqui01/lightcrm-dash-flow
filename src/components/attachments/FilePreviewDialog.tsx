import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, AlertCircle, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { EntityAttachment } from '@/types/attachment';
import { formatDistanceToNow } from 'date-fns';
import { PDFViewer } from './viewers/PDFViewer';
import { WordViewer } from './viewers/WordViewer';
import { ExcelViewer } from './viewers/ExcelViewer';
import { CSVViewer } from './viewers/CSVViewer';

interface FilePreviewDialogProps {
  attachment: EntityAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGetFileUrl: (attachment: EntityAttachment) => Promise<string>;
  onDownload: (attachment: EntityAttachment) => void;
}

export function FilePreviewDialog({ 
  attachment, 
  open, 
  onOpenChange,
  onGetFileUrl,
  onDownload
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

  const fileName = attachment.file_name.toLowerCase();
  const fileType = attachment.file_type.toLowerCase();
  
  const isImage = fileType.startsWith('image/');
  const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf');
  const isWord = 
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx');
  const isExcel = 
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    fileType === 'application/vnd.ms-excel' ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls');
  const isCSV = fileType === 'text/csv' || fileName.endsWith('.csv');

  const canPreview = isImage || isWord || isExcel || isCSV;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg truncate">{attachment.file_name}</DialogTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span>{formatFileSize(attachment.file_size)}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(attachment.uploaded_at), { addSuffix: true })}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canPreview && fileUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(attachment)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
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
                Click Download to view the file
              </p>
            </div>
          ) : isImage ? (
            <div className="flex items-center justify-center bg-muted/20 rounded-lg p-4 h-full">
              <img
                src={fileUrl}
                alt={attachment.file_name}
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          ) : isPDF ? (
            <PDFViewer url={fileUrl} />
          ) : isWord ? (
            <WordViewer url={fileUrl} />
          ) : isExcel ? (
            <ExcelViewer url={fileUrl} />
          ) : isCSV ? (
            <CSVViewer url={fileUrl} />
          ) : null}
        </div>

        {attachment.description && (
          <div className="pt-3 border-t text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium">Description:</span> {attachment.description}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
