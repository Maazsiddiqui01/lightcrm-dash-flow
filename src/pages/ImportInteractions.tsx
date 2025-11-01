import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { importCSVInteractions } from "@/utils/csvInteractionsImporter";
import { Loader2, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ImportInteractions() {
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const content = await file.text();
      const result = await importCSVInteractions(content);
      
      // Invalidate all contact-related queries to refresh with updated most_recent_contact and follow_up_date
      queryClient.invalidateQueries({ queryKey: ['contacts-with-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
      queryClient.invalidateQueries({ queryKey: ['all-contacts-view'] });
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
      queryClient.invalidateQueries({ queryKey: ['interaction-stats'] });
      
      toast({
        title: "Success",
        description: `Imported ${result.inserted} of ${result.total} interactions (${result.failed} failed). Contact data refreshed.`,
      });
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      // Reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Import Interactions</h1>
      
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-4">
          Upload CSV file to import interactions
        </p>
        
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={importing}
          className="hidden"
          id="csv-upload"
        />
        
        <label htmlFor="csv-upload">
          <Button disabled={importing} asChild>
            <span>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importing ? "Importing..." : "Select CSV File"}
            </span>
          </Button>
        </label>
      </div>
    </div>
  );
}
