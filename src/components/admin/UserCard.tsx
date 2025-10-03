import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Target, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserCardProps {
  user: {
    id: string;
    email: string;
    full_name?: string;
    role?: string;
    contacts_count: number;
    opportunities_count: number;
  } | null;
  isSelected: boolean;
  onClick: () => void;
  showAll?: boolean;
}

export function UserCard({ user, isSelected, onClick, showAll }: UserCardProps) {
  if (showAll) {
    return (
      <Card
        className={cn(
          "p-3 cursor-pointer transition-all hover:shadow-md",
          isSelected && "ring-2 ring-primary bg-primary/5"
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-muted">
            <AvatarFallback>
              <Users className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">All Data</p>
            <p className="text-xs text-muted-foreground">View all contacts & opportunities</p>
          </div>
          {isSelected && (
            <Check className="h-5 w-5 text-primary flex-shrink-0" />
          )}
        </div>
      </Card>
    );
  }

  if (!user) return null;

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 bg-primary text-primary-foreground flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">
              {user.full_name || user.email}
            </p>
            {isSelected && (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </div>
          
          {user.full_name && (
            <p className="text-xs text-muted-foreground truncate mb-2">
              {user.email}
            </p>
          )}
          
          {user.role && (
            <Badge variant="secondary" className="text-xs mb-2 capitalize">
              {user.role}
            </Badge>
          )}
          
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{user.contacts_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{user.opportunities_count}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
