import { ReactNode, useState } from "react";
import { TopNav } from "./TopNav";

interface AppLayoutProps {
  children: ReactNode;
  onFiltersClick?: () => void;
}

export function AppLayout({ children, onFiltersClick }: AppLayoutProps) {
  return (
    <div className="grid h-dvh grid-rows-[auto_1fr] overflow-hidden">
      <TopNav onFiltersClick={onFiltersClick} />
      <main className="min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}