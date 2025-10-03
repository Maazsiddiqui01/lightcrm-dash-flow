import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import SourceGreatnessPage from "@/pages/SourceGreatnessPage";
import { Contacts } from "@/pages/Contacts";
import { Opportunities } from "@/pages/Opportunities";
import { Interactions } from "@/pages/Interactions";
import { AskAI } from "@/pages/AskAI";
import { MakeYourOwnView } from "@/pages/MakeYourOwnView";
import { TomNewView } from "@/pages/TomNewView";
import { KPIs } from "@/pages/KPIs";
import { DataTableTest } from "@/pages/DataTableTest";
import MissingContacts from "@/pages/MissingContacts";
import { MeetingsWithTeam } from "@/pages/MeetingsWithTeam";
import Articles from "@/pages/Articles";
import { EmailBuilder } from "@/pages/EmailBuilder";
import { ContactsEmail } from "@/pages/ContactsEmail";
import { DataMaintenance } from "@/pages/DataMaintenance";
import { GlobalLibraries } from "@/pages/GlobalLibraries";
import { Admin } from "@/pages/Admin";
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
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            } />
            
            {/* All other routes - wrapped with AppLayout */}
            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout>
                  <PageTransition>
                    <Routes>
                      <Route path="/sourcing-greatness" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<SourceGreatnessPage />} />
                      <Route path="/contacts" element={<Contacts />} />
                      <Route path="/missing-contacts" element={<MissingContacts />} />
                      <Route path="/opportunities" element={<Opportunities />} />
                      <Route path="/interactions" element={<Interactions />} />
                      <Route path="/articles" element={<Articles />} />
                      <Route path="/email-builder" element={<EmailBuilder />} />
                      <Route path="/global-libraries" element={<GlobalLibraries />} />
                      <Route path="/contacts-email" element={<ContactsEmail />} />
                      <Route path="/kpis" element={<KPIs />} />
                      <Route path="/meetings-with-team" element={<MeetingsWithTeam />} />
                      <Route path="/tom-new-view" element={<TomNewView />} />
                      <Route path="/make-your-own-view" element={<MakeYourOwnView />} />
                      <Route path="/data-maintenance" element={<DataMaintenance />} />
                      <Route path="/datatable-test" element={<DataTableTest />} />
                      <Route path="/ask-ai" element={<AskAI />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </PageTransition>
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