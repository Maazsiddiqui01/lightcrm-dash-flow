import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Target, Filter, CheckCircle2, AlertCircle, Undo2 } from "lucide-react";
import { UserCard } from "./UserCard";
import { AssignmentContactsTable } from "./AssignmentContactsTable";
import { AssignmentOpportunitiesTable } from "./AssignmentOpportunitiesTable";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserWithCounts {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  contacts_count: number;
  opportunities_count: number;
}

interface LastAssignment {
  type: 'contacts' | 'opportunities';
  ids: string[];
  userId: string;
  timestamp: number;
}

export function DataAssignmentHub() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedOpportunityIds, setSelectedOpportunityIds] = useState<string[]>([]);
  const [lastAssignment, setLastAssignment] = useState<LastAssignment | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{ userId: string; type: 'contacts' | 'opportunities' } | null>(null);
  
  // Fetch users with assignment counts
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users-with-counts'],
    queryFn: async () => {
      const { data: usersData, error: usersError } = await supabase.functions.invoke('list_users');
      if (usersError) throw usersError;
      
      const usersList = usersData?.users || [];
      
      const usersWithCounts = await Promise.all(
        usersList.map(async (user: any) => {
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
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name,
            role: user.role,
            contacts_count: contactsResult.count || 0,
            opportunities_count: oppsResult.count || 0
          };
        })
      );
      
      return usersWithCounts as UserWithCounts[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Bulk assign contacts mutation
  const assignContactsMutation = useMutation({
    mutationFn: async ({ contactIds, userId }: { contactIds: string[]; userId: string }) => {
      const { error } = await supabase
        .from('contacts_raw')
        .update({ assigned_to: userId })
        .in('id', contactIds);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-contacts'] });
      
      setLastAssignment({
        type: 'contacts',
        ids: variables.contactIds,
        userId: variables.userId,
        timestamp: Date.now()
      });
      
      toast({
        title: "Contacts Assigned",
        description: `Successfully assigned ${variables.contactIds.length} contact(s)`,
        duration: 3000,
      });
      
      setSelectedContactIds([]);
    },
    onError: (error) => {
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Bulk assign opportunities mutation
  const assignOpportunitiesMutation = useMutation({
    mutationFn: async ({ opportunityIds, userId }: { opportunityIds: string[]; userId: string }) => {
      const { error } = await supabase
        .from('opportunities_raw')
        .update({ assigned_to: userId })
        .in('id', opportunityIds);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-opportunities'] });
      
      setLastAssignment({
        type: 'opportunities',
        ids: variables.opportunityIds,
        userId: variables.userId,
        timestamp: Date.now()
      });
      
      toast({
        title: "Opportunities Assigned",
        description: `Successfully assigned ${variables.opportunityIds.length} opportunity(ies)`,
        duration: 3000,
      });
      
      setSelectedOpportunityIds([]);
    },
    onError: (error) => {
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Undo last assignment
  const undoAssignment = useMutation({
    mutationFn: async (assignment: LastAssignment) => {
      const table = assignment.type === 'contacts' ? 'contacts_raw' : 'opportunities_raw';
      const { error } = await supabase
        .from(table)
        .update({ assigned_to: null })
        .in('id', assignment.ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-opportunities'] });
      
      toast({
        title: "Assignment Undone",
        description: "Successfully reverted the last assignment",
      });
      
      setLastAssignment(null);
    }
  });

  const handleAssignSelected = (userId: string, type: 'contacts' | 'opportunities') => {
    const selectedIds = type === 'contacts' ? selectedContactIds : selectedOpportunityIds;
    
    if (selectedIds.length === 0) {
      toast({
        title: "No Selection",
        description: `Please select at least one ${type === 'contacts' ? 'contact' : 'opportunity'} to assign`,
        variant: "destructive",
      });
      return;
    }

    // Show confirmation for bulk assignments > 10
    if (selectedIds.length > 10) {
      setPendingAssignment({ userId, type });
      setShowBulkConfirm(true);
      return;
    }

    // Proceed with assignment
    executeAssignment(userId, type);
  };

  const executeAssignment = (userId: string, type: 'contacts' | 'opportunities') => {
    if (type === 'contacts') {
      assignContactsMutation.mutate({ contactIds: selectedContactIds, userId });
    } else {
      assignOpportunitiesMutation.mutate({ opportunityIds: selectedOpportunityIds, userId });
    }
  };

  const confirmBulkAssignment = () => {
    if (pendingAssignment) {
      executeAssignment(pendingAssignment.userId, pendingAssignment.type);
    }
    setShowBulkConfirm(false);
    setPendingAssignment(null);
  };

  // Clear undo after 30 seconds
  useEffect(() => {
    if (lastAssignment) {
      const timer = setTimeout(() => {
        setLastAssignment(null);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [lastAssignment]);

  const filteredUsers = users?.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Panel - Users */}
      <Card className="lg:w-80 p-4 h-fit lg:sticky lg:top-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Users</h3>
            <p className="text-sm text-muted-foreground">Select a user or assign to any user below</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Undo Button */}
          {lastAssignment && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => undoAssignment.mutate(lastAssignment)}
              disabled={undoAssignment.isPending}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Undo Last Assignment
            </Button>
          )}

          {/* User Cards */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {usersLoading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : (
              <>
                <UserCard
                  user={null}
                  isSelected={selectedUserId === null}
                  onClick={() => setSelectedUserId(null)}
                  showAll
                />
                {filteredUsers?.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    isSelected={selectedUserId === user.id}
                    onClick={() => setSelectedUserId(user.id)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Right Panel - Data Tables */}
      <div className="flex-1">
        <Card className="p-4">
          <Tabs defaultValue="contacts" className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <TabsList>
                <TabsTrigger value="contacts" className="gap-2">
                  <Users className="h-4 w-4" />
                  Contacts
                  {selectedContactIds.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedContactIds.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="opportunities" className="gap-2">
                  <Target className="h-4 w-4" />
                  Opportunities
                  {selectedOpportunityIds.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedOpportunityIds.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Switch
                  id="unassigned-filter"
                  checked={showUnassignedOnly}
                  onCheckedChange={setShowUnassignedOnly}
                />
                <Label htmlFor="unassigned-filter" className="cursor-pointer">
                  Unassigned Only
                </Label>
              </div>
            </div>

            <TabsContent value="contacts" className="mt-0">
              {selectedContactIds.length > 0 && (
                <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {selectedContactIds.length} contact(s) selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(userId) => handleAssignSelected(userId, 'contacts')}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedContactIds([])}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
              
              <AssignmentContactsTable
                filterUserId={selectedUserId}
                showUnassignedOnly={showUnassignedOnly}
                selectedIds={selectedContactIds}
                onSelectionChange={setSelectedContactIds}
              />
            </TabsContent>

            <TabsContent value="opportunities" className="mt-0">
              {selectedOpportunityIds.length > 0 && (
                <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {selectedOpportunityIds.length} opportunity(ies) selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(userId) => handleAssignSelected(userId, 'opportunities')}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOpportunityIds([])}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
              
              <AssignmentOpportunitiesTable
                filterUserId={selectedUserId}
                showUnassignedOnly={showUnassignedOnly}
                selectedIds={selectedOpportunityIds}
                onSelectionChange={setSelectedOpportunityIds}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Bulk Confirmation Dialog */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to assign{" "}
              {pendingAssignment?.type === 'contacts' 
                ? selectedContactIds.length 
                : selectedOpportunityIds.length}{" "}
              {pendingAssignment?.type} to a user. This action can be undone within 30 seconds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkAssignment}>
              Confirm Assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
