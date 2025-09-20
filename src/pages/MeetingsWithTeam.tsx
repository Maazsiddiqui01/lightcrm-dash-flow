import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SkeletonLoader } from "@/components/shared/SkeletonLoader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MeetingData {
  lead_name: string;
  avg_minutes_per_week: number;
}

export function MeetingsWithTeam() {
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [data, setData] = React.useState<MeetingData[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: result, error: rpcError } = await supabase.rpc(
        'avg_minutes_per_week_by_lead',
        { 
          start_date: startDate || null, 
          end_date: endDate || null 
        }
      );

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw rpcError;
      }

      setData((result as MeetingData[]) || []);
    } catch (err) {
      console.error('Error fetching meeting data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Could not load meeting data';
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Could not load meeting data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, toast]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatMinutes = (minutes: number) => {
    if (minutes === 0) return "0";
    return minutes.toFixed(0);
  };

  const actions = (
    <Button
      variant="ghost"
      size="sm"
      onClick={fetchData}
      disabled={loading}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
      Refresh
    </Button>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        title="Meetings with Team"
        description="Track time spent in 1:1 meetings with LG team members"
        actions={actions}
      />

      <main className="flex-1 p-6 space-y-6 bg-background overflow-auto">
        {/* Date Range Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meeting Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meeting Time Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <ErrorState
                title="Failed to load meeting data"
                description={error}
                onRetry={fetchData}
              />
            ) : loading ? (
              <SkeletonLoader type="table" count={5} />
            ) : data.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No meetings found"
                description="No meetings found in this date range. Try adjusting your date filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left font-semibold text-white">Full Name</TableHead>
                      <TableHead className="text-left font-semibold text-white">Average Time per Week (minutes)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row.lead_name}>
                        <TableCell className="font-medium">{row.lead_name}</TableCell>
                        <TableCell>{formatMinutes(row.avg_minutes_per_week)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}