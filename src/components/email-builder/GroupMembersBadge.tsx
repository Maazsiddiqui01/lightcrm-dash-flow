import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useGroupMembers } from "@/hooks/useGroupMembers";

interface GroupMembersBadgeProps {
  groupName: string | null | undefined;
  compact?: boolean;
}

export function GroupMembersBadge({ groupName, compact = false }: GroupMembersBadgeProps) {
  const { data: groupMembers, isLoading } = useGroupMembers(groupName);

  if (!groupName || isLoading) return null;

  // Count all members, even if roles are not assigned
  const totalMembers = groupMembers?.all?.length || (groupMembers?.to.length || 0) + (groupMembers?.cc.length || 0) + (groupMembers?.bcc.length || 0);

  if (totalMembers === 0) return null;

  if (compact) {
    return (
      <Badge variant="secondary" className="text-xs">
        <Users className="h-3 w-3 mr-1" />
        {totalMembers} members
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 text-xs">
      {groupMembers?.to && groupMembers.to.length > 0 && (
        <Badge variant="default" className="text-xs">
          To: {groupMembers.to.length}
        </Badge>
      )}
      {groupMembers?.cc && groupMembers.cc.length > 0 && (
        <Badge variant="outline" className="text-xs">
          CC: {groupMembers.cc.length}
        </Badge>
      )}
      {groupMembers?.bcc && groupMembers.bcc.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          BCC: {groupMembers.bcc.length}
        </Badge>
      )}
    </div>
  );
}
