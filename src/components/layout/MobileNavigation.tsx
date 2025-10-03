import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, Target, MessageSquare, Table, Bot, Eye, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

const mobileMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home, roles: ['admin', 'user', 'viewer'] },
  { title: "Contacts", url: "/contacts", icon: Users, roles: ['admin', 'user', 'viewer'] },
  { title: "Opportunities", url: "/opportunities", icon: Target, roles: ['admin', 'user', 'viewer'] },
  { title: "Interactions", url: "/interactions", icon: MessageSquare, roles: ['admin', 'user'] },
];

export function MobileNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { role } = useUserRole();

  const isActive = (path: string) => currentPath === path;
  
  // Filter menu items based on user role
  const visibleMenuItems = mobileMenuItems.filter(item => 
    !role || item.roles.includes(role)
  );

  return (
    <div className="nav-mobile">
      <div className={`grid h-16`} style={{ gridTemplateColumns: `repeat(${visibleMenuItems.length}, 1fr)` }}>
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={({ isActive }) =>
              cn(
                "nav-mobile-item transition-colors duration-200",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )
            }
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-badge-size font-medium truncate px-1">
              {item.title}
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}