import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessFeedbackProps {
  show: boolean;
  message: string;
  duration?: number;
  onComplete?: () => void;
}

export function SuccessFeedback({ 
  show, 
  message, 
  duration = 2000,
  onComplete 
}: SuccessFeedbackProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="flex items-center gap-3 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg">
        <Check className="h-5 w-5 animate-scale-in" />
        <p className="font-medium">{message}</p>
      </div>
    </div>
  );
}
