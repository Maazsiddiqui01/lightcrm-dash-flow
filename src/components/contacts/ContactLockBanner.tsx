import { Lock, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useContactLock } from '@/hooks/useContactLock';
import { useUserRole } from '@/hooks/useUserRole';
import { useEffect, useState } from 'react';

interface ContactLockBannerProps {
  contactId: string;
}

export function ContactLockBanner({ contactId }: ContactLockBannerProps) {
  const { lockStatus, unlockContact, isUnlocking } = useContactLock(contactId);
  const { isAdmin } = useUserRole();
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!lockStatus?.locked || !lockStatus.locked_until) return;

    const updateTimer = () => {
      const now = new Date();
      const until = new Date(lockStatus.locked_until!);
      const diff = until.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockStatus]);

  if (!lockStatus?.locked) return null;

  return (
    <Alert className="mb-4">
      <Lock className="h-4 w-4" />
      <AlertTitle>Contact In Use</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>{lockStatus.lock_reason || 'This contact is currently locked'}</span>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeRemaining}
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => unlockContact(contactId)}
            disabled={isUnlocking}
          >
            Force Unlock
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
