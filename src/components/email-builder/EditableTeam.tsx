import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Plus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface EditableTeamProps {
  members: TeamMember[];
  onMembersChange: (members: TeamMember[]) => void;
  onQuickAddToCC?: (member: TeamMember) => void;
}

export function EditableTeam({ members, onMembersChange, onQuickAddToCC }: EditableTeamProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock directory - in production, this would fetch from an API
  const mockDirectory: TeamMember[] = [
    { id: "p_101", name: "Peter Nürnberg", email: "nurnberg@lindsaygoldbergllc.com", role: "Lead" },
    { id: "p_203", name: "John Cavalaris", email: "john.cavalaris@key.com", role: "AE" },
    { id: "p_309", name: "David Cannon", email: "david.cannon@key.com", role: "Lead" },
    { id: "p_411", name: "Sarah Mitchell", email: "mitchell@lindsaygoldbergllc.com", role: "Assistant" },
    { id: "p_557", name: "Tom Mendez", email: "mendez@lindsaygoldbergllc.com", role: "Lead" },
    { id: "p_992", name: "Samantha Folzenlogen", email: "samantha.folzenlogen@key.com", role: "Assistant" },
  ];

  const availableMembers = mockDirectory.filter(
    person => !members.some(m => m.id === person.id)
  );

  const handleRemoveMember = (member: TeamMember) => {
    const newMembers = members.filter(m => m.id !== member.id);
    onMembersChange(newMembers);
    
    toast({
      title: "Removed from team",
      description: `${member.name} removed from team`,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMembersChange([...newMembers, member])}
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
    
    toast({
      title: "Added to team",
      description: `${member.name} added to team`,
      action: onQuickAddToCC ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onQuickAddToCC(member)}
        >
          Add to CC
        </Button>
      ) : undefined,
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "Lead":
        return "default";
      case "Assistant":
        return "secondary";
      case "AE":
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
              <CommandEmpty>No people found.</CommandEmpty>
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
