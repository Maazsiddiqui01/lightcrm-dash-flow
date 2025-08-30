import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, X, User, Mail, Building, Target, MessageSquare, Calendar } from "lucide-react";

interface Contact {
  id: string;
  full_name: string;
  title: string;
  email: string;
  organization: string;
  opportunities_count: number;
  meetings_count: number;
  emails_count: number;
  last_touch: string;
  focus_areas: string;
  notes: string;
  created_at: string;
  updated_at: string;
  no_of_lg_focus_areas: number;
}

interface ContactDrawerProps {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
  onContactUpdated: () => void;
}

export function ContactDrawer({ contact, open, onClose, onContactUpdated }: ContactDrawerProps) {
  const [notes, setNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (contact) {
      setNotes(contact.notes || "");
    }
  }, [contact]);

  const handleSaveNotes = async () => {
    if (!contact) return;

    try {
      setIsUpdating(true);
      
      // Update notes in contacts_raw table
      const { error } = await supabase
        .from("contacts_raw")
        .update({ 
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq("email_address", contact.email);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notes updated successfully",
      });

      onContactUpdated();
    } catch (error) {
      console.error("Error updating notes:", error);
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "1970-01-01T00:00:00+00:00") return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    if (!dateString || dateString === "1970-01-01T00:00:00+00:00") return "Never";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <div className="flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>{contact.full_name || "Unknown Contact"}</SheetTitle>
              <SheetDescription>{contact.title || "No title"}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{contact.email || "—"}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Organization</Label>
                  <p className="text-sm text-muted-foreground">{contact.organization || "—"}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Focus Areas</Label>
                  <p className="text-sm text-muted-foreground">{contact.focus_areas || "—"}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Last Touch</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatRelativeTime(contact.last_touch)}
                    {contact.last_touch && contact.last_touch !== "1970-01-01T00:00:00+00:00" && (
                      <span className="block text-xs">
                        {formatDate(contact.last_touch)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Activity Summary</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Badge variant="outline" className="mb-2">
                  {contact.emails_count || 0}
                </Badge>
                <p className="text-sm text-muted-foreground">Emails</p>
              </div>
              
              <div className="text-center">
                <Badge variant="outline" className="mb-2">
                  {contact.meetings_count || 0}
                </Badge>
                <p className="text-sm text-muted-foreground">Meetings</p>
              </div>
              
              <div className="text-center">
                <Badge variant="outline" className="mb-2">
                  {contact.opportunities_count || 0}
                </Badge>
                <p className="text-sm text-muted-foreground">Opportunities</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Notes</h3>
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={isUpdating}
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? "Saving..." : "Save"}
              </Button>
            </div>
            
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this contact..."
              className="min-h-[120px] resize-none"
            />
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Created: {formatDate(contact.created_at)}</p>
            <p>Updated: {formatDate(contact.updated_at)}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}