import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Save } from 'lucide-react';
import { useAllFocusAreaDescriptions, useUpdateFocusAreaDescription } from '@/hooks/useAllFocusAreaDescriptions';

export interface FocusAreaLanguageSelection {
  uniqueId: number;
  focusArea: string;
  type: string;
  existingPlatform: string | null;
  description: string;
  useInEmail: boolean;
}

interface FocusAreaLanguagePanelProps {
  contactFocusAreas?: string[];
  value: FocusAreaLanguageSelection | null;
  onChange: (selection: FocusAreaLanguageSelection | null) => void;
}

export function FocusAreaLanguagePanel({ contactFocusAreas, value, onChange }: FocusAreaLanguagePanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedFocusArea, setSelectedFocusArea] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [editedDescription, setEditedDescription] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  const { data: allDescriptions = [], isLoading } = useAllFocusAreaDescriptions();
  const updateDescription = useUpdateFocusAreaDescription();

  // Get distinct focus areas, with contact's focus areas first
  const focusAreaOptions = useMemo(() => {
    const allAreas = [...new Set(allDescriptions.map(d => d['LG Focus Area']).filter(Boolean))].sort();
    if (!contactFocusAreas || contactFocusAreas.length === 0) return allAreas;

    const contactSet = new Set(contactFocusAreas.map(fa => fa.toLowerCase()));
    const contactAreas = allAreas.filter(a => contactSet.has(a.toLowerCase()));
    const otherAreas = allAreas.filter(a => !contactSet.has(a.toLowerCase()));
    return [...contactAreas, ...otherAreas];
  }, [allDescriptions, contactFocusAreas]);

  // Get available types for selected focus area
  const typeOptions = useMemo(() => {
    if (!selectedFocusArea) return [];
    return [...new Set(
      allDescriptions
        .filter(d => d['LG Focus Area'] === selectedFocusArea)
        .map(d => d['Platform / Add-On'])
        .filter(Boolean)
    )];
  }, [allDescriptions, selectedFocusArea]);

  // Auto-select type if only one option
  useEffect(() => {
    if (typeOptions.length === 1) {
      setSelectedType(typeOptions[0]);
    } else if (typeOptions.length > 0 && !typeOptions.includes(selectedType)) {
      setSelectedType('');
    }
  }, [typeOptions]);

  // Find the matching row
  const matchingRow = useMemo(() => {
    if (!selectedFocusArea || !selectedType) return null;
    return allDescriptions.find(
      d => d['LG Focus Area'] === selectedFocusArea && d['Platform / Add-On'] === selectedType
    ) || null;
  }, [allDescriptions, selectedFocusArea, selectedType]);

  // Load description when matching row changes
  useEffect(() => {
    if (matchingRow) {
      setEditedDescription(matchingRow.Description || '');
      setIsDirty(false);
      // Update parent with current selection
      onChange({
        uniqueId: matchingRow.Unique_ID,
        focusArea: matchingRow['LG Focus Area'],
        type: matchingRow['Platform / Add-On'],
        existingPlatform: matchingRow['Existing Platform (for Add-Ons)'] || null,
        description: matchingRow.Description || '',
        useInEmail: value?.useInEmail ?? false,
      });
    }
  }, [matchingRow?.Unique_ID]);

  const handleDescriptionChange = (text: string) => {
    setEditedDescription(text);
    setIsDirty(text !== (matchingRow?.Description || ''));
  };

  const handleSave = () => {
    if (!matchingRow) return;
    updateDescription.mutate({
      uniqueId: matchingRow.Unique_ID,
      description: editedDescription,
    });
    setIsDirty(false);
    // Update parent with saved description
    if (value) {
      onChange({ ...value, description: editedDescription });
    }
  };

  const handleUseInEmailToggle = (checked: boolean) => {
    if (value) {
      onChange({ ...value, useInEmail: checked, description: editedDescription });
    } else if (matchingRow) {
      onChange({
        uniqueId: matchingRow.Unique_ID,
        focusArea: matchingRow['LG Focus Area'],
        type: matchingRow['Platform / Add-On'],
        existingPlatform: matchingRow['Existing Platform (for Add-Ons)'] || null,
        description: editedDescription,
        useInEmail: checked,
      });
    }
  };

  const isContactFocusArea = (area: string) => {
    if (!contactFocusAreas) return false;
    return contactFocusAreas.some(fa => fa.toLowerCase() === area.toLowerCase());
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <CardTitle className="text-base">Focus Area Language</CardTitle>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="h-20 bg-muted animate-pulse rounded" />
            ) : (
              <>
                {/* Focus Area Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Focus Area</Label>
                  <Select value={selectedFocusArea} onValueChange={(v) => { setSelectedFocusArea(v); setSelectedType(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select focus area..." />
                    </SelectTrigger>
                    <SelectContent>
                      {focusAreaOptions.map(area => (
                        <SelectItem key={area} value={area}>
                          {isContactFocusArea(area) ? `★ ${area}` : area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type Dropdown */}
                {selectedFocusArea && typeOptions.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-sm">Platform / Add-On</Label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Existing Platform (read-only, for Add-Ons) */}
                {matchingRow && selectedType?.toLowerCase().includes('add-on') && matchingRow['Existing Platform (for Add-Ons)'] && (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Existing Platform</Label>
                    <div className="px-3 py-2 bg-muted rounded-md text-sm">
                      {matchingRow['Existing Platform (for Add-Ons)']}
                    </div>
                  </div>
                )}

                {/* Description Textarea */}
                {matchingRow && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Description</Label>
                      <Textarea
                        value={editedDescription}
                        onChange={(e) => handleDescriptionChange(e.target.value)}
                        className="min-h-[100px] text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      {/* Use in Email Checkbox */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="use-in-email"
                          checked={value?.useInEmail ?? false}
                          onCheckedChange={(checked) => handleUseInEmailToggle(!!checked)}
                        />
                        <Label htmlFor="use-in-email" className="text-sm cursor-pointer">
                          Use in Email
                        </Label>
                      </div>

                      {/* Save Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSave}
                        disabled={!isDirty || updateDescription.isPending}
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {updateDescription.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
