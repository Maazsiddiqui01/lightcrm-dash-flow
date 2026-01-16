import { useState } from 'react';
import { useOverdueContacts, type UrgencyContact, type UrgencyCategory } from '@/hooks/useOverdueContacts';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Clock, AlertTriangle, Calendar, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Minimal contact type for quick selection (full data loaded after selection)
export interface QuickSelectContact {
  contact_id: string;
  full_name: string;
  email: string;
  organization?: string;
}

interface QuickSelectPanelProps {
  onContactSelect: (contact: QuickSelectContact) => void;
}

export function QuickSelectPanel({ onContactSelect }: QuickSelectPanelProps) {
  const { data: categories, isLoading, error } = useOverdueContacts();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Overdue']));
  
  const toggleSection = (label: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };
  
  const handleContactClick = (contact: UrgencyContact) => {
    // Create minimal contact for selection - full data loaded after selection
    const quickContact: QuickSelectContact = {
      contact_id: contact.id,
      full_name: contact.name,
      email: '', // Will be loaded from v_contact_email_composer
      organization: contact.organization || undefined,
    };
    onContactSelect(quickContact);
  };
  
  const getCategoryIcon = (label: string) => {
    switch (label) {
      case 'Overdue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'Due in 7 Days':
        return <Clock className="h-4 w-4" />;
      case 'Due in 14 Days':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  
  const getBadgeVariant = (color: UrgencyCategory['color']) => {
    switch (color) {
      case 'destructive':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'secondary':
        return 'secondary';
      default:
        return 'default';
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Failed to load contacts
      </div>
    );
  }
  
  const totalContacts = categories?.reduce((sum, cat) => sum + cat.contacts.length, 0) || 0;
  
  if (totalContacts === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="font-medium">No urgent contacts</p>
        <p className="text-sm">All contacts are up to date</p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-3">
        {categories?.map(category => (
          <Collapsible
            key={category.label}
            open={expandedSections.has(category.label)}
            onOpenChange={() => toggleSection(category.label)}
          >
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
                  "hover:bg-muted/50 border",
                  category.contacts.length === 0 && "opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  {getCategoryIcon(category.label)}
                  <span className="font-medium">{category.label}</span>
                  <Badge variant={getBadgeVariant(category.color)} className="ml-1">
                    {category.contacts.length}
                  </Badge>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedSections.has(category.label) && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="mt-2 space-y-1 pl-2">
                {category.contacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => handleContactClick(contact)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-md transition-all",
                      "hover:bg-primary/5 hover:border-primary/30 border border-transparent",
                      "focus:outline-none focus:ring-2 focus:ring-primary/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {contact.contact_type === 'group' ? (
                            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="font-medium text-sm truncate">
                            {contact.name}
                          </span>
                        </div>
                        {contact.organization && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 pl-5">
                            {contact.organization}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={category.color === 'destructive' ? 'destructive' : 'outline'}
                        className="shrink-0 text-xs"
                      >
                        {category.label === 'Overdue' 
                          ? `-${contact.urgencyDays}d`
                          : `+${contact.urgencyDays}d`
                        }
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </ScrollArea>
  );
}
