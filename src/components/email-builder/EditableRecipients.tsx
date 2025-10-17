import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Users, Mail, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { TeamMember } from "./EditableTeam";

interface EditableRecipientsProps {
  to: string;
  cc: string[];
  onToChange: (email: string) => void;
  onCcChange: (emails: string[]) => void;
  teamMembers: TeamMember[];
  defaultContactEmail: string;
  emailCc?: string | null;
  meetingCc?: string | null;
  deltaType?: 'Email' | 'Meeting' | null;
}

export function EditableRecipients({
  to,
  cc,
  onToChange,
  onCcChange,
  teamMembers,
  defaultContactEmail,
  emailCc,
  meetingCc,
  deltaType,
}: EditableRecipientsProps) {
  const [ccInput, setCcInput] = useState("");
  const [invalidEmails, setInvalidEmails] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const validateEmail = (email: string): boolean => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(trimmed);
  };

  const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
  };

  const normalizeList = (emails: string[]): string[] => {
    const normalized = emails
      .map(e => e?.trim().toLowerCase())
      .filter(e => e && validateEmail(e));
    return Array.from(new Set(normalized));
  };

  const handleToChange = (value: string) => {
    onToChange(value);
  };

  const handleCcInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCcEmail();
    } else if (e.key === "Backspace" && !ccInput && cc.length > 0) {
      // Remove last email on backspace when input is empty
      handleRemoveCc(cc[cc.length - 1]);
    }
  };

  const addCcEmail = () => {
    if (!ccInput.trim()) return;

    // Split on common separators
    const emails = ccInput
      .split(/[,;]+/)
      .map(e => normalizeEmail(e))
      .filter(e => e);

    const validEmails: string[] = [];
    const invalid = new Set(invalidEmails);

    emails.forEach(email => {
      if (!validateEmail(email)) {
        invalid.add(email);
        setTimeout(() => {
          setInvalidEmails(prev => {
            const next = new Set(prev);
            next.delete(email);
            return next;
          });
        }, 3000);
      } else if (!cc.includes(email) && email !== normalizeEmail(to)) {
        validEmails.push(email);
      }
    });

    setInvalidEmails(invalid);

    if (validEmails.length > 0) {
      onCcChange([...cc, ...validEmails]);
      setCcInput("");
    } else if (emails.length === 1 && invalid.has(emails[0])) {
      // Shake animation for invalid email
      setCcInput("");
    }
  };

  const handleCcPaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text");
    if (pastedText.includes(",") || pastedText.includes(";")) {
      e.preventDefault();
      setCcInput(ccInput + pastedText);
      setTimeout(addCcEmail, 0);
    }
  };

  const handleRemoveCc = (email: string) => {
    onCcChange(cc.filter(e => e !== email));
  };

  const handleSyncFromLastEmail = () => {
    if (!emailCc || !emailCc.trim()) {
      toast({
        title: "No Email CC Found",
        description: "No CC recipients from last email interaction",
        variant: "destructive",
      });
      return;
    }
    
    const emailsFromLastEmail = normalizeList(emailCc.split(/[;,]/))
      .filter(e => e !== normalizeEmail(to));
    
    onCcChange(emailsFromLastEmail);
    toast({
      title: "CC Replaced with Last Email",
      description: `Set ${emailsFromLastEmail.length} recipient(s)`,
    });
  };

  const handleSyncFromLastMeeting = () => {
    if (!meetingCc || !meetingCc.trim()) {
      toast({
        title: "No Meeting CC Found",
        description: "No CC recipients from last meeting",
        variant: "destructive",
      });
      return;
    }
    
    const emailsFromLastMeeting = normalizeList(meetingCc.split(/[;,]/))
      .filter(e => e !== normalizeEmail(to));
    
    onCcChange(emailsFromLastMeeting);
    toast({
      title: "CC Replaced with Last Meeting",
      description: `Set ${emailsFromLastMeeting.length} recipient(s)`,
    });
  };

  const handleSyncFromTeam = () => {
    const teamEmails = normalizeList(teamMembers.map(m => m.email))
      .filter(e => e !== normalizeEmail(to));
    
    onCcChange(teamEmails);
    toast({
      title: "CC Replaced with Team",
      description: `Set ${teamEmails.length} recipient(s)`,
    });
  };

  return (
    <div className="space-y-4">
      {/* TO Field */}
      <div className="space-y-2">
        <Label htmlFor="to-email">To</Label>
        <Input
          id="to-email"
          type="email"
          value={to}
          onChange={(e) => handleToChange(e.target.value)}
          placeholder={defaultContactEmail}
          className={cn(
            to && !validateEmail(to) && "ring-2 ring-destructive"
          )}
        />
        {to && !validateEmail(to) && (
          <p className="text-xs text-destructive">Enter a valid email address</p>
        )}
      </div>

      {/* CC Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="cc-email">CC</Label>
          <div className="flex gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant={deltaType === 'Email' ? "outline" : "ghost"}
                    size="sm"
                    onClick={handleSyncFromLastEmail}
                    className={cn(
                      "h-7 gap-1.5 text-xs",
                      deltaType === 'Email' && "border-primary"
                    )}
                    disabled={!emailCc || !emailCc.trim()}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Last Email
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-semibold mb-1">Replace CC with Last Email</p>
                    <p className="text-xs text-muted-foreground">
                      {emailCc || 'No CC recipients'}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant={deltaType === 'Meeting' ? "outline" : "ghost"}
                    size="sm"
                    onClick={handleSyncFromLastMeeting}
                    className={cn(
                      "h-7 gap-1.5 text-xs",
                      deltaType === 'Meeting' && "border-primary"
                    )}
                    disabled={!meetingCc || !meetingCc.trim()}
                  >
                    <Video className="h-3.5 w-3.5" />
                    Last Meeting
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-semibold mb-1">Replace CC with Last Meeting</p>
                    <p className="text-xs text-muted-foreground">
                      {meetingCc || 'No CC recipients'}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSyncFromTeam}
                    className="h-7 gap-1.5 text-xs"
                    disabled={teamMembers.length === 0}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Team
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {teamMembers.length > 0 
                      ? `Replace CC with team (${teamMembers.length} members)` 
                      : 'No team members available'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="min-h-[42px] rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <div className="flex flex-wrap gap-1.5 items-center">
            {cc.map((email) => (
              <Badge
                key={email}
                variant="secondary"
                className="gap-1 pr-1"
              >
                <span className="text-xs">{email}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-destructive/10"
                  onClick={() => handleRemoveCc(email)}
                  aria-label={`Remove ${email} from CC`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            <input
              id="cc-email"
              type="text"
              value={ccInput}
              onChange={(e) => setCcInput(e.target.value)}
              onKeyDown={handleCcInputKeyDown}
              onPaste={handleCcPaste}
              onBlur={addCcEmail}
              placeholder={cc.length === 0 ? "Enter email addresses..." : ""}
              className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Click a sync button to replace CC; type to manually add more
        </p>
        
        {invalidEmails.size > 0 && (
          <p className="text-xs text-destructive animate-shake">
            Invalid email format: {Array.from(invalidEmails).join(", ")}
          </p>
        )}
      </div>

      {/* Preview Summary */}
      {(to || cc.length > 0) && (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
          {to && validateEmail(to) && (
            <div>
              <span className="font-medium">To:</span> {to}
            </div>
          )}
          {cc.length > 0 && (
            <div>
              <span className="font-medium">CC:</span> {cc.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
