import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Building, Target, Calendar } from "lucide-react";

interface ContactApp {
  id: string | null;
  full_name: string | null;
  email_address: string | null;
  organization: string | null;
  title: string | null;
  lg_focus_areas_comprehensive_list: string | null;
  of_emails: number | null;
  of_meetings: number | null;
  total_of_contacts: number | null;
  most_recent_contact: string | null;
}

interface ContactDrawerProps {
  contact: ContactApp | null;
  open: boolean;
  onClose: () => void;
  onContactUpdated: () => void;
}

export function ContactDrawer({ contact, open, onClose, onContactUpdated }: ContactDrawerProps) {

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
                  <p className="text-sm text-muted-foreground">{contact.email_address || "—"}</p>
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
                  <p className="text-sm text-muted-foreground">{contact.lg_focus_areas_comprehensive_list || "—"}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Last Touch</Label>
                  <p className="text-sm text-muted-foreground">
                     {formatRelativeTime(contact.most_recent_contact || "")}
                     {contact.most_recent_contact && contact.most_recent_contact !== "1970-01-01T00:00:00+00:00" && (
                       <span className="block text-xs">
                         {formatDate(contact.most_recent_contact)}
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
                   {contact.of_emails || 0}
                 </Badge>
                 <p className="text-sm text-muted-foreground">Emails</p>
               </div>
               
               <div className="text-center">
                 <Badge variant="outline" className="mb-2">
                   {contact.of_meetings || 0}
                 </Badge>
                 <p className="text-sm text-muted-foreground">Meetings</p>
               </div>
               
               <div className="text-center">
                 <Badge variant="outline" className="mb-2">
                   {contact.total_of_contacts || 0}
                 </Badge>
                 <p className="text-sm text-muted-foreground"># of Contacts</p>
              </div>
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}