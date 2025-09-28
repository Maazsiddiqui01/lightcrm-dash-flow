import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, List, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LookupGroup {
  name: string;
  description: string;
  field: string;
  table: string;
  values: string[];
}

interface LookupManagerProps {
  tableScope?: "contacts" | "opportunities" | "global";
}

export function LookupManager({ tableScope = "global" }: LookupManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Mock lookup data - in real implementation, this would come from database
  const lookupGroups: LookupGroup[] = [
    {
      name: "LG Sectors",
      description: "Main business sectors",
      field: "lg_sector", 
      table: "contacts_raw",
      values: ["Services", "Industrials", "Healthcare", "General"]
    },
    {
      name: "Contact Types",
      description: "Contact classification",
      field: "contact_type",
      table: "contacts_raw", 
      values: ["Primary", "Secondary", "Referral"]
    },
    {
      name: "Delta Types",
      description: "Interaction types",
      field: "delta_type",
      table: "contacts_raw",
      values: ["Email", "Meeting", "Call", "Event"]
    },
    {
      name: "Opportunity Status",
      description: "Deal pipeline status",
      field: "status",
      table: "opportunities_raw",
      values: ["Active", "On Hold", "Closed Won", "Closed Lost", "Pipeline"]
    },
    {
      name: "Opportunity Tiers",
      description: "Deal priority levels",
      field: "tier", 
      table: "opportunities_raw",
      values: ["1-Active", "2-Longer Term", "3-For Review", "4-Likely Pass", "5-Passed"]
    },
    {
      name: "Ownership Types",
      description: "Company ownership structure",
      field: "ownership_type",
      table: "opportunities_raw",
      values: ["Family Owned", "Founder Owned", "PE Owned", "Public", "Other"]
    },
    {
      name: "Platform/Add-on",
      description: "Investment type classification",
      field: "platform_add_on",
      table: "opportunities_raw", 
      values: ["Platform", "Add-on", "Add-on: Aspire Bakeries", "Add-on: Creation Technologies", "Add-on: GSF", "Add-on: Kleinfelder", "Add-on: Lightwave", "Add-on: MMS", "Both"]
    },
    {
      name: "Focus Areas",
      description: "LG investment focus areas",
      field: "lg_focus_area_1",
      table: "contacts_raw",
      values: [
        "HC: Payor & Employer Services",
        "HC: Revenue Cycle Management", 
        "HC: Services (Non-Clinical)",
        "HC: Clinical Services",
        "HC: Tech Enablement",
        "HC: Pharma & Biotech Services",
        "Capital Goods / Equipment",
        "Aerospace & Defense",
        "Automotive & Transportation",
        "Chemicals & Materials",
        "Energy & Utilities",
        "Construction & Infrastructure",
        "Waste & Environmental Services",
        "Business Services",
        "Financial Services",
        "Technology Services",
        "Education & Training",
        "Media & Marketing",
        "Logistics & Supply Chain",
        "Real Estate & Facilities",
        "Distribution",
        "Consumer & Retail",
        "Food & Beverage",
        "Telecommunications",
        "Government Services",
        "Non-Profit",
        "Other"
      ]
    }
  ];

  const filteredGroups = lookupGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesScope = tableScope === "global" || 
      (tableScope === "contacts" && group.table === "contacts_raw") ||
      (tableScope === "opportunities" && group.table === "opportunities_raw");
    
    return matchesSearch && matchesScope;
  });

  const handleAddValue = (groupName: string) => {
    toast({
      title: "Add Value",
      description: `Adding new value to ${groupName}. This will update all related dropdowns.`,
    });
  };

  const handleEditValue = (groupName: string, value: string) => {
    toast({
      title: "Edit Value", 
      description: `Editing "${value}" in ${groupName}. This will update existing data references.`,
    });
  };

  const handleDeleteValue = (groupName: string, value: string) => {
    toast({
      title: "Delete Value",
      description: `Deleting "${value}" from ${groupName}. This will require data migration for existing references.`,
      variant: "destructive"
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Lookup Groups List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Lookup Groups
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-auto">
          {filteredGroups.map((group) => (
            <button
              key={group.name}
              onClick={() => setSelectedGroup(group.name)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedGroup === group.name
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <div className="font-medium">{group.name}</div>
              <div className="text-xs text-muted-foreground mb-2">{group.description}</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {group.table}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {group.values.length} values
                </Badge>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Values Management */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {selectedGroup ? `${selectedGroup} Values` : 'Select a Lookup Group'}
              </CardTitle>
              {selectedGroup && (
                <CardDescription>
                  Manage dropdown values for {selectedGroup.toLowerCase()}
                </CardDescription>
              )}
            </div>
            {selectedGroup && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Value
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Value</DialogTitle>
                    <DialogDescription>
                      Add a new option to {selectedGroup}
                    </DialogDescription>
                  </DialogHeader>
                  <AddValueForm 
                    groupName={selectedGroup}
                    onSubmit={() => {
                      handleAddValue(selectedGroup);
                      setIsAddDialogOpen(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedGroup ? (
            <div className="space-y-3 max-h-96 overflow-auto">
              {lookupGroups
                .find(g => g.name === selectedGroup)
                ?.values.map((value) => (
                  <div
                    key={value}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{value}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditValue(selectedGroup, value)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteValue(selectedGroup, value)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Select a lookup group from the left to manage its values
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AddValueForm({ groupName, onSubmit }: { groupName: string; onSubmit: () => void }) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="new-value">New Value</Label>
        <Input
          id="new-value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Enter new ${groupName.toLowerCase()} option`}
        />
      </div>
      <Button onClick={onSubmit} className="w-full" disabled={!value.trim()}>
        Add Value
      </Button>
    </div>
  );
}