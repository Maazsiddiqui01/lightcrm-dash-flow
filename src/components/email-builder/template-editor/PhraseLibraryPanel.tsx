import { useState } from "react";
import { PhraseLibraryItem } from "@/hooks/useTemplateSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MessageSquare, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhraseLibraryPanelProps {
  phrases: PhraseLibraryItem[];
  onPhrasesChange: (phrases: PhraseLibraryItem[]) => void;
  templateId: string;
}

const PHRASE_SCOPES = [
  { value: 'subject_formal', label: 'Subjects - Formal', category: 'subjects' },
  { value: 'subject_casual', label: 'Subjects - Casual', category: 'subjects' },
  { value: 'greeting', label: 'Greetings', category: 'greetings' },
  { value: 'meeting_request', label: 'Meeting Requests', category: 'meeting' },
  { value: 'fa_default', label: 'Focus Areas - Default', category: 'focus' },
  { value: 'fa_platform', label: 'Focus Areas - Platform', category: 'focus' },
  { value: 'fa_addon', label: 'Focus Areas - Add-on', category: 'focus' },
];

const TRI_STATE_OPTIONS = [
  { value: 'Always', label: 'Always' },
  { value: 'Sometimes', label: 'Sometimes' },
  { value: 'Never', label: 'Never' },
];

export function PhraseLibraryPanel({ phrases, onPhrasesChange, templateId }: PhraseLibraryPanelProps) {
  const [activeTab, setActiveTab] = useState('subjects');

  const getPhrasesForCategory = (category: string) => {
    const scopes = PHRASE_SCOPES.filter(s => s.category === category).map(s => s.value);
    return phrases.filter(p => scopes.includes(p.scope)).sort((a, b) => a.weight - b.weight);
  };

  const addPhrase = (scope: string) => {
    const existingPhrases = phrases.filter(p => p.scope === scope);
    const maxWeight = existingPhrases.length > 0 ? Math.max(...existingPhrases.map(p => p.weight)) : 0;
    
    const newPhrase: PhraseLibraryItem = {
      id: `new-${Date.now()}`,
      template_id: templateId,
      scope,
      text_value: '',
      tri_state: 'Sometimes',
      weight: maxWeight + 1,
      active: true,
    };

    onPhrasesChange([...phrases, newPhrase]);
  };

  const updatePhrase = (phraseId: string, updates: Partial<PhraseLibraryItem>) => {
    onPhrasesChange(
      phrases.map(p => (p.id === phraseId ? { ...p, ...updates } : p))
    );
  };

  const deletePhrase = (phraseId: string) => {
    onPhrasesChange(phrases.filter(p => p.id !== phraseId));
  };

  const movePhrase = (phraseId: string, direction: 'up' | 'down') => {
    const phrase = phrases.find(p => p.id === phraseId);
    if (!phrase) return;

    const sameScopePhrases = phrases
      .filter(p => p.scope === phrase.scope)
      .sort((a, b) => a.weight - b.weight);
    
    const index = sameScopePhrases.findIndex(p => p.id === phraseId);
    
    if (direction === 'up' && index > 0) {
      const temp = sameScopePhrases[index].weight;
      sameScopePhrases[index].weight = sameScopePhrases[index - 1].weight;
      sameScopePhrases[index - 1].weight = temp;
    } else if (direction === 'down' && index < sameScopePhrases.length - 1) {
      const temp = sameScopePhrases[index].weight;
      sameScopePhrases[index].weight = sameScopePhrases[index + 1].weight;
      sameScopePhrases[index + 1].weight = temp;
    }

    onPhrasesChange([...phrases]);
  };

  const renderPhraseList = (category: string) => {
    const categoryPhrases = getPhrasesForCategory(category);
    const scopes = PHRASE_SCOPES.filter(s => s.category === category);

    return (
      <div className="space-y-4">
        {scopes.map((scope) => {
          const scopePhrases = categoryPhrases.filter(p => p.scope === scope.value);
          return (
            <div key={scope.value} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{scope.label}</h4>
                <Button
                  onClick={() => addPhrase(scope.value)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              {scopePhrases.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                  No phrases yet. Click "Add" to create one.
                </div>
              ) : (
                <div className="space-y-2">
                  {scopePhrases.map((phrase, index) => (
                    <div
                      key={phrase.id}
                      className={cn(
                        "p-3 border rounded-lg space-y-3",
                        !phrase.active && "opacity-50 bg-muted/50"
                      )}
                    >
                      {/* Phrase Text */}
                      <div>
                        <Label htmlFor={`phrase-${phrase.id}`}>Text</Label>
                        <Textarea
                          id={`phrase-${phrase.id}`}
                          value={phrase.text_value}
                          onChange={(e) => updatePhrase(phrase.id, { text_value: e.target.value })}
                          placeholder="Enter phrase text..."
                          rows={2}
                          className={!phrase.text_value.trim() ? "border-destructive" : ""}
                        />
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Active Toggle */}
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={phrase.active}
                              onCheckedChange={(checked) => updatePhrase(phrase.id, { active: checked })}
                            />
                            <Label>Active</Label>
                          </div>

                          {/* Tri-State */}
                          <Select
                            value={phrase.tri_state}
                            onValueChange={(value) => updatePhrase(phrase.id, { tri_state: value as any })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TRI_STATE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Weight Display */}
                          <Badge variant="secondary">
                            Weight: {phrase.weight}
                          </Badge>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1">
                          <Button
                            onClick={() => movePhrase(phrase.id, 'up')}
                            disabled={index === 0}
                            size="sm"
                            variant="ghost"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => movePhrase(phrase.id, 'down')}
                            disabled={index === scopePhrases.length - 1}
                            size="sm"
                            variant="ghost"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => deletePhrase(phrase.id)}
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const getActivePhrasesCount = (category: string) => {
    return getPhrasesForCategory(category).filter(p => p.active).length;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Phrase Libraries
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-5rem)] overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="subjects" className="relative">
              Subjects
              {getActivePhrasesCount('subjects') > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                  {getActivePhrasesCount('subjects')}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="greetings" className="relative">
              Greetings
              {getActivePhrasesCount('greetings') > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                  {getActivePhrasesCount('greetings')}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="meeting" className="relative">
              Meeting
              {getActivePhrasesCount('meeting') > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                  {getActivePhrasesCount('meeting')}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="focus" className="relative">
              Focus Areas
              {getActivePhrasesCount('focus') > 0 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                  {getActivePhrasesCount('focus')}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="h-[calc(100%-3rem)] overflow-y-auto mt-4">
            <TabsContent value="subjects" className="mt-0">
              {renderPhraseList('subjects')}
            </TabsContent>
            <TabsContent value="greetings" className="mt-0">
              {renderPhraseList('greetings')}
            </TabsContent>
            <TabsContent value="meeting" className="mt-0">
              {renderPhraseList('meeting')}
            </TabsContent>
            <TabsContent value="focus" className="mt-0">
              {renderPhraseList('focus')}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}