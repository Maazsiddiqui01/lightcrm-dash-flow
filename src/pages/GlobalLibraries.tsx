import { useState } from 'react';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Library, Plus, Trash2, Edit2, RotateCcw } from 'lucide-react';
import { useGlobalPhrases, useCreatePhrase, useUpdatePhrase, useDeletePhrase } from '@/hooks/usePhraseLibrary';
import { useGlobalInquiries, useCreateInquiry, useUpdateInquiry, useDeleteInquiry } from '@/hooks/useInquiryLibrary';
import type { PhraseCategory } from '@/types/phraseLibrary';
import type { InquiryCategory } from '@/hooks/useInquiryLibrary';

const PHRASE_CATEGORIES: { value: PhraseCategory; label: string }[] = [
  { value: 'greeting', label: 'Greetings' },
  { value: 'closing', label: 'Closings' },
  { value: 'opening', label: 'Opening Lines' },
  { value: 'meeting_request', label: 'Meeting Requests' },
  { value: 'self_personalization', label: 'Personalization' },
  { value: 'top_opportunities', label: 'Top Opportunities' },
  { value: 'article_recommendations', label: 'Article Recommendations' },
  { value: 'platforms', label: 'Platforms' },
  { value: 'addons', label: 'Add-On Opportunities' },
  { value: 'talking_points', label: 'Talking Points' },
  { value: 'org_update', label: 'Org Updates' },
  { value: 'ps', label: 'P.S. Lines' },
];

const INQUIRY_CATEGORIES: { value: InquiryCategory; label: string }[] = [
  { value: 'opportunity', label: 'Opportunity Inquiries' },
  { value: 'article', label: 'Article Inquiries' },
  { value: 'focus_area', label: 'Focus Area Inquiries' },
  { value: 'generic', label: 'Generic Inquiries' },
];

export function GlobalLibraries() {
  const [selectedPhraseCategory, setSelectedPhraseCategory] = useState<PhraseCategory>('greeting');
  const [selectedInquiryCategory, setSelectedInquiryCategory] = useState<InquiryCategory>('opportunity');
  const [editingPhrase, setEditingPhrase] = useState<any>(null);
  const [editingInquiry, setEditingInquiry] = useState<any>(null);
  const [newPhraseText, setNewPhraseText] = useState('');
  const [newInquiryText, setNewInquiryText] = useState('');

  const { data: phrases = [], isLoading: phrasesLoading } = useGlobalPhrases(selectedPhraseCategory);
  const { data: inquiries = [], isLoading: inquiriesLoading } = useGlobalInquiries(selectedInquiryCategory);

  const createPhrase = useCreatePhrase();
  const updatePhrase = useUpdatePhrase();
  const deletePhrase = useDeletePhrase();

  const createInquiry = useCreateInquiry();
  const updateInquiry = useUpdateInquiry();
  const deleteInquiry = useDeleteInquiry();

  const handleCreatePhrase = () => {
    if (!newPhraseText.trim()) return;

    createPhrase.mutate({
      category: selectedPhraseCategory,
      phrase_text: newPhraseText,
      tri_state: 'sometimes',
      is_global: true,
      template_id: null,
      weight: 1,
      sync_behavior: 'inherit',
    });

    setNewPhraseText('');
  };

  const handleCreateInquiry = () => {
    if (!newInquiryText.trim()) return;

    createInquiry.mutate({
      category: selectedInquiryCategory,
      inquiry_text: newInquiryText,
      tri_state: 'sometimes',
      is_global: true,
      template_id: null,
    });

    setNewInquiryText('');
  };

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer className="flex flex-col gap-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Library className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Global Libraries</h1>
            <p className="text-muted-foreground">Manage phrase and inquiry libraries used across all templates</p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="phrases" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="phrases">Phrase Library</TabsTrigger>
            <TabsTrigger value="inquiries">Inquiry Library</TabsTrigger>
          </TabsList>

          {/* Phrases Tab */}
          <TabsContent value="phrases" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Phrase Library</CardTitle>
                <CardDescription>
                  Manage global phrases used across all email templates. These phrases will be automatically rotated.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Selector */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={selectedPhraseCategory}
                    onValueChange={(val) => setSelectedPhraseCategory(val as PhraseCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHRASE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Add New Phrase */}
                <div className="space-y-2">
                  <Label>Add New Phrase</Label>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Enter phrase text..."
                      value={newPhraseText}
                      onChange={(e) => setNewPhraseText(e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <Button onClick={handleCreatePhrase} disabled={!newPhraseText.trim()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Phrases List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      {PHRASE_CATEGORIES.find(c => c.value === selectedPhraseCategory)?.label} ({phrases.length})
                    </Label>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {phrasesLoading ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : phrases.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No phrases in this category</div>
                    ) : (
                      phrases.map((phrase) => (
                        <Card key={phrase.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm">{phrase.phrase_text}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {phrase.tri_state}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deletePhrase.mutate(phrase.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inquiries Tab */}
          <TabsContent value="inquiries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inquiry Library</CardTitle>
                <CardDescription>
                  Manage inquiry questions used in email generation. At least one inquiry is required per email.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Selector */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={selectedInquiryCategory}
                    onValueChange={(val) => setSelectedInquiryCategory(val as InquiryCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INQUIRY_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Add New Inquiry */}
                <div className="space-y-2">
                  <Label>Add New Inquiry</Label>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Enter inquiry text..."
                      value={newInquiryText}
                      onChange={(e) => setNewInquiryText(e.target.value)}
                      className="flex-1"
                      rows={2}
                    />
                    <Button onClick={handleCreateInquiry} disabled={!newInquiryText.trim()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Inquiries List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      {INQUIRY_CATEGORIES.find(c => c.value === selectedInquiryCategory)?.label} ({inquiries.length})
                    </Label>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {inquiriesLoading ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : inquiries.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No inquiries in this category</div>
                    ) : (
                      inquiries.map((inquiry) => (
                        <Card key={inquiry.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm">{inquiry.inquiry_text}</p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteInquiry.mutate(inquiry.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ResponsiveContainer>
    </div>
  );
}