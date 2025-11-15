import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { UpcomingNextStep } from '@/hooks/useUpcomingNextSteps';
import { cn } from '@/lib/utils';

interface NextStepItemProps {
  step: UpcomingNextStep;
  onComplete: (step: UpcomingNextStep) => void;
  onEntityClick: (step: UpcomingNextStep) => void;
  isCompleting?: boolean;
}

export function NextStepItem({ step, onComplete, onEntityClick, isCompleting }: NextStepItemProps) {
  const getDueDateColor = (daysUntil: number, isOverdue: boolean) => {
    if (isOverdue) return 'text-destructive';
    if (daysUntil === 0) return 'text-orange-600 dark:text-orange-400';
    if (daysUntil <= 2) return 'text-orange-600 dark:text-orange-400';
    if (daysUntil <= 7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  };

  const getDueDateText = (daysUntil: number, isOverdue: boolean, dueDate: string) => {
    if (isOverdue) return `Overdue by ${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? 'day' : 'days'}`;
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    if (daysUntil <= 7) return `Due in ${daysUntil} days`;
    return format(new Date(dueDate), 'MMM d, yyyy');
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <Checkbox
        checked={false}
        onCheckedChange={() => onComplete(step)}
        disabled={isCompleting}
        className="mt-1"
      />
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="link"
            className="p-0 h-auto font-medium text-foreground hover:text-primary"
            onClick={() => onEntityClick(step)}
          >
            {step.entity_name}
          </Button>
          <Badge variant={step.entity_type === 'contact' ? 'secondary' : 'default'} className="text-xs">
            {step.entity_type === 'contact' ? 'Contact' : 'Opportunity'}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {truncateText(step.next_steps, 100)}
        </p>
        
        <p className={cn('text-xs font-medium', getDueDateColor(step.days_until_due, step.is_overdue))}>
          {getDueDateText(step.days_until_due, step.is_overdue, step.due_date)}
        </p>
      </div>
    </div>
  );
}
