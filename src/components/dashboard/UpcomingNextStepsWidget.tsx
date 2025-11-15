import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useUpcomingNextSteps } from '@/hooks/useUpcomingNextSteps';
import { NextStepItem } from './NextStepItem';
import { AllNextStepsDialog } from './AllNextStepsDialog';

export function UpcomingNextStepsWidget() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'overdue' | 'week' | 'month'>('all');
  const [entityFilter, setEntityFilter] = useState<'all' | 'contact' | 'opportunity'>('all');
  const { data: allSteps, isLoading, markAsComplete, isMarkingComplete, deleteNextStep, isDeletingNextStep } = useUpcomingNextSteps();
  
  // Filter steps based on current filters
  const filteredSteps = useMemo(() => {
    return allSteps.filter((step) => {
      // Time filter
      let matchesTime = true;
      if (filterType === 'overdue') {
        matchesTime = step.is_overdue;
      } else if (filterType === 'week') {
        matchesTime = step.days_until_due >= 0 && step.days_until_due <= 7;
      } else if (filterType === 'month') {
        matchesTime = step.days_until_due >= 0 && step.days_until_due <= 30;
      }

      // Entity type filter
      const matchesEntity = entityFilter === 'all' || step.entity_type === entityFilter;

      return matchesTime && matchesEntity;
    });
  }, [allSteps, filterType, entityFilter]);

  // Show only top 5 in widget
  const displaySteps = filteredSteps.slice(0, 5);
  const hasMore = filteredSteps.length > 5;
  
  // Count by type
  const overdueCount = allSteps.filter((s) => s.is_overdue).length;
  const weekCount = allSteps.filter((s) => s.days_until_due >= 0 && s.days_until_due <= 7).length;

  const handleEntityClick = (step: typeof allSteps[0]) => {
    if (step.entity_type === 'contact') {
      navigate(`/contacts?selected=${step.id}`);
    } else {
      navigate(`/opportunities?selected=${step.id}`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Next Steps
            </CardTitle>
            {allSteps.length > 0 && overdueCount > 0 && (
              <span className="text-sm text-destructive font-medium">
                {overdueCount} overdue
              </span>
            )}
          </div>

          {/* Filters */}
          {!isLoading && allSteps.length > 0 && (
            <div className="space-y-3">
              <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-auto">
                  <TabsTrigger value="all" className="text-xs">
                    All ({allSteps.length})
                  </TabsTrigger>
                  <TabsTrigger value="overdue" className="text-xs">
                    Overdue ({overdueCount})
                  </TabsTrigger>
                  <TabsTrigger value="week" className="text-xs">
                    This Week ({weekCount})
                  </TabsTrigger>
                  <TabsTrigger value="month" className="text-xs">
                    This Month
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Tabs value={entityFilter} onValueChange={(v) => setEntityFilter(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-auto">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs">Contacts</TabsTrigger>
                  <TabsTrigger value="opportunity" className="text-xs">Opportunities</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-2">
          {displaySteps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {isLoading ? 'Loading...' : allSteps.length === 0 ? 'No upcoming next steps' : 'No next steps match your filters'}
              </p>
              {allSteps.length === 0 && (
                <p className="text-xs mt-1">Add next steps to contacts and opportunities to track them here</p>
              )}
            </div>
          ) : (
            <>
              {displaySteps.map((step) => (
                <NextStepItem
                  key={`${step.entity_type}-${step.id}`}
                  step={step}
                  onComplete={markAsComplete}
                  onDelete={deleteNextStep}
                  onEntityClick={handleEntityClick}
                  isCompleting={isMarkingComplete}
                  isDeleting={isDeletingNextStep}
                />
              ))}

              {hasMore && (
                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => setIsDialogOpen(true)}
                >
                  View All {filteredSteps.length} Filtered Next Steps
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AllNextStepsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        steps={allSteps}
        onComplete={markAsComplete}
        onDelete={deleteNextStep}
        onEntityClick={handleEntityClick}
        isCompleting={isMarkingComplete}
        isDeleting={isDeletingNextStep}
      />
    </>
  );
}
