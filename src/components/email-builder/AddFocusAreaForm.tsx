import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, X } from 'lucide-react';
import { useCreateFocusAreaDescription } from '@/hooks/useAllFocusAreaDescriptions';
import type { FocusAreaDescriptionRow } from '@/hooks/useAllFocusAreaDescriptions';

const SECTORS = ['General', 'Healthcare', 'Industrials', 'Services'];

interface AddFocusAreaFormProps {
  allDescriptions: FocusAreaDescriptionRow[];
  onDone: () => void;
}

export function AddFocusAreaForm({ allDescriptions, onDone }: AddFocusAreaFormProps) {
  const [focusArea, setFocusArea] = useState('');
  const [isNewFocusArea, setIsNewFocusArea] = useState(false);
  const [sector, setSector] = useState('');
  const [platformType, setPlatformType] = useState<'New Platform' | 'Add-On'>('New Platform');
  const [existingPlatform, setExistingPlatform] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useCreateFocusAreaDescription();

  const existingFocusAreas = useMemo(() => {
    return [...new Set(allDescriptions.map(d => d['LG Focus Area']).filter(Boolean))].sort();
  }, [allDescriptions]);

  // Auto-fill sector when picking an existing focus area
  const handleFocusAreaChange = (value: string) => {
    setFocusArea(value);
    const match = allDescriptions.find(d => d['LG Focus Area'] === value);
    if (match && match['LG Sector']) {
      setSector(match['LG Sector']);
    }
  };

  const isValid = focusArea.trim() &&
    sector &&
    description.trim() &&
    (platformType === 'New Platform' || existingPlatform.trim());

  const handleSubmit = () => {
    if (!isValid) return;
    createMutation.mutate({
      sector,
      focusArea: focusArea.trim(),
      platformType,
      existingPlatform: platformType === 'Add-On' ? existingPlatform.trim() : null,
      description: description.trim(),
    }, {
      onSuccess: () => onDone(),
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Focus Area</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => { setIsNewFocusArea(!isNewFocusArea); setFocusArea(''); }}
          >
            {isNewFocusArea ? 'Pick existing' : '+ New'}
          </Button>
        </div>
        {isNewFocusArea ? (
          <Input
            placeholder="Type new focus area name..."
            value={focusArea}
            onChange={e => setFocusArea(e.target.value)}
          />
        ) : (
          <Select value={focusArea} onValueChange={handleFocusAreaChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select focus area..." />
            </SelectTrigger>
            <SelectContent>
              {existingFocusAreas.map(area => (
                <SelectItem key={area} value={area}>{area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Sector</Label>
        <Select value={sector} onValueChange={setSector}>
          <SelectTrigger>
            <SelectValue placeholder="Select sector..." />
          </SelectTrigger>
          <SelectContent>
            {SECTORS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Type</Label>
        <RadioGroup
          value={platformType}
          onValueChange={(v) => setPlatformType(v as 'New Platform' | 'Add-On')}
          className="flex gap-4"
        >
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="New Platform" id="type-platform" />
            <Label htmlFor="type-platform" className="text-sm cursor-pointer">New Platform</Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="Add-On" id="type-addon" />
            <Label htmlFor="type-addon" className="text-sm cursor-pointer">Add-On</Label>
          </div>
        </RadioGroup>
      </div>

      {platformType === 'Add-On' && (
        <div className="space-y-1.5">
          <Label className="text-sm">Existing Platform</Label>
          <Input
            placeholder="e.g. Aspire Bakeries"
            value={existingPlatform}
            onChange={e => setExistingPlatform(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm">Description</Label>
        <Textarea
          placeholder="Enter description..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="min-h-[80px] text-sm"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={onDone} disabled={createMutation.isPending}>
          <X className="h-3.5 w-3.5 mr-1" />Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!isValid || createMutation.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          {createMutation.isPending ? 'Saving...' : 'Save New Entry'}
        </Button>
      </div>
    </div>
  );
}
