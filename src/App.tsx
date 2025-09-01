import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Dashboard } from "@/pages/Dashboard";
import { Contacts } from "@/pages/Contacts";
import { Opportunities } from "@/pages/Opportunities";
import { Interactions } from "@/pages/Interactions";
import { AskAI } from "@/pages/AskAI";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Dashboard route - no sidebar wrapper */}
          <Route path="/" element={<Dashboard />} />
          
          {/* All other routes - wrapped with sidebar */}
          <Route path="/*" element={
            <SidebarProvider defaultOpen>
              <div className="flex min-h-screen w-full bg-background">
                <AppSidebar />
                
                <SidebarInset className="flex-1">
                  <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 shadow-sm">
                    <SidebarTrigger className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200" />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                      <span className="truncate font-medium">Light CRM</span>
                    </div>
                  </header>

                  <Routes>
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/opportunities" element={<Opportunities />} />
                    <Route path="/interactions" element={<Interactions />} />
                    <Route path="/ask-ai" element={<AskAI />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </SidebarInset>
              </div>
            </SidebarProvider>
          } />
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;