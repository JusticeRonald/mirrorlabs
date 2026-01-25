import { Grid3X3, List, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectListViewMode } from '@/types/preferences';

interface ViewModeToggleProps {
  value: ProjectListViewMode;
  onChange: (mode: ProjectListViewMode) => void;
  modes?: ProjectListViewMode[];
}

const modeIcons: Record<ProjectListViewMode, React.ReactNode> = {
  grid: <Grid3X3 className="w-4 h-4" />,
  list: <List className="w-4 h-4" />,
  compact: <LayoutList className="w-4 h-4" />,
};

const modeLabels: Record<ProjectListViewMode, string> = {
  grid: 'Grid view',
  list: 'List view',
  compact: 'Compact view',
};

export function ViewModeToggle({
  value,
  onChange,
  modes = ['grid', 'list', 'compact'],
}: ViewModeToggleProps) {
  return (
    <div className="flex border border-border rounded-lg">
      {modes.map((mode, index) => {
        const isFirst = index === 0;
        const isLast = index === modes.length - 1;
        const isActive = value === mode;

        return (
          <Button
            key={mode}
            variant={isActive ? 'secondary' : 'ghost'}
            size="icon"
            className={`h-8 w-8 ${
              isFirst ? 'rounded-r-none' : isLast ? 'rounded-l-none' : 'rounded-none'
            }`}
            onClick={() => onChange(mode)}
            title={modeLabels[mode]}
            aria-label={modeLabels[mode]}
          >
            {modeIcons[mode]}
          </Button>
        );
      })}
    </div>
  );
}

export default ViewModeToggle;
