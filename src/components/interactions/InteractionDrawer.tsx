import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Mail, Calendar, Users, Save } from "lucide-react";

interface Interaction {
  id: string;
  subject: string;
  source: string;
  from_name: string;
  from_email: string;
  to_names: string;
  to_emails: string;
  cc_names: string;
  cc_emails: string;
  organization: string;
  occurred_at: string;
  all_emails: string;
}

interface InteractionDrawerProps {
  interaction: Interaction | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function InteractionDrawer({
  interaction,
  isOpen,
  onClose,
  onUpdate,
}: InteractionDrawerProps) {
  const [organization, setOrganization] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${type} copied to clipboard`,
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSave = async () => {
    if (!interaction) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from("emails_meetings_raw")
        .update({ organization })
        .eq("id", interaction.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organization updated successfully",
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update organization",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSourceColor = (source: string) => {
    switch (source?.toLowerCase()) {
      case "email":
        return "bg-primary-light text-primary";
      case "meeting":
        return "bg-success-light text-success";
      case "call":
        return "bg-warning-light text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (!interaction) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Interaction Details</span>
          </SheetTitle>
          <SheetDescription>
            View and edit interaction information
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Subject</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {interaction.subject || "No Subject"}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Source</Label>
              <div className="mt-1">
                <Badge className={getSourceColor(interaction.source)}>
                  <div className="flex items-center space-x-1">
                    {interaction.source?.toLowerCase() === "email" && <Mail className="h-3 w-3" />}
                    {interaction.source?.toLowerCase() === "meeting" && <Users className="h-3 w-3" />}
                    <span>{interaction.source || "Unknown"}</span>
                  </div>
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Occurred At</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formatDate(interaction.occurred_at)}
                </span>
              </div>
            </div>
          </div>

          {/* From/To Info */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">From</Label>
              <div className="space-y-2 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {interaction.from_name || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {interaction.from_email}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(interaction.from_email, "From Email")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">To</Label>
              <div className="space-y-2 mt-1">
                <div>
                  <span className="text-sm">
                    {interaction.to_names || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground break-all">
                    {interaction.to_emails}
                  </span>
                  {interaction.to_emails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(interaction.to_emails, "To Emails")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {interaction.cc_names && (
              <div>
                <Label className="text-sm font-medium">CC</Label>
                <div className="space-y-2 mt-1">
                  <div>
                    <span className="text-sm">
                      {interaction.cc_names}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground break-all">
                      {interaction.cc_emails}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* All Emails */}
          <div>
            <Label className="text-sm font-medium">All Emails</Label>
            <Textarea
              value={interaction.all_emails || ""}
              readOnly
              className="mt-1 min-h-[100px] text-sm"
              placeholder="No email content available"
            />
          </div>

          {/* Editable Organization */}
          <div>
            <Label htmlFor="organization">Organization</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder={interaction.organization || "Enter organization"}
              />
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}