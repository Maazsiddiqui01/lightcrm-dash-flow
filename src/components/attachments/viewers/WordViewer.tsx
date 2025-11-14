import { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { Loader2, AlertCircle } from 'lucide-react';

interface WordViewerProps {
  url: string;
}

export function WordViewer({ url }: WordViewerProps) {
  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Fetch the file as array buffer
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch document');
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Convert to HTML using mammoth
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtml(result.value);
        
        // Log any warnings (optional)
        if (result.messages.length > 0) {
          console.warn('Mammoth warnings:', result.messages);
        }
      } catch (err) {
        console.error('Error loading Word document:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [url]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none bg-background p-6 rounded-lg border overflow-auto max-h-[70vh]">
      <style dangerouslySetInnerHTML={{__html: `
        .word-content {
          font-family: system-ui, -apple-system, sans-serif;
          line-height: 1.6;
        }
        .word-content p {
          margin-bottom: 1em;
        }
        .word-content h1, .word-content h2, .word-content h3 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
        }
        .word-content ul, .word-content ol {
          margin-left: 1.5em;
          margin-bottom: 1em;
        }
        .word-content table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1em;
        }
        .word-content table td, .word-content table th {
          border: 1px solid #ddd;
          padding: 8px;
        }
        .word-content img {
          max-width: 100%;
          height: auto;
        }
      `}} />
      <div 
        dangerouslySetInnerHTML={{ __html: html }}
        className="word-content"
      />
    </div>
  );
}
