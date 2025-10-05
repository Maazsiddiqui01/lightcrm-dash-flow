import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Hero } from "@/components/layout/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Target, MessageSquare, TrendingUp, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";

interface Stats {
  totalContacts: number;
  totalOpportunities: number;
  totalInteractions: number;
  recentContacts: number;
}

interface DashboardFilters {
  dateRange: string; // 'all' | year | quarter
}

export function Dashboard() {
  const navigate = useNavigate();
  const { filters, updateFilters } = useUrlFilters({ dateRange: 'all' });
  
  // Get the date range filter value, defaulting to 'all'
  const dateRange = (filters.dateRange as string) || 'all';

  // Fetch date options from opportunities data
  const { data: dateOptions = [] } = useQuery({
    queryKey: ['dashboard-date-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities_raw')
        .select('date_of_origination')
        .not('date_of_origination', 'is', null);
      if (error) throw error;
      
      const years = new Set<string>();
      const quarters = new Set<string>();
      
      data?.forEach(row => {
        const dateStr = row.date_of_origination;
        if (!dateStr) return;
        
        // Extract year
        const yearMatch = dateStr.match(/(\d{4})/);
        if (yearMatch) {
          years.add(yearMatch[1]);
        }
        
        // Extract quarter if present
        const quarterMatch = dateStr.match(/(\d{4}\s*Q[1-4])/);
        if (quarterMatch) {
          quarters.add(quarterMatch[1]);
        }
      });
      
      const options = [{ label: 'All', value: 'all' }];
      
      // Add years (descending)
      Array.from(years).sort((a, b) => parseInt(b) - parseInt(a)).forEach(year => {
        options.push({ label: year, value: year });
      });
      
      // Add quarters (descending)
      Array.from(quarters).sort((a, b) => {
        const [yearA, qA] = a.split(' Q');
        const [yearB, qB] = b.split(' Q');
        if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
        return parseInt(qB) - parseInt(qA);
      }).forEach(quarter => {
        options.push({ label: quarter, value: quarter });
      });
      
      return options;
    },
    staleTime: 300_000,
  });

  // Fetch dashboard stats with date filtering
  const { data: stats = {
    totalContacts: 0,
    totalOpportunities: 0,
    totalInteractions: 0,
    recentContacts: 0
  }, isLoading: loading } = useQuery({
    queryKey: ['dashboard-stats', dateRange],
    queryFn: async () => {
      // Fetch contacts count (not filtered by date)
      const { count: contactsCount } = await supabase
        .from('contacts_raw')
        .select('*', { count: 'exact', head: true });

      // Fetch opportunities count with date filter
      let oppsQuery = supabase.from('opportunities_raw').select('*', { count: 'exact', head: true });
      if (dateRange !== 'all') {
        if (dateRange.includes('Q')) {
          oppsQuery = oppsQuery.ilike('date_of_origination', `%${dateRange}%`);
        } else {
          oppsQuery = oppsQuery.ilike('date_of_origination', `%${dateRange}%`);
        }
      }
      const { count: opportunitiesCount } = await oppsQuery;

      // Fetch interactions count (not filtered by date)
      const { count: interactionsCount } = await supabase
        .from('interactions_app')
        .select('*', { count: 'exact', head: true });

      // Fetch recent contacts (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: recentContactsCount } = await supabase
        .from('contacts_raw')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      return {
        totalContacts: contactsCount || 0,
        totalOpportunities: opportunitiesCount || 0,
        totalInteractions: interactionsCount || 0,
        recentContacts: recentContactsCount || 0
      };
    },
    staleTime: 60_000,
  });

  const handleGetStarted = () => {
    navigate('/contacts');
  };

  const handleAskAI = () => {
    navigate('/ask-ai');
  };

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Hero Section */}
      <Hero onGetStarted={handleGetStarted} onAskAI={handleAskAI} />
      
      {/* Stats Section */}
      <ResponsiveContainer className="py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard Overview</h2>
              <p className="text-muted-foreground">Track your CRM performance at a glance</p>
            </div>
            
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Date Range:</label>
              <Select
                value={dateRange}
                onValueChange={(value) => updateFilters({ ...filters, dateRange: value })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-auto">
                  {dateOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          {/* AI Insights Widget */}
          <AIInsightsWidget />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                
                <button 
                  onClick={() => navigate('/meetings-with-team')}
                  className="p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <Calendar className="h-6 w-6 text-info mb-2" />
                  <h3 className="font-medium text-foreground">Meetings with Team</h3>
                  <p className="text-sm text-muted-foreground">Track 1:1 meeting time</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ResponsiveContainer>
    </div>
  );
}