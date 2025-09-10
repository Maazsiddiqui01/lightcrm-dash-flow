import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import SourcingGreatness from "@/pages/SourcingGreatness";
import { Contacts } from "@/pages/Contacts";
import { Opportunities } from "@/pages/Opportunities";
import { Interactions } from "@/pages/Interactions";
import { AskAI } from "@/pages/AskAI";
import { MakeYourOwnView } from "@/pages/MakeYourOwnView";
import { TomNewView } from "@/pages/TomNewView";
import { KPIs } from "@/pages/KPIs";
import { DataTableTest } from "@/pages/DataTableTest";
import MissingContacts from "@/pages/MissingContacts";
import { Auth } from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/providers/QueryProvider";
import { PageTransition } from "@/components/shared/PageTransition";
import "./App.css";

function App() {
  console.log('App component rendering...');
  console.log('React version check:', React?.version);

  try {
    console.log('About to render QueryProvider...');
    return (
      <QueryProvider>
        <AuthProvider>
        <Router>
          <Routes>
            {/* Auth route - public */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Navigate to="/sourcing-greatness" replace />
              </ProtectedRoute>
            } />
            
            {/* All other routes - wrapped with AppLayout */}
            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout>
                  <a href="#main-content" className="skip-link">Skip to main content</a>
                  <main id="main-content" className="h-full">
                    <PageTransition>
                      <Routes>
                        <Route path="/sourcing-greatness" element={<SourcingGreatness />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/contacts" element={<Contacts />} />
                        <Route path="/missing-contacts" element={<MissingContacts />} />
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
                </AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryProvider>
  );
  } catch (error) {
    console.error('App render error:', error);
    return <div>Error loading app: {String(error)}</div>;
  }
}

export default App;