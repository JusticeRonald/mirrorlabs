import { supabase, isSupabaseConfigured } from '../client';
import type { Markup, InsertTables, UpdateTables } from '../database.types';

// =============================================================================
// MARKUPS
// =============================================================================

/**
 * Get all markups for a scan
 */
export async function getScanMarkups(scanId: string): Promise<Markup[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('markups')
    .select('*')
    .eq('scan_id', scanId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });

  if (error) {
    return [];
  }

  return data || [];
}

/**
 * Get a single markup by ID
 */
export async function getMarkup(markupId: string): Promise<Markup | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('markups')
    .select('*')
    .eq('id', markupId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Create a new markup
 */
export async function createMarkup(
  markup: InsertTables<'markups'>
): Promise<{ data: Markup | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('markups')
    .insert(markup)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}

/**
 * Update a markup
 */
export async function updateMarkup(
  markupId: string,
  updates: UpdateTables<'markups'>
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('markups')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', markupId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Delete a markup (soft delete by setting status to 'archived')
 */
export async function deleteMarkup(markupId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('markups')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', markupId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Permanently delete a markup
 */
export async function hardDeleteMarkup(markupId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('markups')
    .delete()
    .eq('id', markupId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Hide a markup (set status to 'hidden')
 */
export async function hideMarkup(markupId: string): Promise<{ error: Error | null }> {
  return updateMarkup(markupId, { status: 'hidden' });
}

/**
 * Show a markup (set status to 'visible')
 */
export async function showMarkup(markupId: string): Promise<{ error: Error | null }> {
  return updateMarkup(markupId, { status: 'visible' });
}

/**
 * Get all markups created by a specific user for a scan
 */
export async function getUserMarkups(
  scanId: string,
  userId: string
): Promise<Markup[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('markups')
    .select('*')
    .eq('scan_id', scanId)
    .eq('created_by', userId)
    .neq('status', 'archived')
    .order('created_at', { ascending: true });

  if (error) {
    return [];
  }

  return data || [];
}

/**
 * Delete all markups for a scan created by a specific user
 */
export async function clearUserMarkups(
  scanId: string,
  userId: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('markups')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('scan_id', scanId)
    .eq('created_by', userId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Batch create markups
 */
export async function createMarkupsBatch(
  markups: InsertTables<'markups'>[]
): Promise<{ data: Markup[] | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  if (markups.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from('markups')
    .insert(markups)
    .select();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}
