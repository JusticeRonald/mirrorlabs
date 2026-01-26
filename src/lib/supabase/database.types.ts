/**
 * Supabase Database Types
 *
 * This file defines TypeScript types for the Mirror Labs PostgreSQL schema.
 * Update this file when the database schema changes.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'owner' | 'editor' | 'viewer';
export type ScanStatus = 'uploading' | 'processing' | 'ready' | 'error';
export type AnnotationType = 'pin' | 'comment' | 'markup';
export type AnnotationStatus = 'open' | 'in_progress' | 'resolved' | 'reopened' | 'archived';
export type MarkupType = 'freehand' | 'circle' | 'rectangle' | 'arrow' | 'cloud' | 'text';
export type MarkupStatus = 'visible' | 'hidden' | 'archived';
export type CommentStatus = 'open' | 'in_progress' | 'resolved' | 'reopened' | 'archived';
export type MeasurementType = 'distance' | 'area' | 'angle';
export type MeasurementUnit = 'ft' | 'm' | 'in' | 'cm';
export type IndustryType = 'construction' | 'real-estate' | 'cultural';
export type AccountType = 'staff' | 'client';
export type WorkspaceType = 'personal' | 'business';
export type ActivityAction =
  | 'project_created'
  | 'project_updated'
  | 'scan_uploaded'
  | 'annotation_created'
  | 'measurement_created'
  | 'comment_added'
  | 'member_invited'
  | 'member_removed';

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          type: WorkspaceType;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          type?: WorkspaceType;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          type?: WorkspaceType;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          initials: string | null;
          account_type: AccountType;
          is_staff: boolean;
          primary_workspace_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          initials?: string | null;
          account_type?: AccountType;
          is_staff?: boolean;
          primary_workspace_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          initials?: string | null;
          account_type?: AccountType;
          is_staff?: boolean;
          primary_workspace_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string | null;
          name: string;
          description: string | null;
          industry: IndustryType;
          thumbnail_url: string | null;
          is_archived: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id?: string | null;
          name: string;
          description?: string | null;
          industry?: IndustryType;
          thumbnail_url?: string | null;
          is_archived?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string | null;
          name?: string;
          description?: string | null;
          industry?: IndustryType;
          thumbnail_url?: string | null;
          is_archived?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
        };
      };
      scans: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          file_url: string;
          file_type: string;
          file_size: number;
          splat_count: number | null;
          thumbnail_url: string | null;
          status: ScanStatus;
          error_message: string | null;
          orientation_json: Json | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          file_url: string;
          file_type: string;
          file_size: number;
          splat_count?: number | null;
          thumbnail_url?: string | null;
          status?: ScanStatus;
          error_message?: string | null;
          orientation_json?: Json | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          file_url?: string;
          file_type?: string;
          file_size?: number;
          splat_count?: number | null;
          thumbnail_url?: string | null;
          status?: ScanStatus;
          error_message?: string | null;
          orientation_json?: Json | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      annotations: {
        Row: {
          id: string;
          scan_id: string;
          type: AnnotationType;
          position_x: number;
          position_y: number;
          position_z: number;
          content: string;
          status: AnnotationStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          scan_id: string;
          type?: AnnotationType;
          position_x: number;
          position_y: number;
          position_z: number;
          content: string;
          status?: AnnotationStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          scan_id?: string;
          type?: AnnotationType;
          position_x?: number;
          position_y?: number;
          position_z?: number;
          content?: string;
          status?: AnnotationStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      annotation_replies: {
        Row: {
          id: string;
          annotation_id: string;
          content: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          annotation_id: string;
          content: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          annotation_id?: string;
          content?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      measurements: {
        Row: {
          id: string;
          scan_id: string;
          type: MeasurementType;
          points_json: Json;
          value: number;
          unit: MeasurementUnit;
          label: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          scan_id: string;
          type?: MeasurementType;
          points_json: Json;
          value: number;
          unit?: MeasurementUnit;
          label?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          scan_id?: string;
          type?: MeasurementType;
          points_json?: Json;
          value?: number;
          unit?: MeasurementUnit;
          label?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      camera_waypoints: {
        Row: {
          id: string;
          scan_id: string;
          name: string;
          position_json: Json;
          target_json: Json;
          fov: number;
          thumbnail_url: string | null;
          sort_order: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          scan_id: string;
          name: string;
          position_json: Json;
          target_json: Json;
          fov?: number;
          thumbnail_url?: string | null;
          sort_order?: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          scan_id?: string;
          name?: string;
          position_json?: Json;
          target_json?: Json;
          fov?: number;
          thumbnail_url?: string | null;
          sort_order?: number;
          created_by?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          scan_id: string;
          annotation_id: string | null;
          parent_id: string | null;
          content: string;
          mentions: string[];
          status: CommentStatus;
          root_comment_id: string | null;
          thread_depth: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          scan_id: string;
          annotation_id?: string | null;
          parent_id?: string | null;
          content: string;
          mentions?: string[];
          status?: CommentStatus;
          root_comment_id?: string | null;
          thread_depth?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          scan_id?: string;
          annotation_id?: string | null;
          parent_id?: string | null;
          content?: string;
          mentions?: string[];
          status?: CommentStatus;
          root_comment_id?: string | null;
          thread_depth?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      markups: {
        Row: {
          id: string;
          scan_id: string;
          type: MarkupType;
          strokes: Json;
          camera_snapshot: Json;
          style: Json;
          label: string | null;
          status: MarkupStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          scan_id: string;
          type?: MarkupType;
          strokes: Json;
          camera_snapshot: Json;
          style?: Json;
          label?: string | null;
          status?: MarkupStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          scan_id?: string;
          type?: MarkupType;
          strokes?: Json;
          camera_snapshot?: Json;
          style?: Json;
          label?: string | null;
          status?: MarkupStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          project_id: string;
          action: ActivityAction;
          entity_type: string;
          entity_id: string;
          metadata: Json | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          action: ActivityAction;
          entity_type: string;
          entity_id: string;
          metadata?: Json | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          action?: ActivityAction;
          entity_type?: string;
          entity_id?: string;
          metadata?: Json | null;
          created_by?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      scan_status: ScanStatus;
      annotation_type: AnnotationType;
      annotation_status: AnnotationStatus;
      measurement_type: MeasurementType;
      measurement_unit: MeasurementUnit;
      industry_type: IndustryType;
      activity_action: ActivityAction;
      account_type: AccountType;
      workspace_type: WorkspaceType;
      markup_type: MarkupType;
      markup_status: MarkupStatus;
      comment_status: CommentStatus;
    };
  };
}

// Helper types for easier access
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Convenience type aliases
export type Profile = Tables<'profiles'>;
export type Workspace = Tables<'workspaces'>;
export type WorkspaceMember = Tables<'workspace_members'>;
export type Project = Tables<'projects'>;

// Legacy alias for backward compatibility
export type Organization = Workspace;
export type ProjectMember = Tables<'project_members'>;
export type Scan = Tables<'scans'>;
export type Annotation = Tables<'annotations'>;
export type AnnotationReply = Tables<'annotation_replies'>;
export type Measurement = Tables<'measurements'>;
export type CameraWaypoint = Tables<'camera_waypoints'>;
export type Comment = Tables<'comments'>;
export type Markup = Tables<'markups'>;
export type ActivityLog = Tables<'activity_log'>;

// Extended types with relations
export interface ProjectWithMembers extends Project {
  members: (ProjectMember & { profile: Profile })[];
  scans: Scan[];
}

export interface ScanWithAnnotations extends Scan {
  annotations: Annotation[];
  measurements: Measurement[];
  waypoints: CameraWaypoint[];
}

export interface AnnotationWithReplies extends Annotation {
  replies: AnnotationReply[];
  creator: Profile;
}
