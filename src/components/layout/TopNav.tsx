import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Building2, Menu, LogOut, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { NotificationBadge } from "@/components/contacts/NotificationBadge";

const navItems = [
  { title: "Dashboard", url: "/dashboard" },
  { title: "Contacts", url: "/contacts" },
  { title: "Pending Contacts", url: "/missing-contacts" },
  { title: "Opportunities", url: "/opportunities" },
  { title: "Interactions", url: "/interactions" },
  { title: "Email Builder", url: "/email-builder" },
  { title: "AI Agent", url: "/make-your-own-view" },
  { title: "Data Maintenance", url: "/data-maintenance" },
];

const filterPages = ["/contacts", "/missing-contacts", "/opportunities", "/interactions", "/kpis"];

interface TopNavProps {
  onFiltersClick?: () => void;
}

export function TopNav({ onFiltersClick }: TopNavProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const showFilters = filterPages.includes(currentPath) && onFiltersClick;

  const getNavCls = (path: string) =>
    currentPath === path 
      ? "bg-primary text-primary-foreground font-medium" 
      : "hover:bg-accent hover:text-accent-foreground text-muted-foreground";

  const NavItems = () => (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.title}
          to={item.url}
          className={({ isActive }) => cn(
            "px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isActive 
              ? "bg-primary text-primary-foreground" 
              : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
          )}
          onClick={() => setMobileOpen(false)}
        >
          {item.title}
        </NavLink>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Sourcing Greatness</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          <NavItems />
        </nav>

        {/* Right Side */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <NotificationBadge />
          
          {/* Filters Button */}
          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onFiltersClick}
              className="hidden md:flex"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          )}

          {/* User Info */}
          <div className="hidden sm:flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium truncate max-w-32">{user?.email}</p>
            </div>
          </div>

          {/* Sign Out */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="hidden md:flex"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex flex-col space-y-4 mt-6">
                <div className="flex items-center space-x-3 pb-4 border-b">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{user?.email}</p>
                    <p className="text-sm text-muted-foreground">Authenticated User</p>
                  </div>
                </div>
                
                <nav className="flex flex-col space-y-2">
                  <NavItems />
                </nav>

                {showFilters && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onFiltersClick();
                      setMobileOpen(false);
                    }}
                    className="w-full justify-start"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => signOut()}
                  className="w-full justify-start"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}