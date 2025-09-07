import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Dashboard } from "@/pages/Dashboard";
import { Contacts } from "@/pages/Contacts";
import { Opportunities } from "@/pages/Opportunities";
import { Interactions } from "@/pages/Interactions";
import { AskAI } from "@/pages/AskAI";
import { MakeYourOwnView } from "@/pages/MakeYourOwnView";
import { TomNewView } from "@/pages/TomNewView";
import { KPIs } from "@/pages/KPIs";
import { DataTableTest } from "@/pages/DataTableTest";
import { Auth } from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PageTransition } from "@/components/shared/PageTransition";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Auth route - public */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* All other routes - wrapped with sidebar */}
            <Route path="/*" element={
              <ProtectedRoute>
                <SidebarProvider defaultOpen>
                  <div className="flex min-h-screen w-full bg-background">
                    <AppSidebar />
                    
                    <SidebarInset className="flex-1">
                      <a href="#main-content" className="skip-link">Skip to main content</a>
                      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 shadow-sm">
                        <SidebarTrigger 
                          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200 focus-ring" 
                          aria-label="Toggle sidebar navigation"
                        />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                          <span className="truncate font-medium">AI CRM</span>
                        </div>
                      </header>

                      <main id="main-content" className="flex-1">
                        <PageTransition>
                          <Routes>
                            <Route path="/contacts" element={<Contacts />} />
                            <Route path="/opportunities" element={<Opportunities />} />
                            <Route path="/interactions" element={<Interactions />} />
                            <Route path="/kpis" element={<KPIs />} />
                            <Route path="/tom-new-view" element={<TomNewView />} />
                            <Route path="/make-your-own-view" element={<MakeYourOwnView />} />
                            <Route path="/datatable-test" element={<DataTableTest />} />
                            <Route path="/ask-ai" element={<AskAI />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </PageTransition>
                      </main>
                    </SidebarInset>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;