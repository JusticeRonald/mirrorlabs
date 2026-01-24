import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { createProject } from '@/lib/supabase/services/projects';
import { getWorkspaces, type WorkspaceWithCounts } from '@/lib/supabase/services/workspaces';
import type { IndustryType, WorkspaceType } from '@/lib/supabase/database.types';
import { useToast } from '@/hooks/use-toast';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultOrgId?: string;
}

const industries: { value: IndustryType; label: string }[] = [
  { value: 'construction', label: 'Construction' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'cultural', label: 'Cultural Heritage' },
];

export const CreateProjectModal = ({
  open,
  onOpenChange,
  onSuccess,
  defaultOrgId,
}: CreateProjectModalProps) => {
  const { user, isStaff, permissions } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState<IndustryType>('construction');
  const [workspaceId, setWorkspaceId] = useState(defaultOrgId || '');
  const [workspaces, setWorkspaces] = useState<WorkspaceWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  // Fetch business workspaces for staff users
  useEffect(() => {
    if (isStaff && open) {
      setIsLoadingWorkspaces(true);
      getWorkspaces('business' as WorkspaceType).then((ws) => {
        setWorkspaces(ws.filter(w => w.slug !== 'demo'));
        setIsLoadingWorkspaces(false);
        // Set default workspace if provided
        if (defaultOrgId) {
          setWorkspaceId(defaultOrgId);
        } else if (ws.length > 0) {
          // Only set first workspace as default on initial load
          setWorkspaceId((current) => current || ws[0].id);
        }
      });
    }
  }, [isStaff, open, defaultOrgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Permission validation (Admin-Centric Model)
    if (!isStaff && !permissions.canCreateProjects) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to create projects.',
        variant: 'destructive',
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a project name.',
        variant: 'destructive',
      });
      return;
    }

    if (isStaff && !workspaceId) {
      toast({
        title: 'Error',
        description: 'Please select a client workspace for this project.',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a project.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const { data, error } = await createProject({
      name: name.trim(),
      description: description.trim() || null,
      industry,
      workspace_id: isStaff ? workspaceId : null,
      created_by: user.id,
    });

    if (error) {
      toast({
        title: 'Error creating project',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Project created',
        description: `${name} has been created successfully.`,
      });
      // Reset form
      setName('');
      setDescription('');
      setIndustry('construction');
      if (!defaultOrgId) {
        setWorkspaceId('');
      }
      onOpenChange(false);
      onSuccess?.();
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project to organize scans and collaborate with your team.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Workspace Select (Staff Only) */}
            {isStaff && (
              <div className="grid gap-2">
                <Label htmlFor="workspace">Workspace</Label>
                <Select
                  value={workspaceId}
                  onValueChange={setWorkspaceId}
                  disabled={isLoadingWorkspaces || !!defaultOrgId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingWorkspaces ? 'Loading...' : 'Select a workspace'} />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the client workspace for this project.
                </p>
              </div>
            )}

            {/* Project Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="Downtown Office Renovation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Industry */}
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={industry} onValueChange={(v) => setIndustry(v as IndustryType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectModal;
