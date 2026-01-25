import { useState } from 'react';
import { ChevronLeft, ChevronRight, Ruler, MessageSquare, Layers, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Measurement, Annotation } from '@/types/viewer';
import { RolePermissions } from '@/types/user';

interface ViewerSidebarProps {
  measurements: Measurement[];
  annotations: Annotation[];
  permissions: RolePermissions;
  onDeleteMeasurement?: (id: string) => void;
  onDeleteAnnotation?: (id: string) => void;
  onSelectMeasurement?: (id: string) => void;
  onSelectAnnotation?: (id: string) => void;
  defaultCollapsed?: boolean;
  readOnly?: boolean;
}

interface SidebarSectionProps {
  title: string;
  icon: React.ElementType;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const SidebarSection = ({ title, icon: Icon, count, children, defaultOpen = true }: SidebarSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-b border-border">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {count}
          </span>
        </div>
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const ViewerSidebar = ({
  measurements,
  annotations,
  permissions,
  onDeleteMeasurement,
  onDeleteAnnotation,
  onSelectMeasurement,
  onSelectAnnotation,
  defaultCollapsed = false,
  readOnly = false,
}: ViewerSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (isCollapsed) {
    return (
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-card/90 backdrop-blur-md border-border shadow-lg"
          onClick={() => setIsCollapsed(false)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute left-4 top-20 bottom-20 z-10 w-72">
      <div className="h-full flex flex-col rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">Properties</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {/* Measurements Section */}
          <SidebarSection
            title="Measurements"
            icon={Ruler}
            count={measurements.length}
            defaultOpen={true}
          >
            {measurements.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No measurements yet
              </p>
            ) : (
              <div className="space-y-2">
                {measurements.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => onSelectMeasurement?.(m.id)}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {m.value.toFixed(2)} {m.unit}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {m.type} measurement
                      </p>
                    </div>
                    {permissions.canMeasure && onDeleteMeasurement && !readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMeasurement(m.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SidebarSection>

          {/* Annotations Section */}
          <SidebarSection
            title="Annotations"
            icon={MessageSquare}
            count={annotations.length}
            defaultOpen={true}
          >
            {annotations.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No annotations yet
              </p>
            ) : (
              <div className="space-y-2">
                {annotations.map((a) => (
                  <div
                    key={a.id}
                    className="group flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => onSelectAnnotation?.(a.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {a.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.replies?.length || 0} replies
                      </p>
                    </div>
                    {permissions.canAnnotate && onDeleteAnnotation && !readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAnnotation(a.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SidebarSection>

          {/* Layers Section */}
          <SidebarSection
            title="Layers"
            icon={Layers}
            count={0}
            defaultOpen={false}
          >
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-border" />
                <span className="text-sm">Model</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-border" />
                <span className="text-sm">Measurements</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-border" />
                <span className="text-sm">Annotations</span>
              </label>
            </div>
          </SidebarSection>

          {/* Properties Section */}
          <SidebarSection
            title="Properties"
            icon={Settings}
            count={0}
            defaultOpen={false}
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Format</span>
                <span>Point Cloud</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Points</span>
                <span>1.2M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size</span>
                <span>24.5 MB</span>
              </div>
            </div>
          </SidebarSection>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ViewerSidebar;
