import { ReactNode, useState } from "react";
import { TopNav } from "./TopNav";

interface AppLayoutProps {
  children: ReactNode;
  onFiltersClick?: () => void;
}

export function AppLayout({ children, onFiltersClick }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav onFiltersClick={onFiltersClick} />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}