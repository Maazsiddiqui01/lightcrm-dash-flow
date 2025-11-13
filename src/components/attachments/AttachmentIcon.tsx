import { FileText, File, Image, FileSpreadsheet, Presentation } from 'lucide-react';

interface AttachmentIconProps {
  fileType: string;
  className?: string;
}

export function AttachmentIcon({ fileType, className = "h-4 w-4" }: AttachmentIconProps) {
  if (fileType.startsWith('image/')) {
    return <Image className={className} />;
  }
  
  if (fileType.includes('pdf')) {
    return <FileText className={className} />;
  }
  
  if (fileType.includes('sheet') || fileType.includes('excel')) {
    return <FileSpreadsheet className={className} />;
  }
  
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
    return <Presentation className={className} />;
  }
  
  return <File className={className} />;
}
