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
import { useGlobalSignatures } from '@/hooks/useSignatureLibrary';
import { EditPhraseModal } from '@/components/global-libraries/EditPhraseModal';
import { EditInquiryModal } from '@/components/global-libraries/EditInquiryModal';
import { TriStateApplyModal } from '@/components/global-libraries/TriStateApplyModal';
import { useRealtimeLibrarySync } from '@/hooks/useRealtimeSync';
import { useSubjectLibrary } from '@/hooks/useSubjectLibrary';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  { value: 'attachments', label: 'Attachments' },
  { value: 'focus_area_defaults', label: 'Focus Area Defaults' },
  { value: 'team_mention', label: 'Team Mention' },
  { value: 'ps', label: 'P.S. Lines' },
];

const INQUIRY_CATEGORIES: { value: InquiryCategory; label: string }[] = [
  { value: 'opportunity', label: 'Opportunity Inquiries' },
  { value: 'article', label: 'Article Inquiries' },
  { value: 'focus_area', label: 'Focus Area Inquiries' },
  { value: 'generic', label: 'Generic Inquiries' },
];

export function GlobalLibraries() {
  // Enable real-time synchronization
  useRealtimeLibrarySync();
  
  const [selectedPhraseCategory, setSelectedPhraseCategory] = useState<PhraseCategory>('greeting');
  const [selectedInquiryCategory, setSelectedInquiryCategory] = useState<InquiryCategory>('opportunity');
  const [editingPhrase, setEditingPhrase] = useState<any>(null);
  const [editingInquiry, setEditingInquiry] = useState<any>(null);
  const [newPhraseText, setNewPhraseText] = useState('');
  const [newInquiryText, setNewInquiryText] = useState('');
  const [phraseModalOpen, setPhraseModalOpen] = useState(false);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{ id: string; updates: any; type: 'phrase' | 'inquiry' } | null>(null);
  const [selectedSubjectStyle, setSelectedSubjectStyle] = useState<'formal' | 'hybrid' | 'casual'>('formal');

  const { data: phrases = [], isLoading: phrasesLoading } = useGlobalPhrases(selectedPhraseCategory);
  const { data: inquiries = [], isLoading: inquiriesLoading } = useGlobalInquiries(selectedInquiryCategory);
  const { data: signatures = [] } = useGlobalSignatures();
  const { data: subjects = [] } = useSubjectLibrary(selectedSubjectStyle);
  
  // Team Directory data
  const { data: teamDirectory = [] } = useQuery({
    queryKey: ['team-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lg_focus_area_directory' as any)
        .select('*')
        .order('focus_area');
      if (error) throw error;
      return data || [];
    },
  });

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
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="phrases">Phrases</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
            <TabsTrigger value="signatures">Signatures</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
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
                                  onClick={() => {
                                    setEditingPhrase(phrase);
                                    setPhraseModalOpen(true);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
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

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subject Line Library</CardTitle>
                <CardDescription>
                  Manage subject line templates organized by style. Includes token replacement for [My Org], [Their Org], [Focus Area].
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select
                    value={selectedSubjectStyle}
                    onValueChange={(val) => setSelectedSubjectStyle(val as 'formal' | 'hybrid' | 'casual')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="capitalize">{selectedSubjectStyle} Subjects ({subjects.length})</Label>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {subjects.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No subjects in this style</div>
                    ) : (
                      subjects.map((subject) => (
                        <Card key={subject.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="font-mono text-sm">{subject.subject_template}</div>
                              <Badge variant="outline" className="capitalize">{subject.style}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    <strong>Tokens:</strong> [My Org], [Their Org], [Focus Area], (Send with no subject)
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
                                  onClick={() => {
                                    setEditingInquiry(inquiry);
                                    setInquiryModalOpen(true);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
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

          {/* Signatures Tab */}
          <TabsContent value="signatures" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Signature Library</CardTitle>
                <CardDescription>
                  Email signatures mapped to tone. Selected automatically based on template tone.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {signatures.map((sig) => (
                    <Card key={sig.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge variant="outline" className="mb-1 capitalize">{sig.tone}</Badge>
                            <p className="text-sm font-mono">{sig.signature_text}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team & Assistant Directory Tab */}
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team & Assistant Directory</CardTitle>
                <CardDescription>
                  Focus area leads and assistants for auto-CC and meeting coordination.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {teamDirectory.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No team directory entries</div>
                  ) : (
                    teamDirectory.map((entry: any) => (
                      <Card key={entry.focus_area}>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="font-medium">{entry.focus_area}</div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-muted-foreground text-xs mb-1">Lead 1</div>
                                {entry.lead1_name && (
                                  <div>
                                    <div>{entry.lead1_name}</div>
                                    <div className="text-muted-foreground text-xs">{entry.lead1_email}</div>
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-muted-foreground text-xs mb-1">Lead 2</div>
                                {entry.lead2_name && (
                                  <div>
                                    <div>{entry.lead2_name}</div>
                                    <div className="text-muted-foreground text-xs">{entry.lead2_email}</div>
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-muted-foreground text-xs mb-1">Assistant</div>
                                {entry.assistant_name && (
                                  <div>
                                    <div>{entry.assistant_name}</div>
                                    <div className="text-muted-foreground text-xs">{entry.assistant_email}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Modals */}
        <EditPhraseModal
          phrase={editingPhrase}
          open={phraseModalOpen}
          onOpenChange={(open) => {
            setPhraseModalOpen(open);
            if (!open) setEditingPhrase(null);
          }}
        />
        <EditInquiryModal
          inquiry={editingInquiry}
          open={inquiryModalOpen}
          onOpenChange={(open) => {
            setInquiryModalOpen(open);
            if (!open) setEditingInquiry(null);
          }}
        />
        <TriStateApplyModal
          open={applyModalOpen}
          onOpenChange={setApplyModalOpen}
          onConfirm={(applyToAll, updateTriStateDefaults) => {
            if (pendingUpdate) {
              if (pendingUpdate.type === 'phrase') {
                updatePhrase.mutate({ 
                  id: pendingUpdate.id, 
                  updates: pendingUpdate.updates, 
                  applyToAll,
                  updateTriStateDefaults 
                });
              } else {
                updateInquiry.mutate({ 
                  id: pendingUpdate.id, 
                  updates: pendingUpdate.updates 
                });
              }
              setPendingUpdate(null);
            }
          }}
          itemType={pendingUpdate?.type || 'phrase'}
        />
      </ResponsiveContainer>
    </div>
  );
}