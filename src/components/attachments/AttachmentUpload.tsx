import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { AttachmentIcon } from './AttachmentIcon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';

interface AttachmentUploadProps {
  onUpload: (file: File, description?: string) => void;
  isUploading?: boolean;
  maxSizeMB?: number;
}

export function AttachmentUpload({ onUpload, isUploading, maxSizeMB = 50 }: AttachmentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv'
  ].join(',');

  const validateFile = (file: File): string | null => {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `File size must be less than ${maxSizeMB}MB`;
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }
    setSelectedFile(file);
    setShowConfirmDialog(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleConfirmUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile, description);
      setSelectedFile(null);
      setDescription('');
      setShowConfirmDialog(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setDescription('');
    setShowConfirmDialog(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 bg-accent rounded-full">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              Drag and drop a file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Word, Excel, PowerPoint, Images, or Text files (max {maxSizeMB}MB)
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Choose File
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={acceptedTypes}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Confirm file upload and optionally add a description
            </DialogDescription>
          </DialogHeader>
          
          {selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                <AttachmentIcon fileType={selectedFile.type} className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add a description for this file..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
