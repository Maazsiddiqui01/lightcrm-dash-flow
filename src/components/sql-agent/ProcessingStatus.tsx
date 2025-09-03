import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

interface ProcessingStatusProps {
  isLoading: boolean;
  isProcessing: boolean;
  getElapsedTime: () => number;
  onCancel: () => void;
}

export function ProcessingStatus({ 
  isLoading, 
  isProcessing, 
  getElapsedTime, 
  onCancel 
}: ProcessingStatusProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isLoading && !isProcessing) return;

    const interval = setInterval(() => {
      setElapsedTime(getElapsedTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, isProcessing, getElapsedTime]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusMessage = () => {
    if (elapsedTime < 3) return "Processing your query...";
    if (elapsedTime < 20) return "Still processing...";
    return "This is taking longer than usual, but we're still working on it...";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {isProcessing ? "Processing Query" : "Running Query"}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {getStatusMessage()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 font-mono">
              {formatTime(elapsedTime)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-gray-600 hover:text-red-600"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              {isProcessing ? "Analyzing data..." : "Sending query..."}
            </span>
            <span className="text-xs">
              {elapsedTime > 20 && "This can take up to 2 minutes"}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
              style={{ 
                width: isProcessing 
                  ? `${Math.min(90, (elapsedTime / 120) * 100)}%`
                  : `${Math.min(50, (elapsedTime / 60) * 100)}%`
              }}
            />
          </div>
        </div>

        {/* Skeleton table preview */}
        <div className="space-y-3">
          <div className="flex space-x-4 pb-2 border-b border-gray-200">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex space-x-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-36" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}