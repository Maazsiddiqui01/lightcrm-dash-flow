import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CSVViewerProps {
  url: string;
}

export function CSVViewer({ url }: CSVViewerProps) {
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadCSV = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Fetch the CSV file
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch CSV file');
        
        const text = await response.text();
        
        // Parse CSV
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }
            
            setHeaders(results.meta.fields || []);
            setData(results.data);
            setIsLoading(false);
          },
          error: (err) => {
            setError(err.message || 'Failed to parse CSV');
            setIsLoading(false);
          }
        });
      } catch (err) {
        console.error('Error loading CSV:', err);
        setError(err instanceof Error ? err.message : 'Failed to load CSV');
        setIsLoading(false);
      }
    };

    loadCSV();
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

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No data found in CSV file</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto border rounded-lg bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header, index) => (
                <TableHead key={index} className="font-semibold whitespace-nowrap">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {headers.map((header, colIndex) => (
                  <TableCell key={colIndex} className="whitespace-nowrap">
                    {row[header] || ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-2 text-xs text-muted-foreground text-right">
        {data.length} rows × {headers.length} columns
      </div>
    </div>
  );
}
