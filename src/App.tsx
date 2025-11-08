import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import SourceGreatnessPage from "@/pages/SourceGreatnessPage";
import { Contacts } from "@/pages/Contacts";
import { Opportunities } from "@/pages/Opportunities";
import Interactions from "@/pages/Interactions";
import { AskAI } from "@/pages/AskAI";
import { MakeYourOwnView } from "@/pages/MakeYourOwnView";
import { TomNewView } from "@/pages/TomNewView";
import KPIs from "@/pages/KPIs";
import { DataTableTest } from "@/pages/DataTableTest";
import MissingContacts from "@/pages/MissingContacts";
import { MeetingsWithTeam } from "@/pages/MeetingsWithTeam";
import Articles from "@/pages/Articles";
import { EmailBuilder } from "@/pages/EmailBuilder";
import { ContactsEmail } from "@/pages/ContactsEmail";
import DataMaintenance from "@/pages/DataMaintenance";
import GlobalLibraries from "@/pages/GlobalLibraries";
import { Admin } from "@/pages/Admin";
import { AdminDuplicates } from "@/pages/AdminDuplicates";
import ImportInteractions from "@/pages/ImportInteractions";
import Chat from "@/pages/Chat";
import { Auth } from "@/pages/Auth";
import { SetPassword } from "@/pages/SetPassword";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { PageTransition } from "@/components/shared/PageTransition";
import "./App.css";
import "@/styles/markdown.css";
import { logger } from "@/lib/logger";

function App() {
  logger.log('App component rendering...');
  logger.log('React version check:', React?.version);

  try {
    logger.log('About to render QueryProvider...');
    return (
      <ThemeProvider defaultTheme="system" storageKey="chat-theme">
        <QueryProvider>
          <AuthProvider>
          <Router>
          <Routes>
            {/* Auth routes - public */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/set-password" element={<SetPassword />} />
            
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
                      <Route path="/chat" element={<Chat />} />
                      
                      {/* Admin-only routes */}
                      <Route path="/make-your-own-view" element={
                        <ProtectedRoute requireAdmin>
                          <MakeYourOwnView />
                        </ProtectedRoute>
                      } />
                      <Route path="/data-maintenance" element={
                        <ProtectedRoute requireAdmin>
                          <DataMaintenance />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin" element={
                        <ProtectedRoute requireAdmin>
                          <Admin />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin/duplicates" element={
                        <ProtectedRoute requireAdmin>
                          <AdminDuplicates />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin/import-interactions" element={
                        <ProtectedRoute requireAdmin>
                          <ImportInteractions />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/datatable-test" element={<DataTableTest />} />
                      <Route path="/ask-ai" element={<AskAI />} />
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
      </ThemeProvider>
  );
  } catch (error) {
    logger.error('App render error:', error);
    return <div>Error loading app: {String(error)}</div>;
  }
}

export default App;