import { Building2 } from "lucide-react";

export function Navbar() {
  return (
    <nav className="bg-navbar border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-navbar-foreground mr-3" />
            <h1 className="text-xl font-semibold text-navbar-foreground">
              Sourcing Greatness
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-navbar-foreground/80">
              Welcome back
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}