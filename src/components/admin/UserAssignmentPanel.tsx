import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserAssignment {
  user_id: string;
  email: string;
  full_name?: string;
  contacts_count: number;
  opportunities_count: number;
}

export function UserAssignmentPanel() {
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['user-assignments'],
    queryFn: async () => {
      // Get all users
      const { data: usersData, error: usersError } = await supabase.functions.invoke('list_users');
      if (usersError) throw usersError;
      
      const users = usersData?.users || [];
      
      // Get assignment counts for each user
      const assignmentPromises = users.map(async (user: any) => {
        const [contactsResult, oppsResult] = await Promise.all([
          supabase
            .from('contacts_raw')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_to', user.id),
          supabase
            .from('opportunities_raw')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_to', user.id)
        ]);
        
        return {
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
          contacts_count: contactsResult.count || 0,
          opportunities_count: oppsResult.count || 0
        };
      });
      
      return await Promise.all(assignmentPromises) as UserAssignment[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Data Assignments</CardTitle>
          <CardDescription>Overview of data assigned to each user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Data Assignments</CardTitle>
        <CardDescription>Overview of data assigned to each user</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {assignments?.map((assignment) => (
            <div
              key={assignment.user_id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">{assignment.full_name || assignment.email}</p>
                <p className="text-sm text-muted-foreground">{assignment.email}</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{assignment.contacts_count}</span>
                  <span className="text-xs text-muted-foreground">contacts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{assignment.opportunities_count}</span>
                  <span className="text-xs text-muted-foreground">opportunities</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
