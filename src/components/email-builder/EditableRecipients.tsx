import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamMember } from "./EditableTeam";

interface EditableRecipientsProps {
  to: string;
  cc: string[];
  onToChange: (email: string) => void;
  onCcChange: (emails: string[]) => void;
  teamMembers: TeamMember[];
  defaultContactEmail: string;
}

export function EditableRecipients({
  to,
  cc,
  onToChange,
  onCcChange,
  teamMembers,
  defaultContactEmail,
}: EditableRecipientsProps) {
  const [ccInput, setCcInput] = useState("");
  const [invalidEmails, setInvalidEmails] = useState<Set<string>>(new Set());

  const validateEmail = (email: string): boolean => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(trimmed);
  };

  const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
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

  const handleSyncFromTeam = () => {
    const teamEmails = teamMembers
      .map(m => normalizeEmail(m.email))
      .filter(e => e && !cc.includes(e) && e !== normalizeEmail(to));
    
    onCcChange([...cc, ...teamEmails]);
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSyncFromTeam}
            className="h-7 gap-1.5 text-xs"
            disabled={teamMembers.length === 0}
          >
            <Users className="h-3.5 w-3.5" />
            Sync from Team
          </Button>
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
          Press Enter to add; paste lists with commas or semicolons
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
