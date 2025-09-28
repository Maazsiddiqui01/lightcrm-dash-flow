import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Database, Search, Filter, Plus } from "lucide-react";
import { editableColumns, type EditableConfig } from "@/config/editableColumns";
import { getTableColumns } from "@/lib/supabase/getTableColumns";
import { ColumnDetailModal } from "./ColumnDetailModal";
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
  display_name?: string;
}

export function ColumnManager({ tableName }: ColumnManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "editable" | "system">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<{ name: string; displayName: string } | null>(null);
  const { toast } = useToast();

  // Get table columns with display names
  const tableColumns = getTableColumns(tableName);
  const currentConfig = editableColumns[tableName] || {};
  
  // Combine database columns with editable config
  const allColumns: ColumnInfo[] = tableColumns.map(col => {
    const config = currentConfig[col.name];
    return {
      column_name: col.name,
      data_type: col.type,
      is_nullable: col.nullable,
      column_default: null,
      is_editable: !!config,
      field_type: config?.type || col.type,
      options: config?.options,
      display_name: col.displayName
    };
  });

  const filteredColumns = allColumns.filter(col => {
    const matchesSearch = (col.display_name || col.column_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         col.column_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filterType === "all" ||
      (filterType === "editable" && col.is_editable) ||
      (filterType === "system" && !col.is_editable);
    
    return matchesSearch && matchesFilter;
  });

  const handleConfigureColumn = (columnName: string, displayName?: string) => {
    setSelectedColumn({ name: columnName, displayName: displayName || columnName });
    setIsModalOpen(true);
  };

  const handleAddColumn = () => {
    setSelectedColumn(null);
    setIsModalOpen(true);
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
          <Button onClick={handleAddColumn}>
            <Plus className="h-4 w-4 mr-2" />
            Add Column
          </Button>
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
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
              onClick={() => column.is_editable && handleConfigureColumn(column.column_name, column.display_name)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div>
                    <h4 className="font-medium">{column.display_name || column.column_name}</h4>
                    <p className="text-sm text-muted-foreground">{column.column_name}</p>
                  </div>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfigureColumn(column.column_name, column.display_name);
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>

      <ColumnDetailModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        tableName={tableName}
        columnName={selectedColumn?.name || null}
        displayName={selectedColumn?.displayName || null}
      />
    </Card>
  );
}