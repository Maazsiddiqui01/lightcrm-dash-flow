import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useUpcomingNextSteps } from '@/hooks/useUpcomingNextSteps';
import { NextStepItem } from './NextStepItem';
import { AllNextStepsDialog } from './AllNextStepsDialog';

export function UpcomingNextStepsWidget() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: allSteps, isLoading, markAsComplete, isMarkingComplete, deleteNextStep, isDeletingNextStep } = useUpcomingNextSteps();
  
  // Show only top 5 in widget
  const displaySteps = allSteps.slice(0, 5);
  const hasMore = allSteps.length > 5;

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

  if (displaySteps.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No upcoming next steps</p>
            <p className="text-xs mt-1">Add next steps to contacts and opportunities to track them here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Next Steps
            </CardTitle>
            {allSteps.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {allSteps.filter(s => s.is_overdue).length > 0 && (
                  <span className="text-destructive font-medium">
                    {allSteps.filter(s => s.is_overdue).length} overdue
                  </span>
                )}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
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
              View All {allSteps.length} Next Steps
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
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
