export type ProjectListViewMode = 'grid' | 'list' | 'compact';

export type PreferencePageKey =
  | 'projects'
  | 'admin-projects'
  | 'admin-workspaces'
  | 'workspaces'
  | 'demo';

export const DEFAULT_VIEW_MODES: Record<PreferencePageKey, ProjectListViewMode> = {
  'projects': 'compact',
  'admin-projects': 'compact',
  'admin-workspaces': 'compact',
  'workspaces': 'compact',
  'demo': 'compact',
};
