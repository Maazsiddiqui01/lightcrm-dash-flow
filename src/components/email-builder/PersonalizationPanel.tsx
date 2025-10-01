import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TriStateToggle } from "./TriStateToggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { TemplateSettings, TriState } from "@/types/phraseLibrary";

interface PersonalizationPanelProps {
  settings: TemplateSettings;
  onSettingsChange: (settings: Partial<TemplateSettings>) => void;
}

export function PersonalizationPanel({ settings, onSettingsChange }: PersonalizationPanelProps) {
  const [newTopic, setNewTopic] = useState("");

  const handleSourceChange = (source: string, value: TriState) => {
    onSettingsChange({
      personalization_config: {
        ...settings.personalization_config,
        sources: {
          ...settings.personalization_config.sources,
          [source]: value,
        },
      },
    });
  };

  const addTopic = () => {
    if (newTopic.trim()) {
      onSettingsChange({
        personalization_config: {
          ...settings.personalization_config,
          self_topics: [...settings.personalization_config.self_topics, newTopic.trim()],
        },
      });
      setNewTopic("");
    }
  };

  const removeTopic = (index: number) => {
    onSettingsChange({
      personalization_config: {
        ...settings.personalization_config,
        self_topics: settings.personalization_config.self_topics.filter((_, i) => i !== index),
      },
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Personalization Sources</CardTitle>
          <CardDescription>
            Configure which data sources to use for personalizing emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">User Notes</p>
              <p className="text-xs text-muted-foreground">Manually entered facts about the contact</p>
            </div>
            <TriStateToggle
              value={settings.personalization_config.sources.user_notes}
              onChange={(value) => handleSourceChange('user_notes', value)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">AI Notes</p>
              <p className="text-xs text-muted-foreground">Automatically scraped/summarized data</p>
            </div>
            <TriStateToggle
              value={settings.personalization_config.sources.ai_notes}
              onChange={(value) => handleSourceChange('ai_notes', value)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">LinkedIn Posts</p>
              <p className="text-xs text-muted-foreground">Recent LinkedIn activity</p>
            </div>
            <TriStateToggle
              value={settings.personalization_config.sources.linkedin}
              onChange={(value) => handleSourceChange('linkedin', value)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Twitter/X Posts</p>
              <p className="text-xs text-muted-foreground">Recent Twitter/X activity</p>
            </div>
            <TriStateToggle
              value={settings.personalization_config.sources.twitter}
              onChange={(value) => handleSourceChange('twitter', value)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Self Personalization</p>
              <p className="text-xs text-muted-foreground">Your own evergreen topics (see below)</p>
            </div>
            <TriStateToggle
              value={settings.personalization_config.sources.self_personalization}
              onChange={(value) => handleSourceChange('self_personalization', value)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">AI Backup Personalization</p>
              <p className="text-xs text-muted-foreground">Generic phrases when personal data is thin</p>
            </div>
            <TriStateToggle
              value={settings.personalization_config.sources.ai_backup}
              onChange={(value) => handleSourceChange('ai_backup', value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Self Personalization Topics</CardTitle>
          <CardDescription>
            Evergreen topics about yourself that AI can expand on (Sports, Books, Hobbies, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="e.g., Following the Yankees this season"
              onKeyDown={(e) => e.key === 'Enter' && addTopic()}
            />
            <Button onClick={addTopic} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {settings.personalization_config.self_topics.map((topic, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm">{topic}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTopic(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {settings.personalization_config.self_topics.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No topics added yet. Add some evergreen topics about yourself.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}