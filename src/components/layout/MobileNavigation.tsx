import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, Target, MessageSquare, Table, Bot, Eye, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Opportunities", url: "/opportunities", icon: Target },
  { title: "Interactions", url: "/interactions", icon: MessageSquare },
];

export function MobileNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <div className="nav-mobile">
      <div className="grid grid-cols-4 h-16">
        {mobileMenuItems.map((item) => (
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