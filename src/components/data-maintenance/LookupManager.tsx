import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LookupManagerProps {
  tableScope?: 'contacts' | 'opportunities' | 'global';
}

interface LookupValue {
  id: string;
  scope: string;
  field_name: string;
  value: string;
  label: string | null;
  sort_order: number;
  is_active: boolean;
}

interface LookupGroup {
  field_name: string;
  scope: string;
  values: LookupValue[];
  count: number;
}

export function LookupManager({ tableScope }: LookupManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [lookupGroups, setLookupGroups] = useState<LookupGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [editingValue, setEditingValue] = useState<LookupValue | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadLookupValues();
  }, [tableScope]);

  const loadLookupValues = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('lookup_values')
        .select('*')
        .eq('is_active', true)
        .order('field_name')
        .order('sort_order');

      if (tableScope) {
        query = query.eq('scope', tableScope);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by field_name
      const grouped = (data || []).reduce((acc, item) => {
        const key = `${item.scope}_${item.field_name}`;
        if (!acc[key]) {
          acc[key] = {
            field_name: item.field_name,
            scope: item.scope,
            values: [],
            count: 0
          };
        }
        acc[key].values.push(item);
        acc[key].count++;
        return acc;
      }, {} as Record<string, LookupGroup>);

      setLookupGroups(Object.values(grouped));
    } catch (error) {
      console.error('Error loading lookup values:', error);
      toast({
        title: "Error",
        description: "Failed to load lookup values",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = lookupGroups.filter(group =>
    group.field_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.values.some(v => v.value.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedGroupData = lookupGroups.find(
    g => `${g.scope}_${g.field_name}` === selectedGroup
  );

  const handleAddValue = async () => {
    if (!selectedGroupData || !newValue.trim()) return;

    try {
      const { error } = await supabase
        .from('lookup_values')
        .insert({
          scope: selectedGroupData.scope,
          field_name: selectedGroupData.field_name,
          value: newValue.trim(),
          label: newValue.trim(),
          sort_order: selectedGroupData.values.length
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Value added successfully"
      });

      setNewValue("");
      setIsAddDialogOpen(false);
      loadLookupValues();
    } catch (error: any) {
      console.error('Error adding value:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add value",
        variant: "destructive"
      });
    }
  };

  const handleEditValue = async () => {
    if (!editingValue) return;

    try {
      const { error } = await supabase
        .from('lookup_values')
        .update({
          value: editingValue.value,
          label: editingValue.label || editingValue.value,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingValue.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Value updated successfully"
      });

      setIsEditDialogOpen(false);
      setEditingValue(null);
      loadLookupValues();
    } catch (error) {
      console.error('Error updating value:', error);
      toast({
        title: "Error",
        description: "Failed to update value",
        variant: "destructive"
      });
    }
  };

  const handleDeactivateValue = async (valueId: string) => {
    if (!confirm("Are you sure you want to deactivate this value? It will be hidden from dropdowns but can be reactivated later.")) return;

    try {
      const { error } = await supabase
        .from('lookup_values')
        .update({ is_active: false })
        .eq('id', valueId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Value deactivated successfully"
      });

      loadLookupValues();
    } catch (error) {
      console.error('Error deactivating value:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate value",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      {/* Left: Lookup Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Lookup Groups
          </CardTitle>
          <CardDescription>
            Select a field to manage its dropdown values
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search lookup groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : filteredGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lookup groups found</p>
          ) : (
            filteredGroups.map((group) => {
              const groupKey = `${group.scope}_${group.field_name}`;
              return (
                <div
                  key={groupKey}
                  onClick={() => setSelectedGroup(groupKey)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedGroup === groupKey
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium capitalize">
                        {group.field_name.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {group.scope} • {group.count} values
                      </p>
                    </div>
                    <Badge variant="outline">{group.count}</Badge>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Right: Values for Selected Group */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dropdown Values</CardTitle>
              <CardDescription>
                {selectedGroupData
                  ? `Managing values for ${selectedGroupData.field_name}`
                  : "Select a group to view its values"}
              </CardDescription>
            </div>
            {selectedGroupData && (
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Value
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-auto">
          {!selectedGroupData ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select a lookup group to manage its values</p>
            </div>
          ) : selectedGroupData.values.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No values yet</p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Value
              </Button>
            </div>
          ) : (
            selectedGroupData.values.map((value) => (
              <div
                key={value.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{value.label || value.value}</p>
                  {value.label !== value.value && (
                    <p className="text-sm text-muted-foreground">{value.value}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingValue(value);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeactivateValue(value.id)}
                    title="Deactivate (hide from dropdowns)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add Value Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Value</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Enter new value..."
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddValue();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddValue} disabled={!newValue.trim()}>
              Add Value
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Value Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Value</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Value</label>
              <Input
                value={editingValue?.value || ""}
                onChange={(e) =>
                  setEditingValue(prev =>
                    prev ? { ...prev, value: e.target.value } : null
                  )
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Label (Display Name)</label>
              <Input
                value={editingValue?.label || ""}
                onChange={(e) =>
                  setEditingValue(prev =>
                    prev ? { ...prev, label: e.target.value } : null
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditValue}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}