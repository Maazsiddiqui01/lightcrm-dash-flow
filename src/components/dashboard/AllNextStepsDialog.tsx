import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NextStepItem } from './NextStepItem';
import { UpcomingNextStep } from '@/hooks/useUpcomingNextSteps';
import { Search } from 'lucide-react';

interface AllNextStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: UpcomingNextStep[];
  onComplete: (step: UpcomingNextStep) => void;
  onDelete: (step: UpcomingNextStep) => void;
  onEntityClick: (step: UpcomingNextStep) => void;
  isCompleting?: boolean;
  isDeleting?: boolean;
}

export function AllNextStepsDialog({
  open,
  onOpenChange,
  steps,
  onComplete,
  onDelete,
  onEntityClick,
  isCompleting,
  isDeleting,
}: AllNextStepsDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'overdue' | 'week' | 'month'>('all');
  const [entityFilter, setEntityFilter] = useState<'all' | 'contact' | 'opportunity'>('all');

  // Filter steps
  const filteredSteps = steps.filter((step) => {
    // Search filter
    const matchesSearch =
      step.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      step.next_steps.toLowerCase().includes(searchTerm.toLowerCase());

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

    return matchesSearch && matchesTime && matchesEntity;
  });

  // Count by type
  const overdueCount = steps.filter((s) => s.is_overdue).length;
  const weekCount = steps.filter((s) => s.days_until_due >= 0 && s.days_until_due <= 7).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>All Next Steps</DialogTitle>
          <DialogDescription>
            View and manage all upcoming next steps across contacts and opportunities
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by entity name or next step content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="flex-1">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({steps.length})</TabsTrigger>
                <TabsTrigger value="overdue">Overdue ({overdueCount})</TabsTrigger>
                <TabsTrigger value="week">This Week ({weekCount})</TabsTrigger>
                <TabsTrigger value="month">This Month</TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={entityFilter} onValueChange={(v) => setEntityFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="contact">Contacts</TabsTrigger>
                <TabsTrigger value="opportunity">Opportunities</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredSteps.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No next steps found matching your filters
              </div>
            ) : (
              filteredSteps.map((step) => (
                <NextStepItem
                  key={`${step.entity_type}-${step.id}`}
                  step={step}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onEntityClick={onEntityClick}
                  isCompleting={isCompleting}
                  isDeleting={isDeleting}
                />
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
