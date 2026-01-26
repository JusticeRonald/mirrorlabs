import { useEffect, useCallback, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Annotation, AnnotationReply, Comment } from '@/lib/supabase/database.types';

/**
 * Payload types for real-time events
 */
type PostgresChangePayload<T> = RealtimePostgresChangesPayload<T>;

/**
 * Event handlers for annotation changes
 */
interface AnnotationEventHandlers {
  onAnnotationInsert?: (annotation: Annotation) => void;
  onAnnotationUpdate?: (annotation: Annotation) => void;
  onAnnotationDelete?: (oldAnnotation: Annotation) => void;
  onReplyInsert?: (reply: AnnotationReply) => void;
  onReplyDelete?: (oldReply: AnnotationReply) => void;
  onCommentInsert?: (comment: Comment) => void;
  onCommentUpdate?: (comment: Comment) => void;
  onCommentDelete?: (oldComment: Comment) => void;
}

interface UseAnnotationSubscriptionOptions {
  /** Scan ID to subscribe to */
  scanId: string;
  /** Whether subscription is enabled */
  enabled?: boolean;
  /** Event handlers */
  handlers: AnnotationEventHandlers;
}

interface UseAnnotationSubscriptionResult {
  /** Whether the subscription is active */
  isConnected: boolean;
  /** Any subscription error */
  error: Error | null;
  /** Manually reconnect */
  reconnect: () => void;
}

/**
 * useAnnotationSubscription - Real-time subscription for annotation changes
 *
 * Subscribes to Supabase real-time changes on:
 * - annotations table
 * - annotation_replies table
 * - comments table
 *
 * Calls the provided handlers when changes occur.
 */
export function useAnnotationSubscription({
  scanId,
  enabled = true,
  handlers,
}: UseAnnotationSubscriptionOptions): UseAnnotationSubscriptionResult {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const connect = useCallback(() => {
    if (!isSupabaseConfigured() || !scanId || !enabled) {
      return null;
    }

    // Create channel for this scan
    const channelName = `annotations:${scanId}`;
    const newChannel = supabase.channel(channelName);

    // Subscribe to annotations
    newChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'annotations',
        filter: `scan_id=eq.${scanId}`,
      },
      (payload: PostgresChangePayload<Annotation>) => {
        switch (payload.eventType) {
          case 'INSERT':
            handlers.onAnnotationInsert?.(payload.new as Annotation);
            break;
          case 'UPDATE':
            handlers.onAnnotationUpdate?.(payload.new as Annotation);
            break;
          case 'DELETE':
            handlers.onAnnotationDelete?.(payload.old as Annotation);
            break;
        }
      }
    );

    // Subscribe to annotation replies
    // Note: We need to join with annotations to filter by scan_id
    // For now, we subscribe to all replies and filter client-side
    newChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'annotation_replies',
      },
      (payload: PostgresChangePayload<AnnotationReply>) => {
        switch (payload.eventType) {
          case 'INSERT':
            handlers.onReplyInsert?.(payload.new as AnnotationReply);
            break;
          case 'DELETE':
            handlers.onReplyDelete?.(payload.old as AnnotationReply);
            break;
        }
      }
    );

    // Subscribe to comments
    newChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `scan_id=eq.${scanId}`,
      },
      (payload: PostgresChangePayload<Comment>) => {
        switch (payload.eventType) {
          case 'INSERT':
            handlers.onCommentInsert?.(payload.new as Comment);
            break;
          case 'UPDATE':
            handlers.onCommentUpdate?.(payload.new as Comment);
            break;
          case 'DELETE':
            handlers.onCommentDelete?.(payload.old as Comment);
            break;
        }
      }
    );

    // Subscribe to the channel
    newChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setError(null);
      } else if (status === 'CHANNEL_ERROR') {
        setIsConnected(false);
        setError(new Error('Failed to subscribe to annotation changes'));
      } else if (status === 'TIMED_OUT') {
        setIsConnected(false);
        setError(new Error('Subscription timed out'));
      }
    });

    return newChannel;
  }, [scanId, enabled, handlers]);

  const reconnect = useCallback(() => {
    // Unsubscribe from existing channel
    if (channel) {
      supabase.removeChannel(channel);
    }
    setChannel(null);
    setIsConnected(false);
    setError(null);

    // Create new channel
    const newChannel = connect();
    if (newChannel) {
      setChannel(newChannel);
    }
  }, [channel, connect]);

  // Set up subscription on mount
  useEffect(() => {
    if (!enabled || !scanId) {
      return;
    }

    const newChannel = connect();
    if (newChannel) {
      setChannel(newChannel);
    }

    // Cleanup on unmount
    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
    };
  }, [scanId, enabled]); // Note: intentionally not including connect to avoid recreation

  return {
    isConnected,
    error,
    reconnect,
  };
}

/**
 * useAnnotations - Hook for managing annotations with real-time updates
 *
 * Combines fetching, caching, and real-time subscriptions for annotations.
 */
export function useAnnotations(scanId: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [replies, setReplies] = useState<Map<string, AnnotationReply[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch initial data
  useEffect(() => {
    if (!scanId || !isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    const fetchAnnotations = async () => {
      try {
        setIsLoading(true);

        const { data, error: fetchError } = await supabase
          .from('annotations')
          .select(`
            *,
            replies:annotation_replies(*)
          `)
          .eq('scan_id', scanId)
          .order('created_at', { ascending: false });

        if (fetchError) throw new Error(fetchError.message);

        setAnnotations(data || []);

        // Build replies map
        const repliesMap = new Map<string, AnnotationReply[]>();
        (data || []).forEach((annotation: Annotation & { replies?: AnnotationReply[] }) => {
          if (annotation.replies) {
            repliesMap.set(annotation.id, annotation.replies);
          }
        });
        setReplies(repliesMap);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch annotations'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnotations();
  }, [scanId]);

  // Real-time subscription handlers
  const { isConnected, error: subscriptionError, reconnect } = useAnnotationSubscription({
    scanId,
    enabled: !!scanId && isSupabaseConfigured(),
    handlers: {
      onAnnotationInsert: (annotation) => {
        setAnnotations((prev) => [annotation, ...prev]);
      },
      onAnnotationUpdate: (annotation) => {
        setAnnotations((prev) =>
          prev.map((a) => (a.id === annotation.id ? annotation : a))
        );
      },
      onAnnotationDelete: (oldAnnotation) => {
        setAnnotations((prev) => prev.filter((a) => a.id !== oldAnnotation.id));
        setReplies((prev) => {
          const next = new Map(prev);
          next.delete(oldAnnotation.id);
          return next;
        });
      },
      onReplyInsert: (reply) => {
        setReplies((prev) => {
          const next = new Map(prev);
          const existing = next.get(reply.annotation_id) || [];
          next.set(reply.annotation_id, [...existing, reply]);
          return next;
        });
      },
      onReplyDelete: (oldReply) => {
        setReplies((prev) => {
          const next = new Map(prev);
          const existing = next.get(oldReply.annotation_id) || [];
          next.set(
            oldReply.annotation_id,
            existing.filter((r) => r.id !== oldReply.id)
          );
          return next;
        });
      },
    },
  });

  return {
    annotations,
    replies,
    isLoading,
    error: error || subscriptionError,
    isConnected,
    reconnect,
    setAnnotations,
    setReplies,
  };
}

export default useAnnotationSubscription;
