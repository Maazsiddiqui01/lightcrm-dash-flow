import { Button } from "@/components/ui/button";
import { Plus, Bot, Zap, Users, Target, BarChart3 } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
  onAskAI: () => void;
}

export function Hero({ onGetStarted, onAskAI }: HeroProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-background via-primary-light/30 to-primary-light/50">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl" />
      
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="text-center space-y-8">
            {/* Main headline */}
            <div className="space-y-4 animate-fade-in-up">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                Your AI-Powered
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80">
                  Custom CRM
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Streamline your business relationships with intelligent automation, 
                AI-powered insights, and a fully customizable backend that grows with your needs.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up [animation-delay:200ms]">
              <Button 
                size="lg" 
                onClick={onGetStarted}
                className="px-8 py-3 text-lg font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary-hover hover:to-primary-hover/90 shadow-primary transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <Plus className="h-5 w-5 mr-2" />
                Get Started
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={onAskAI}
                className="px-8 py-3 text-lg font-medium border-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 hover:scale-105"
              >
                <Bot className="h-5 w-5 mr-2" />
                Ask AI
              </Button>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto mt-16 animate-fade-in-up [animation-delay:400ms]">
              <div className="group p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Smart Automation</h3>
                <p className="text-muted-foreground">Automate repetitive tasks and focus on what matters most - building relationships.</p>
              </div>

              <div className="group p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success to-success/80 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-6 w-6 text-success-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">AI Insights</h3>
                <p className="text-muted-foreground">Get intelligent analytics and recommendations powered by advanced AI.</p>
              </div>

              <div className="group p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6 text-warning-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Fully Customizable</h3>
                <p className="text-muted-foreground">Tailor your CRM to match your unique business processes and workflows.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}