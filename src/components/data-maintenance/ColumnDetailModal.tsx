import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, Trash2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ColumnDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  tableName: 'contacts_raw' | 'opportunities_raw';
  columnName: string | null;
  displayName: string | null;
}

interface ColumnDetails {
  name: string;
  displayName: string;
  type: string;
  nullable: boolean;
  defaultValue: string;
  options: string[];
  validationRules: ValidationRule[];
}

interface ValidationRule {
  id: string;
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value: string;
  message: string;
}

export function ColumnDetailModal({
  open,
  onOpenChange,
  onSuccess,
  tableName,
  columnName,
  displayName
}: ColumnDetailModalProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [columnDetails, setColumnDetails] = useState<ColumnDetails>({
    name: columnName || '',
    displayName: displayName || '',
    type: 'text',
    nullable: true,
    defaultValue: '',
    options: [],
    validationRules: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newOption, setNewOption] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (columnName) {
      loadColumnDetails();
    } else {
      // Reset for new column
      setColumnDetails({
        name: '',
        displayName: '',
        type: 'text',
        nullable: true,
        defaultValue: '',
        options: [],
        validationRules: []
      });
    }
  }, [columnName, tableName]);

  const loadColumnDetails = async () => {
    if (!columnName) return;
    
    setIsLoading(true);
    try {
      // Load from editableColumns config and getTableColumns display names
      const response = await supabase.functions.invoke('column_manager', {
        body: {
          action: 'get_details',
          tableName,
          columnName
        }
      });

      if (response.error) throw response.error;
      
      if (response.data) {
        setColumnDetails(response.data);
      }
    } catch (error) {
      console.error('Error loading column details:', error);
      toast({
        title: "Error",
        description: "Failed to load column details",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('column_manager', {
        body: {
          action: columnName ? 'update' : 'create',
          tableName,
          columnDetails
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Column ${columnName ? 'updated' : 'created'} successfully`,
      });

      onOpenChange(false);
      // Trigger refresh of parent component
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving column:', error);
      toast({
        title: "Error",
        description: "Failed to save column changes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!columnName) return;
    
    // Check if column is protected
    const { data: isProtected } = await supabase.rpc('is_column_protected', {
      p_table: tableName,
      p_column: columnName
    });

    if (isProtected) {
      // Get the reason why it's protected
      const { data: protectionInfo } = await supabase
        .from('protected_columns')
        .select('reason')
        .eq('table_name', tableName)
        .eq('column_name', columnName)
        .single();

      toast({
        title: "Cannot Delete Protected Column",
        description: protectionInfo?.reason || "This column is protected and cannot be deleted.",
        variant: "destructive"
      });
      return;
    }
    
    if (!confirm(`⚠️ WARNING: Are you sure you want to delete the column "${columnName}"?\n\nThis will:\n- Permanently delete all data in this column\n- Cannot be undone\n- May break existing functionality\n\nType the column name to confirm.`)) {
      return;
    }

    const userInput = prompt(`Type "${columnName}" to confirm deletion:`);
    if (userInput !== columnName) {
      toast({
        title: "Deletion Cancelled",
        description: "Column name did not match",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('column_manager', {
        body: {
          action: 'delete',
          tableName,
          columnName
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "Column deleted successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error deleting column:', error);
      toast({
        title: "Error",
        description: "Failed to delete column",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addOption = () => {
    if (newOption.trim() && !columnDetails.options.includes(newOption.trim())) {
      setColumnDetails(prev => ({
        ...prev,
        options: [...prev.options, newOption.trim()]
      }));
      setNewOption('');
    }
  };

  const removeOption = (index: number) => {
    setColumnDetails(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const addValidationRule = () => {
    const newRule: ValidationRule = {
      id: crypto.randomUUID(),
      type: 'required',
      value: '',
      message: 'This field is required'
    };
    setColumnDetails(prev => ({
      ...prev,
      validationRules: [...prev.validationRules, newRule]
    }));
  };

  const updateValidationRule = (id: string, field: keyof ValidationRule, value: string) => {
    setColumnDetails(prev => ({
      ...prev,
      validationRules: prev.validationRules.map(rule =>
        rule.id === id ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const removeValidationRule = (id: string) => {
    setColumnDetails(prev => ({
      ...prev,
      validationRules: prev.validationRules.filter(rule => rule.id !== id)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {columnName ? `Configure "${displayName || columnName}"` : 'Add New Column'}
          </DialogTitle>
          <DialogDescription>
            Manage column properties, dropdown options, and validation rules for {tableName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="options">Dropdown Options</TabsTrigger>
            <TabsTrigger value="validation">Validation Rules</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Column Properties</CardTitle>
                  <CardDescription>
                    Configure the basic properties of this column
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="column-name">Backend Column Name</Label>
                      <Input
                        id="column-name"
                        value={columnDetails.name}
                        onChange={(e) => setColumnDetails(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., new_field"
                        disabled={!!columnName} // Can't change existing column names
                      />
                    </div>
                    <div>
                      <Label htmlFor="display-name">Display Name (Frontend)</Label>
                      <Input
                        id="display-name"
                        value={columnDetails.displayName}
                        onChange={(e) => setColumnDetails(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="e.g., New Field"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Note: Display names are currently hardcoded in getTableColumns.ts. Changes here won't take effect until that file is updated.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="column-type">Field Type</Label>
                      <Select 
                        value={columnDetails.type} 
                        onValueChange={(value) => setColumnDetails(prev => ({ ...prev, type: value }))}
                      >
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
                    <div>
                      <Label htmlFor="default-value">Default Value</Label>
                      <Input
                        id="default-value"
                        value={columnDetails.defaultValue}
                        onChange={(e) => setColumnDetails(prev => ({ ...prev, defaultValue: e.target.value }))}
                        placeholder="Enter default value"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="nullable"
                      checked={columnDetails.nullable}
                      onCheckedChange={(checked) => setColumnDetails(prev => ({ ...prev, nullable: checked }))}
                    />
                    <Label htmlFor="nullable">Allow null values (optional field)</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="options" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dropdown Options</CardTitle>
                  <CardDescription>
                    {columnDetails.type === 'select' 
                      ? 'Manage the available options for this dropdown field'
                      : 'This column type does not support dropdown options'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {columnDetails.type === 'select' ? (
                    <>
                      <div className="flex gap-2">
                        <Input
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          placeholder="Add new option..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addOption();
                            }
                          }}
                        />
                        <Button onClick={addOption} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {columnDetails.options.map((option, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <span>{option}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOption(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      
                      {columnDetails.options.length === 0 && (
                        <p className="text-muted-foreground text-sm">No options added yet</p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      Change the field type to "Select/Dropdown" to manage options
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="validation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Validation Rules</CardTitle>
                  <CardDescription>
                    Add custom validation rules for this field
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={addValidationRule} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Validation Rule
                  </Button>
                  
                  <div className="space-y-4">
                    {columnDetails.validationRules.map((rule) => (
                      <Card key={rule.id}>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Rule Type</Label>
                              <Select
                                value={rule.type}
                                onValueChange={(value) => updateValidationRule(rule.id, 'type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="required">Required</SelectItem>
                                  <SelectItem value="minLength">Minimum Length</SelectItem>
                                  <SelectItem value="maxLength">Maximum Length</SelectItem>
                                  <SelectItem value="pattern">Pattern (Regex)</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Value</Label>
                              <Input
                                value={rule.value}
                                onChange={(e) => updateValidationRule(rule.id, 'value', e.target.value)}
                                placeholder={
                                  rule.type === 'minLength' || rule.type === 'maxLength' ? 'Number' :
                                  rule.type === 'pattern' ? 'Regex pattern' :
                                  rule.type === 'custom' ? 'Custom rule' : ''
                                }
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <Label>Error Message</Label>
                                <Input
                                  value={rule.message}
                                  onChange={(e) => updateValidationRule(rule.id, 'message', e.target.value)}
                                  placeholder="Error message to display"
                                />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeValidationRule(rule.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {columnDetails.validationRules.length === 0 && (
                    <p className="text-muted-foreground text-sm">No validation rules added yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <Separator />
        
        <div className="flex justify-between">
          <div>
            {columnName && (
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Column
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}