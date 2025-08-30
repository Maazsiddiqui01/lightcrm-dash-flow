import { Users, Target, MessageSquare, Bot, Building2, Settings, ExternalLink } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigationItems = [
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "opportunities", label: "Opportunities", icon: Target },
  { id: "interactions", label: "Interactions", icon: MessageSquare },
  { id: "ask-ai", label: "Ask AI", icon: Bot },
];

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (itemId: string) => activeTab === itemId;

  const handleNavigation = (itemId: string) => {
    onTabChange(itemId);
  };

  const NavItem = ({ item }: { item: typeof navigationItems[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.id);
    
    const button = (
      <SidebarMenuButton
        onClick={() => handleNavigation(item.id)}
        className={`w-full justify-start transition-colors ${
          active 
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
            : "hover:bg-sidebar-accent/50"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="ml-3">{item.label}</span>}
      </SidebarMenuButton>
    );

    if (collapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">Light CRM</h1>
              <p className="text-xs text-muted-foreground">Professional Edition</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <NavItem item={item} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>v1.0.0</span>
              <button className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors">
                <Settings className="h-3 w-3" />
                <span>Settings</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}