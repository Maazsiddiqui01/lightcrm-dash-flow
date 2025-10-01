import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { TriStateToggle } from './TriStateToggle';
import { usePhraseLibrary, useCreatePhrase, useUpdatePhrase, useDeletePhrase } from '@/hooks/usePhraseLibrary';
import { PHRASE_CATEGORIES, type PhraseCategory, type TriState } from '@/types/phraseLibrary';

interface PhraseLibraryPanelProps {
  templateId: string;
}

export function PhraseLibraryPanel({ templateId }: PhraseLibraryPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<PhraseCategory>('subject');
  const [newPhrase, setNewPhrase] = useState('');

  const { data: phrases = [] } = usePhraseLibrary(templateId, selectedCategory);
  const createPhrase = useCreatePhrase();
  const updatePhrase = useUpdatePhrase();
  const deletePhrase = useDeletePhrase();

  const handleAddPhrase = () => {
    if (!newPhrase.trim()) return;

    createPhrase.mutate({
      template_id: templateId,
      category: selectedCategory,
      phrase_text: newPhrase.trim(),
      tri_state: 'sometimes',
      weight: 1,
      is_global: false,
      sync_behavior: 'inherit',
    });

    setNewPhrase('');
  };

  const handleUpdateTriState = (phraseId: string, triState: TriState) => {
    updatePhrase.mutate({
      id: phraseId,
      updates: { tri_state: triState },
    });
  };

  const handleDelete = (phraseId: string) => {
    if (confirm('Are you sure you want to delete this phrase?')) {
      deletePhrase.mutate(phraseId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phrase Library</CardTitle>
        <CardDescription>
          Manage phrases for different parts of your emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as PhraseCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PHRASE_CATEGORIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add new phrase..."
            value={newPhrase}
            onChange={(e) => setNewPhrase(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPhrase()}
          />
          <Button onClick={handleAddPhrase} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {phrases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No phrases yet. Add your first phrase above.
            </p>
          ) : (
            phrases.map((phrase) => (
              <div
                key={phrase.id}
                className="flex items-start gap-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm break-words">{phrase.phrase_text}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <TriStateToggle
                    value={phrase.tri_state}
                    onChange={(value) => handleUpdateTriState(phrase.id, value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(phrase.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
