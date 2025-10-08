import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ModeSwitcherProps {
  mode: 'individual' | 'group';
  onModeChange: (mode: 'individual' | 'group') => void;
}

export function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  return (
    <Tabs value={mode} onValueChange={(value) => onModeChange(value as 'individual' | 'group')}>
      <TabsList>
        <TabsTrigger value="individual">Individual</TabsTrigger>
        <TabsTrigger value="group">Group</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
