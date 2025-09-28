import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Home, Users, Target, MessageSquare, Table, Bot, LogOut, Eye, BarChart3, FileText, Mail, MailOpen } from "lucide-react";

const menuItems = [
  { title: "Sourcing Greatness", url: "/sourcing-greatness", icon: BarChart3 },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Missing Contacts", url: "/missing-contacts", icon: Users },
  { title: "Opportunities", url: "/opportunities", icon: Target },
  { title: "Interactions", url: "/interactions", icon: MessageSquare },
  { title: "Articles", url: "/articles", icon: FileText },
  { title: "Email Builder", url: "/email-builder", icon: Mail },
  { title: "Contacts Email", url: "/contacts-email", icon: MailOpen },
  { title: "KPIs", url: "/kpis", icon: BarChart3 },
  { title: "Tom New View", url: "/tom-new-view", icon: Eye },
  { title: "Make Your Own View", url: "/make-your-own-view", icon: Table },
  { title: "Ask AI", url: "/ask-ai", icon: Bot },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut, user } = useAuth();

  const isActive = (path: string) => currentPath === path;
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-primary font-medium border-r-2 border-sidebar-primary" 
      : "hover:bg-sidebar-accent/50 text-sidebar-foreground";

  return (
    <Sidebar>
      <SidebarContent className="bg-sidebar-background border-r border-sidebar-border">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground font-semibold px-4 py-3">
            CRM Navigation
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${getNavCls({ isActive })}`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Section */}
        <div className="mt-auto p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground text-sm font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.email}</p>
              <p className="text-xs text-sidebar-foreground/70">Authenticated User</p>
            </div>
          </div>
          
          <Button 
            onClick={() => signOut()} 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}