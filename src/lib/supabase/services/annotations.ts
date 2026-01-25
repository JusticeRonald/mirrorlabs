import { supabase, isSupabaseConfigured } from '../client';
import type {
  Annotation,
  AnnotationWithReplies,
  AnnotationReply,
  Measurement,
  CameraWaypoint,
  Comment,
  InsertTables,
  UpdateTables,
} from '../database.types';

// =============================================================================
// ANNOTATIONS
// =============================================================================

/**
 * Get all annotations for a scan
 */
export async function getScanAnnotations(scanId: string): Promise<AnnotationWithReplies[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('annotations')
    .select(`
      *,
      replies:annotation_replies(*),
      creator:profiles!created_by(*)
    `)
    .eq('scan_id', scanId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching annotations:', error);
    return [];
  }

  return (data || []) as AnnotationWithReplies[];
}

/**
 * Create an annotation
 */
export async function createAnnotation(
  annotation: InsertTables<'annotations'>
): Promise<{ data: Annotation | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('annotations')
    .insert(annotation)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Update an annotation
 */
export async function updateAnnotation(
  annotationId: string,
  updates: UpdateTables<'annotations'>
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('annotations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', annotationId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Delete an annotation
 */
export async function deleteAnnotation(annotationId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('annotations')
    .delete()
    .eq('id', annotationId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Add a reply to an annotation
 */
export async function addAnnotationReply(
  reply: InsertTables<'annotation_replies'>
): Promise<{ data: AnnotationReply | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('annotation_replies')
    .insert(reply)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

// =============================================================================
// MEASUREMENTS
// =============================================================================

/**
 * Get all measurements for a scan
 */
export async function getScanMeasurements(scanId: string): Promise<Measurement[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('scan_id', scanId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching measurements:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a measurement
 */
export async function createMeasurement(
  measurement: InsertTables<'measurements'>
): Promise<{ data: Measurement | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('measurements')
    .insert(measurement)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Delete a measurement
 */
export async function deleteMeasurement(measurementId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('measurements')
    .delete()
    .eq('id', measurementId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

// =============================================================================
// CAMERA WAYPOINTS (SAVED VIEWS)
// =============================================================================

/**
 * Get all saved views for a scan
 */
export async function getScanWaypoints(scanId: string): Promise<CameraWaypoint[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('camera_waypoints')
    .select('*')
    .eq('scan_id', scanId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching waypoints:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a saved view
 */
export async function createWaypoint(
  waypoint: InsertTables<'camera_waypoints'>
): Promise<{ data: CameraWaypoint | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('camera_waypoints')
    .insert(waypoint)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Update a saved view
 */
export async function updateWaypoint(
  waypointId: string,
  updates: UpdateTables<'camera_waypoints'>
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('camera_waypoints')
    .update(updates)
    .eq('id', waypointId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Delete a saved view
 */
export async function deleteWaypoint(waypointId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('camera_waypoints')
    .delete()
    .eq('id', waypointId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Reorder saved views
 */
export async function reorderWaypoints(
  waypointIds: string[]
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  // Update each waypoint's sort_order
  const updates = waypointIds.map((id, index) => ({
    id,
    sort_order: index,
  }));

  // Collect errors but continue processing all updates
  const errors: string[] = [];

  for (const update of updates) {
    const { error } = await supabase
      .from('camera_waypoints')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id);

    if (error) {
      errors.push(`Waypoint ${update.id}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    return { error: new Error(`Failed to reorder some waypoints: ${errors.join('; ')}`) };
  }

  return { error: null };
}

// =============================================================================
// COMMENTS
// =============================================================================

/**
 * Get all comments for a scan
 */
export async function getScanComments(scanId: string): Promise<Comment[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('scan_id', scanId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a comment
 */
export async function createComment(
  comment: InsertTables<'comments'>
): Promise<{ data: Comment | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('comments')
    .insert(comment)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  content: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}
