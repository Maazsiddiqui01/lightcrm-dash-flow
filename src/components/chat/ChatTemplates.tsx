import { useState } from "react";
import { User, Briefcase, Users, Search, AlertTriangle, Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface Template {
  id: string;
  category: string;
  prompt: string;
  description: string;
  icon: typeof User;
  placeholders: string[];
}

const templates: Template[] = [
  // Contact Information
  {
    id: "recent-contact",
    category: "Contact Information",
    prompt: "What was my most recent contact with [Contact Name]?",
    description: "View last interaction with a contact",
    icon: User,
    placeholders: ["Contact Name"],
  },
  {
    id: "all-interactions",
    category: "Contact Information",
    prompt: "Show me all interactions with [Contact Name] from [Organization]",
    description: "See full contact history",
    icon: User,
    placeholders: ["Contact Name", "Organization"],
  },
  {
    id: "next-meeting",
    category: "Contact Information",
    prompt: "When is my next meeting with [Contact Name]?",
    description: "Check upcoming meetings",
    icon: Calendar,
    placeholders: ["Contact Name"],
  },
  {
    id: "update-note",
    category: "Contact Information",
    prompt: "Update the note for [Contact Name] to: [Your note here]",
    description: "Add or update contact notes",
    icon: User,
    placeholders: ["Contact Name", "Your note here"],
  },
  
  // Opportunities
  {
    id: "contact-opps",
    category: "Opportunities",
    prompt: "What opportunities are associated with [Contact Name]?",
    description: "View deals for a contact",
    icon: Briefcase,
    placeholders: ["Contact Name"],
  },
  {
    id: "org-opps",
    category: "Opportunities",
    prompt: "Show me all active opportunities at [Organization]",
    description: "See organization deals",
    icon: Briefcase,
    placeholders: ["Organization"],
  },
  {
    id: "opp-status",
    category: "Opportunities",
    prompt: "What's the status of the opportunity for [Contact Name]?",
    description: "Check deal progress",
    icon: Briefcase,
    placeholders: ["Contact Name"],
  },
  
  // Focus Areas & Team
  {
    id: "focus-leads",
    category: "Focus Areas & Team",
    prompt: "Who are the leads for [Focus Area Name]?",
    description: "Find team leads",
    icon: Users,
    placeholders: ["Focus Area Name"],
  },
  {
    id: "focus-contacts",
    category: "Focus Areas & Team",
    prompt: "Show me all contacts in the [Focus Area Name] focus area",
    description: "List focus area contacts",
    icon: Users,
    placeholders: ["Focus Area Name"],
  },
  {
    id: "focus-assistant",
    category: "Focus Areas & Team",
    prompt: "Who is the assistant for [Focus Area Name]?",
    description: "Find team assistant",
    icon: Users,
    placeholders: ["Focus Area Name"],
  },
  
  // Search & Analysis
  {
    id: "org-contacts",
    category: "Search & Analysis",
    prompt: "Find all contacts at [Organization]",
    description: "Search by organization",
    icon: Search,
    placeholders: ["Organization"],
  },
  {
    id: "inactive-contacts",
    category: "Search & Analysis",
    prompt: "Show me contacts I haven't contacted in the last [30] days",
    description: "Find inactive contacts",
    icon: Search,
    placeholders: ["30"],
  },
];

interface ChatTemplatesProps {
  onSelectTemplate: (template: Template) => void;
}

export function ChatTemplates({ onSelectTemplate }: ChatTemplatesProps) {
  const [showAll, setShowAll] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const displayedTemplates = showAll ? templates : templates.slice(0, 6);

  return (
    <div className="w-full mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between chat-border hover:border-[rgb(var(--chat-accent))] transition-colors"
          >
            <span className="font-medium chat-text">
              {isOpen ? "Hide Quick Prompts" : `Show Quick Prompts (${templates.length})`}
            </span>
            <ChevronDown 
              className={cn(
                "h-4 w-4 transition-transform duration-200 chat-text",
                isOpen && "rotate-180"
              )} 
            />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-4 animate-accordion-down data-[state=closed]:animate-accordion-up">
          {/* Warning Banner */}
          <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  Important: Use Exact Spelling
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                  For accurate results, use the exact spelling, capitalization, and spacing for contact names, organizations, and focus areas.
                </p>
                <div className="text-xs space-y-1 text-amber-700 dark:text-amber-300">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 dark:text-green-400">✓</span>
                    <span>Correct: "John Smith", "Acme Corporation"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 dark:text-red-400">✗</span>
                    <span>Incorrect: "john smith", "ACME Corp", "Acme Corp."</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayedTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className={cn(
                  "group relative p-4 rounded-lg border transition-all text-left",
                  "hover:border-[rgb(var(--chat-accent))] hover:shadow-md",
                  "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--chat-accent))] focus:ring-offset-2",
                  "chat-border bg-[rgb(var(--chat-bg))] hover:bg-[rgb(var(--chat-hover))]"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    "bg-[rgb(var(--chat-accent))]/10 text-[rgb(var(--chat-accent))]",
                    "group-hover:bg-[rgb(var(--chat-accent))]/20"
                  )}>
                    <template.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium chat-text mb-1 line-clamp-1">
                      {template.prompt.replace(/\[([^\]]+)\]/g, "___")}
                    </h5>
                    <p className="text-sm chat-text-muted line-clamp-1">
                      {template.description}
                    </p>
                  </div>
                </div>
                
                {/* Show full prompt on hover */}
                <div className={cn(
                  "absolute left-0 right-0 top-full mt-2 p-3 rounded-lg shadow-lg z-10",
                  "opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all",
                  "bg-[rgb(var(--chat-hover))] border chat-border"
                )}>
                  <p className="text-sm chat-text">
                    {template.prompt.split(/(\[[^\]]+\])/).map((part, i) => (
                      part.startsWith('[') && part.endsWith(']') ? (
                        <span key={i} className="font-semibold text-[rgb(var(--chat-accent))]">
                          {part}
                        </span>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    ))}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Show More/Less Button */}
          {templates.length > 6 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className={cn(
                "w-full mt-3 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                "text-[rgb(var(--chat-accent))] hover:bg-[rgb(var(--chat-accent))]/10",
                "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--chat-accent))] focus:ring-offset-2"
              )}
            >
              {showAll ? "Show Less" : `Show ${templates.length - 6} More Templates...`}
            </button>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
