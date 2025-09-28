import { Button } from '@/components/ui/button';
import { Loader2, Mail } from 'lucide-react';
import { useEmailBuilderDraft, EmailBuilderPayload } from '@/hooks/useEmailBuilderDraft';

interface GenerateDraftButtonProps {
  payload: EmailBuilderPayload | null;
  disabled?: boolean;
}

export function GenerateDraftButton({ payload, disabled }: GenerateDraftButtonProps) {
  const draftMutation = useEmailBuilderDraft();

  const handleGenerateDraft = () => {
    if (!payload) return;
    
    draftMutation.mutate(payload);
  };

  const isDisabled = disabled || !payload || draftMutation.isPending;

  return (
    <Button
      onClick={handleGenerateDraft}
      disabled={isDisabled}
      className="w-full"
      size="lg"
    >
      {draftMutation.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Draft...
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Generate Draft
        </>
      )}
    </Button>
  );
}