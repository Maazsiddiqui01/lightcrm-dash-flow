import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useContactDuplicateCheck } from '@/hooks/useContactDuplicates';
import { useNavigate } from 'react-router-dom';

interface DuplicateWarningBannerProps {
  email: string;
}

export function DuplicateWarningBanner({ email }: DuplicateWarningBannerProps) {
  const { data: duplicate } = useContactDuplicateCheck(email);
  const navigate = useNavigate();

  if (!duplicate) return null;

  const otherUsers = duplicate.contacts
    .map((c) => c.user_name)
    .filter((name, index, self) => self.indexOf(name) === index)
    .join(', ');

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Duplicate Contact Detected</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          This contact is also owned by: <strong>{otherUsers}</strong>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/duplicates')}
        >
          View Details
        </Button>
      </AlertDescription>
    </Alert>
  );
}
