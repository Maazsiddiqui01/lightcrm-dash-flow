import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Hero } from "@/components/layout/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Target, MessageSquare, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Stats {
  totalContacts: number;
  totalOpportunities: number;
  totalInteractions: number;
  recentContacts: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    totalOpportunities: 0,
    totalInteractions: 0,
    recentContacts: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch contacts count
      const { count: contactsCount } = await supabase
        .from('contacts_app')
        .select('*', { count: 'exact', head: true });

      // Fetch opportunities count  
      const { count: opportunitiesCount } = await supabase
        .from('opportunities_raw')
        .select('*', { count: 'exact', head: true });

      // Fetch interactions count
      const { count: interactionsCount } = await supabase
        .from('interactions_app')
        .select('*', { count: 'exact', head: true });

      // Fetch recent contacts (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: recentContactsCount } = await supabase
        .from('contacts_app')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      setStats({
        totalContacts: contactsCount || 0,
        totalOpportunities: opportunitiesCount || 0,
        totalInteractions: interactionsCount || 0,
        recentContacts: recentContactsCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStarted = () => {
    navigate('/contacts');
  };

  const handleAskAI = () => {
    navigate('/ask-ai');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <Hero onGetStarted={handleGetStarted} onAskAI={handleAskAI} />
      
      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard Overview</h2>
            <p className="text-muted-foreground">Track your CRM performance at a glance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Contacts */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Contacts
                </CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? "..." : stats.totalContacts}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.recentContacts} added this month
                </p>
              </CardContent>
            </Card>

            {/* Total Opportunities */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Opportunities
                </CardTitle>
                <Target className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? "..." : stats.totalOpportunities}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active deals in pipeline
                </p>
              </CardContent>
            </Card>

            {/* Total Interactions */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Interactions
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? "..." : stats.totalInteractions}
                </div>
                <p className="text-xs text-muted-foreground">
                  Communication touchpoints
                </p>
              </CardContent>
            </Card>

            {/* Activity Score */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Activity Score
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? "..." : Math.min(100, Math.round((stats.recentContacts + stats.totalInteractions) / 10))}%
                </div>
                <Badge variant="secondary" className="text-xs">
                  {stats.recentContacts > 5 ? "Active" : "Moderate"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                  onClick={() => navigate('/contacts')}
                  className="p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <Users className="h-6 w-6 text-primary mb-2" />
                  <h3 className="font-medium text-foreground">Manage Contacts</h3>
                  <p className="text-sm text-muted-foreground">View and manage your contact database</p>
                </button>
                
                <button 
                  onClick={() => navigate('/opportunities')}
                  className="p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <Target className="h-6 w-6 text-success mb-2" />
                  <h3 className="font-medium text-foreground">Track Opportunities</h3>
                  <p className="text-sm text-muted-foreground">Monitor your sales pipeline</p>
                </button>
                
                <button 
                  onClick={() => navigate('/interactions')}
                  className="p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <MessageSquare className="h-6 w-6 text-warning mb-2" />
                  <h3 className="font-medium text-foreground">View Interactions</h3>
                  <p className="text-sm text-muted-foreground">Review communication history</p>
                </button>
                
                <button 
                  onClick={() => navigate('/ask-ai')}
                  className="p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <TrendingUp className="h-6 w-6 text-destructive mb-2" />
                  <h3 className="font-medium text-foreground">AI Insights</h3>
                  <p className="text-sm text-muted-foreground">Get data-driven insights</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}