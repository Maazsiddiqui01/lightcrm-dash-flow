import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Database, Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { editableColumns, type EditableConfig } from "@/config/editableColumns";
import { useToast } from "@/hooks/use-toast";

interface ColumnManagerProps {
  tableName: keyof EditableConfig;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
  is_editable: boolean;
  field_type?: string;
  options?: string[];
}

export function ColumnManager({ tableName }: ColumnManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "editable" | "system">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  // Get current columns from editableColumns config
  const currentConfig = editableColumns[tableName] || {};
  
  // Mock column data - in a real implementation, this would come from a database query
  const mockColumns: ColumnInfo[] = Object.entries(currentConfig).map(([name, config]) => ({
    column_name: name,
    data_type: config.type === 'text' ? 'text' : 
               config.type === 'number' ? 'numeric' :
               config.type === 'boolean' ? 'boolean' :
               config.type === 'date' ? 'date' : 'text',
    is_nullable: !config.required,
    column_default: null,
    is_editable: true,
    field_type: config.type,
    options: config.options
  }));

  // Add some system columns
  const systemColumns: ColumnInfo[] = [
    { column_name: 'id', data_type: 'uuid', is_nullable: false, column_default: 'gen_random_uuid()', is_editable: false },
    { column_name: 'created_at', data_type: 'timestamp', is_nullable: false, column_default: 'now()', is_editable: false },
    { column_name: 'updated_at', data_type: 'timestamp', is_nullable: false, column_default: 'now()', is_editable: false }
  ];

  const allColumns = [...mockColumns, ...systemColumns];

  const filteredColumns = allColumns.filter(col => {
    const matchesSearch = col.column_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filterType === "all" ||
      (filterType === "editable" && col.is_editable) ||
      (filterType === "system" && !col.is_editable);
    
    return matchesSearch && matchesFilter;
  });

  const handleAddColumn = () => {
    toast({
      title: "Add Column",
      description: "Column addition feature coming soon. This will create database migrations automatically.",
    });
    setIsAddDialogOpen(false);
  };

  const handleEditColumn = (columnName: string) => {
    toast({
      title: "Edit Column",
      description: `Editing ${columnName} - this will update both database schema and frontend configuration.`,
    });
  };

  const handleDeleteColumn = (columnName: string) => {
    toast({
      title: "Delete Column", 
      description: `Deleting ${columnName} - this operation will require safety checks for data dependencies.`,
      variant: "destructive"
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-100 text-blue-800';
      case 'select': return 'bg-green-100 text-green-800';
      case 'number': case 'numeric': return 'bg-orange-100 text-orange-800';
      case 'boolean': return 'bg-purple-100 text-purple-800';
      case 'date': case 'timestamp': return 'bg-pink-100 text-pink-800';
      case 'textarea': return 'bg-indigo-100 text-indigo-800';
      case 'email': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Column Management - {tableName}
            </CardTitle>
            <CardDescription>
              Manage database columns and field configurations
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Column</DialogTitle>
                <DialogDescription>
                  Create a new column in the {tableName} table
                </DialogDescription>
              </DialogHeader>
              <AddColumnForm onSubmit={handleAddColumn} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4 pt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Columns</SelectItem>
              <SelectItem value="editable">Editable Only</SelectItem>
              <SelectItem value="system">System Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-3">
          {filteredColumns.map((column) => (
            <div
              key={column.column_name}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-medium">{column.column_name}</h4>
                  <Badge className={getTypeColor(column.field_type || column.data_type)}>
                    {column.field_type || column.data_type}
                  </Badge>
                  {!column.is_nullable && (
                    <Badge variant="outline">Required</Badge>
                  )}
                  {!column.is_editable && (
                    <Badge variant="secondary">System</Badge>
                  )}
                </div>
                {column.options && (
                  <div className="text-sm text-muted-foreground">
                    Options: {column.options.slice(0, 3).join(", ")}
                    {column.options.length > 3 && ` +${column.options.length - 3} more`}
                  </div>
                )}
              </div>
              
              {column.is_editable && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditColumn(column.column_name)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteColumn(column.column_name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AddColumnForm({ onSubmit }: { onSubmit: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    type: "text",
    required: false,
    defaultValue: "",
    options: ""
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="column-name">Column Name</Label>
        <Input
          id="column-name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., new_field"
        />
      </div>

      <div>
        <Label htmlFor="column-type">Field Type</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="textarea">Textarea</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="boolean">Boolean</SelectItem>
            <SelectItem value="select">Select/Dropdown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.type === "select" && (
        <div>
          <Label htmlFor="options">Options (comma-separated)</Label>
          <Textarea
            id="options"
            value={formData.options}
            onChange={(e) => setFormData(prev => ({ ...prev, options: e.target.value }))}
            placeholder="Option 1, Option 2, Option 3"
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="required"
          checked={formData.required}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, required: checked }))}
        />
        <Label htmlFor="required">Required field</Label>
      </div>

      <div>
        <Label htmlFor="default-value">Default Value (optional)</Label>
        <Input
          id="default-value"
          value={formData.defaultValue}
          onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
          placeholder="Enter default value"
        />
      </div>

      <Button onClick={onSubmit} className="w-full">
        Add Column
      </Button>
    </div>
  );
}