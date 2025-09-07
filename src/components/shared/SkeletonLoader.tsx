import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

interface SkeletonLoaderProps {
  type: 'stats' | 'table' | 'card' | 'text';
  count?: number;
  className?: string;
}

export function SkeletonLoader({ type, count = 1, className }: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'stats':
        return (
          <Card className="p-3 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="ml-3 lg:ml-6">
                <div className="p-2 lg:p-3 bg-muted rounded-lg">
                  <Skeleton className="h-5 w-5 lg:h-6 lg:w-6" />
                </div>
              </div>
            </div>
          </Card>
        );

      case 'table':
        return (
          <div className="space-y-2">
            <div className="flex space-x-4 p-4 border-b">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex space-x-4 p-4">
                {Array.from({ length: 4 }).map((_, cellIndex) => (
                  <Skeleton key={cellIndex} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        );

      case 'card':
        return (
          <Card className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          </Card>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        );

      default:
        return <Skeleton className="h-4 w-full" />;
    }
  };

  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-fade-in">
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
}