import { ReactNode, useState } from "react";
import { TopNav } from "./TopNav";
// import { FloatingAIAssistant } from "@/components/ai/FloatingAIAssistant";

interface AppLayoutProps {
  children: ReactNode;
  onFiltersClick?: () => void;
}

export function AppLayout({ children, onFiltersClick }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <TopNav onFiltersClick={onFiltersClick} />
      <main className="flex-1 min-w-0 min-h-0 w-full max-w-none">
        {children}
      </main>
      {/* <FloatingAIAssistant /> */}
    </div>
  );
}