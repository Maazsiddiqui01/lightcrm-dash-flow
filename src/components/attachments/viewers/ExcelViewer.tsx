import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, AlertCircle, Sheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ExcelViewerProps {
  url: string;
}

export function ExcelViewer({ url }: ExcelViewerProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [currentSheet, setCurrentSheet] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadWorkbook = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Fetch the file as array buffer
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch spreadsheet');
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Parse the workbook
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        setWorkbook(wb);
        
        // Set first sheet as default
        if (wb.SheetNames.length > 0) {
          setCurrentSheet(wb.SheetNames[0]);
        }
      } catch (err) {
        console.error('Error loading Excel document:', err);
        setError(err instanceof Error ? err.message : 'Failed to load spreadsheet');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkbook();
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

  if (!workbook || workbook.SheetNames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No sheets found in workbook</p>
      </div>
    );
  }

  const currentSheetData = XLSX.utils.sheet_to_json<any[]>(
    workbook.Sheets[currentSheet],
    { header: 1, defval: '' }
  );

  const headers = currentSheetData[0] || [];
  const rows = currentSheetData.slice(1);

  return (
    <div className="flex flex-col h-full">
      {workbook.SheetNames.length > 1 && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-muted/50 rounded-lg overflow-x-auto">
          {workbook.SheetNames.map((sheetName) => (
            <Button
              key={sheetName}
              variant={currentSheet === sheetName ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentSheet(sheetName)}
              className="gap-2 whitespace-nowrap"
            >
              <Sheet className="h-3 w-3" />
              {sheetName}
            </Button>
          ))}
        </div>
      )}
      
      <div className="flex-1 overflow-auto border rounded-lg bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header: any, index: number) => (
                <TableHead key={index} className="font-semibold whitespace-nowrap">
                  {header || `Column ${index + 1}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row: any[], rowIndex: number) => (
              <TableRow key={rowIndex}>
                {headers.map((_: any, colIndex: number) => (
                  <TableCell key={colIndex} className="whitespace-nowrap">
                    {row[colIndex] !== undefined && row[colIndex] !== null
                      ? String(row[colIndex])
                      : ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {rows.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No data in this sheet
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-muted-foreground text-right">
        {rows.length} rows × {headers.length} columns
      </div>
    </div>
  );
}
