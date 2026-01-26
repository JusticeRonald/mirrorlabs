import { Ruler, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AREA_UNIT_DISPLAY, UNIT_DISPLAY, type MeasurementUnit } from '@/lib/viewer/MeasurementCalculator';
import type { Measurement } from '@/types/viewer';
import type { RolePermissions } from '@/types/user';

interface MeasurementsTabProps {
  measurements: Measurement[];
  permissions: RolePermissions;
  selectedMeasurementId?: string | null;
  onSelectMeasurement?: (id: string) => void;
  onDeleteMeasurement?: (id: string) => void;
  readOnly?: boolean;
}

/**
 * MeasurementsTab - Content for the Measurements tab in CollaborationPanel
 *
 * Displays a list of measurements with:
 * - Type-specific icons (Ruler for distance, Square for area)
 * - Formatted values with units
 * - Delete functionality
 * - Selection state
 */
export function MeasurementsTab({
  measurements,
  permissions,
  selectedMeasurementId,
  onSelectMeasurement,
  onDeleteMeasurement,
  readOnly = false,
}: MeasurementsTabProps) {
  const formatMeasurementValue = (measurement: Measurement) => {
    const unit = measurement.unit as MeasurementUnit;
    const unitDisplay = measurement.type === 'area'
      ? AREA_UNIT_DISPLAY[unit]
      : UNIT_DISPLAY[unit];
    return `${measurement.value.toFixed(2)} ${unitDisplay}`;
  };

  const getMeasurementLabel = (measurement: Measurement, index: number) => {
    if (measurement.label) return measurement.label;
    const typeLabel = measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1);
    return `${typeLabel} ${index + 1}`;
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-2">
        {measurements.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            <Ruler className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No measurements yet</p>
            <p className="text-xs mt-1">Press D to start measuring</p>
          </div>
        ) : (
          measurements.map((m, index) => {
            const MeasurementIcon = m.type === 'distance' ? Ruler : Square;
            const iconColor = m.type === 'distance' ? 'text-blue-500' : 'text-purple-500';
            const bgColor = m.type === 'distance' ? 'bg-blue-500/10' : 'bg-purple-500/10';
            const isSelected = selectedMeasurementId === m.id;

            return (
              <div
                key={m.id}
                className={cn(
                  'group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                  bgColor,
                  isSelected
                    ? 'ring-2 ring-amber-500/50 bg-neutral-800'
                    : 'hover:bg-neutral-800/70'
                )}
                onClick={() => onSelectMeasurement?.(m.id)}
              >
                <div className={cn('flex-shrink-0 p-2 rounded-lg bg-neutral-800/50', iconColor)}>
                  <MeasurementIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-200 truncate">
                    {getMeasurementLabel(m, index)}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {formatMeasurementValue(m)}
                  </p>
                </div>
                {permissions.canMeasure && onDeleteMeasurement && !readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMeasurement(m.id);
                    }}
                    title="Delete measurement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}

export default MeasurementsTab;
