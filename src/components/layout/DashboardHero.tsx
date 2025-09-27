import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Target, BarChart3, Wrench, FileText, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export function DashboardHero() {
  const quickLinks = [
    {
      title: "Contacts",
      description: "Manage your relationships",
      icon: Users,
      href: "/contacts",
      color: "text-blue-500",
    },
    {
      title: "Opportunities",
      description: "Track your deals",
      icon: Target,
      href: "/opportunities",
      color: "text-green-500",
    },
    {
      title: "Articles",
      description: "Knowledge repository",
      icon: FileText,
      href: "/articles",
      color: "text-purple-500",
    },
    {
      title: "Email Builder",
      description: "Create email templates",
      icon: Mail,
      href: "/email-builder",
      color: "text-indigo-500",
    },
    {
      title: "AI Agent",
      description: "Custom analytics",
      icon: Wrench,
      href: "/make-your-own-view",
      color: "text-orange-500",
    },
  ];

  return (
    <Card className="rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/10">
      <div className="p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Source Greatness Dashboard
          </h1>
          <p className="text-muted-foreground">
            Your central hub for sourcing insights and analytics
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          {quickLinks.map((link) => {
            const IconComponent = link.icon;
            return (
              <Link key={link.href} to={link.href}>
                <Button
                  variant="ghost"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5 transition-colors"
                >
                  <IconComponent className={`h-6 w-6 ${link.color}`} />
                  <div className="text-center">
                    <div className="font-medium text-sm">{link.title}</div>
                    <div className="text-xs text-muted-foreground">{link.description}</div>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </Card>
  );
}