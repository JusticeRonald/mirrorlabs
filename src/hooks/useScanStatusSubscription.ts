import { useEffect, useCallback, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Scan, ScanStatus } from '@/lib/supabase/database.types';

/**
 * Scan status with compression progress info
 */
export interface ScanStatusInfo {
  status: ScanStatus;
  compressionProgress: number | null;
  errorMessage: string | null;
  compressedFileUrl: string | null;
  compressionRatio: number | null;
}

interface UseScanStatusSubscriptionOptions {
  /** Scan ID to subscribe to */
  scanId: string | null;
  /** Whether subscription is enabled */
  enabled?: boolean;
  /** Called when scan status changes */
  onStatusChange?: (info: ScanStatusInfo) => void;
  /** Called when scan is ready (compression complete) */
  onReady?: (scan: Scan) => void;
  /** Called when scan has an error */
  onError?: (errorMessage: string) => void;
}

interface UseScanStatusSubscriptionResult {
  /** Current status info */
  statusInfo: ScanStatusInfo | null;
  /** Whether the subscription is active */
  isConnected: boolean;
  /** Any subscription error */
  error: Error | null;
  /** Manually reconnect */
  reconnect: () => void;
}

/**
 * Extract status info from a scan record
 */
function extractStatusInfo(scan: Scan): ScanStatusInfo {
  return {
    status: scan.status,
    compressionProgress: scan.compression_progress,
    errorMessage: scan.error_message,
    compressedFileUrl: scan.status === 'ready' ? scan.file_url : null,
    compressionRatio: scan.compression_ratio,
  };
}

/**
 * useScanStatusSubscription - Real-time subscription for scan status changes
 *
 * Useful for tracking compression progress in the UI.
 * Subscribes to Supabase real-time changes on the scans table.
 */
export function useScanStatusSubscription({
  scanId,
  enabled = true,
  onStatusChange,
  onReady,
  onError,
}: UseScanStatusSubscriptionOptions): UseScanStatusSubscriptionResult {
  const [statusInfo, setStatusInfo] = useState<ScanStatusInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Fetch initial status
  useEffect(() => {
    if (!scanId || !enabled || !isSupabaseConfigured()) {
      return;
    }

    const fetchStatus = async () => {
      const { data, error: fetchError } = await supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();

      if (fetchError) {
        setError(new Error(fetchError.message));
        return;
      }

      if (data) {
        const info = extractStatusInfo(data);
        setStatusInfo(info);
        onStatusChange?.(info);
      }
    };

    fetchStatus();
  }, [scanId, enabled]);

  const connect = useCallback(() => {
    if (!isSupabaseConfigured() || !scanId || !enabled) {
      return null;
    }

    const channelName = `scan-status:${scanId}`;
    const newChannel = supabase.channel(channelName);

    newChannel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scans',
        filter: `id=eq.${scanId}`,
      },
      (payload: RealtimePostgresChangesPayload<Scan>) => {
        const scan = payload.new as Scan;
        const info = extractStatusInfo(scan);

        setStatusInfo(info);
        onStatusChange?.(info);

        // Call specific callbacks
        if (scan.status === 'ready') {
          onReady?.(scan);
        } else if (scan.status === 'error' && scan.error_message) {
          onError?.(scan.error_message);
        }
      }
    );

    newChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setError(null);
      } else if (status === 'CHANNEL_ERROR') {
        setIsConnected(false);
        setError(new Error('Failed to subscribe to scan status changes'));
      } else if (status === 'TIMED_OUT') {
        setIsConnected(false);
        setError(new Error('Subscription timed out'));
      }
    });

    return newChannel;
  }, [scanId, enabled, onStatusChange, onReady, onError]);

  const reconnect = useCallback(() => {
    if (channel) {
      supabase.removeChannel(channel);
    }
    setChannel(null);
    setIsConnected(false);
    setError(null);

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

    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
    };
  }, [scanId, enabled]); // Intentionally not including connect

  return {
    statusInfo,
    isConnected,
    error,
    reconnect,
  };
}

/**
 * useMultipleScanStatusSubscription - Subscribe to multiple scans at once
 *
 * Useful for project listing pages where multiple scans may be processing.
 */
export function useMultipleScanStatusSubscription(
  scanIds: string[],
  options: {
    enabled?: boolean;
    onStatusChange?: (scanId: string, info: ScanStatusInfo) => void;
  } = {}
): {
  statuses: Map<string, ScanStatusInfo>;
  isConnected: boolean;
} {
  const [statuses, setStatuses] = useState<Map<string, ScanStatusInfo>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const { enabled = true, onStatusChange } = options;

  useEffect(() => {
    if (!enabled || scanIds.length === 0 || !isSupabaseConfigured()) {
      return;
    }

    // Fetch initial statuses
    const fetchStatuses = async () => {
      const { data } = await supabase
        .from('scans')
        .select('*')
        .in('id', scanIds);

      if (data) {
        const newStatuses = new Map<string, ScanStatusInfo>();
        data.forEach((scan) => {
          newStatuses.set(scan.id, extractStatusInfo(scan));
        });
        setStatuses(newStatuses);
      }
    };

    fetchStatuses();

    // Subscribe to all scans
    const channel = supabase.channel('scan-statuses');

    scanIds.forEach((scanId) => {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scans',
          filter: `id=eq.${scanId}`,
        },
        (payload: RealtimePostgresChangesPayload<Scan>) => {
          const scan = payload.new as Scan;
          const info = extractStatusInfo(scan);

          setStatuses((prev) => {
            const next = new Map(prev);
            next.set(scan.id, info);
            return next;
          });

          onStatusChange?.(scan.id, info);
        }
      );
    });

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scanIds.join(','), enabled]);

  return { statuses, isConnected };
}

export default useScanStatusSubscription;
