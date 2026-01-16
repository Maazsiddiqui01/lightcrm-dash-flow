import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTeamDirectory } from "@/hooks/useTeamDirectory";
import type { TeamMember } from "@/hooks/useTeamDirectory";

export type { TeamMember };

interface EditableTeamProps {
  members: TeamMember[];
  onMembersChange: (members: TeamMember[]) => void;
  onQuickAddToCC?: (member: TeamMember) => void;
  onRemoveFromCC?: (email: string) => void;
  contactEmail?: string;
}

export function EditableTeam({ members, onMembersChange, onQuickAddToCC, onRemoveFromCC, contactEmail }: EditableTeamProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: directory = [], isLoading } = useTeamDirectory(contactEmail);

  const availableMembers = directory.filter(
    person => !members.some(m => m.id === person.id)
  );

  const handleRemoveMember = (member: TeamMember) => {
    const newMembers = members.filter(m => m.id !== member.id);
    onMembersChange(newMembers);
    
    // Auto-remove from CC
    if (onRemoveFromCC && member.email) {
      onRemoveFromCC(member.email);
    }
    
    toast({
      title: "Removed from team & CC",
      description: `${member.name} removed`,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onMembersChange([...newMembers, member]);
            // Re-add to CC on undo
            if (onQuickAddToCC) {
              onQuickAddToCC(member);
            }
          }}
        >
          Undo
        </Button>
      ),
    });
  };

  const handleAddMember = (member: TeamMember) => {
    onMembersChange([...members, member]);
    setOpen(false);
    setSearchQuery("");
    
    // Auto-add to CC
    if (onQuickAddToCC) {
      onQuickAddToCC(member);
    }
    
    toast({
      title: "Added to team & CC",
      description: `${member.name} added to team and CC list`,
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Lead":
        return "default";
      case "Assistant":
        return "secondary";
      case "Colleague":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground">No team members assigned</p>
        )}
        {members.map((member) => (
          <TooltipProvider key={member.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-sm hover:border-foreground/50 transition-colors">
                  <span className="font-medium">{member.name}</span>
                  <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                    {member.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-destructive/10"
                    onClick={() => handleRemoveMember(member)}
                    aria-label={`Remove ${member.name} from team`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-medium">{member.email}</div>
                  <div className="text-muted-foreground">{member.role}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add team member
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search people..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>{isLoading ? 'Loading...' : 'No people found.'}</CommandEmpty>
              <CommandGroup>
                {availableMembers.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={`${person.name} ${person.email}`}
                    onSelect={() => handleAddMember(person)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{person.name}</div>
                        <div className="text-xs text-muted-foreground">{person.email}</div>
                      </div>
                      <Badge variant={getRoleBadgeVariant(person.role)} className="text-xs">
                        {person.role}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
