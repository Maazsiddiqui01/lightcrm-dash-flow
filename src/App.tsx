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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PageTransition } from "@/components/shared/PageTransition";
import "./App.css";

// Create QueryClient outside component to avoid re-creation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

console.log('React:', React);
console.log('QueryClient:', queryClient);

function App() {
  console.log('App component rendering...');
  console.log('React version check:', React?.version);
  
  // Test if React is working at all
  const [testState, setTestState] = React.useState('React is working!');
  
  React.useEffect(() => {
    console.log('useEffect is working!');
    setTestState('React hooks are working!');
  }, []);

  // Try without QueryClient first to isolate the issue
  try {
    return (
      <div style={{ padding: '20px' }}>
        <h1>App Loading Test</h1>
        <p>{testState}</p>
        <p>If you can see this, React is working!</p>
      </div>
    );
  } catch (error) {
    console.error('App render error:', error);
    return <div>Error loading app: {String(error)}</div>;
  }
}

export default App;