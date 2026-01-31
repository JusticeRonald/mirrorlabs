/**
 * Supabase Edge Function: enqueue-compression
 *
 * Enqueues a compression job to Upstash Redis + BullMQ.
 * Called by the frontend after uploading a PLY file.
 *
 * Request body:
 * {
 *   scanId: string,
 *   projectId: string,
 *   fileUrl: string,
 *   fileName: string,
 *   fileSize: number
 * }
 *
 * Response:
 * { success: true, jobId: string }
 * or
 * { success: false, error: string }
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompressionJobData {
  scanId: string;
  projectId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

/**
 * Add a job to the BullMQ queue via Upstash REST API.
 *
 * BullMQ uses Redis lists and sorted sets to manage jobs.
 * We use Upstash's REST API since Deno doesn't support raw Redis connections well.
 */
async function enqueueJob(data: CompressionJobData): Promise<string> {
  const upstashUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const upstashToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  if (!upstashUrl || !upstashToken) {
    throw new Error('Upstash Redis configuration not found');
  }

  const jobId = `compress-${data.scanId}`;
  const timestamp = Date.now();

  // BullMQ job structure
  const job = {
    id: jobId,
    name: 'compress',
    data,
    opts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
      timestamp,
    },
    timestamp,
    delay: 0,
    priority: 0,
    processedOn: 0,
    finishedOn: 0,
    progress: 0,
    attemptsMade: 0,
    stacktrace: [],
    returnvalue: null,
    failedReason: null,
  };

  // Queue name used by the worker
  const queueName = 'scan-compression';

  // Use Upstash REST API to add to BullMQ queue
  // BullMQ stores jobs in Redis with specific keys:
  // - bull:{queueName}:waiting (list of job IDs)
  // - bull:{queueName}:{jobId} (job data hash)

  const jobKey = `bull:${queueName}:${jobId}`;
  const waitingKey = `bull:${queueName}:wait`;

  // Store job data
  const setJobResponse = await fetch(`${upstashUrl}/set/${jobKey}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(job)),
  });

  if (!setJobResponse.ok) {
    throw new Error(`Failed to store job data: ${await setJobResponse.text()}`);
  }

  // Add job ID to waiting list (RPUSH)
  const pushResponse = await fetch(`${upstashUrl}/rpush/${waitingKey}/${jobId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${upstashToken}`,
    },
  });

  if (!pushResponse.ok) {
    throw new Error(`Failed to enqueue job: ${await pushResponse.text()}`);
  }

  console.log(`Enqueued compression job: ${jobId}`);
  return jobId;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with the user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user has access (optional: you could check project membership here)
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CompressionJobData = await req.json();

    // Validate required fields
    if (!body.scanId || !body.projectId || !body.fileUrl || !body.fileName || !body.fileSize) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enqueue the job
    const jobId = await enqueueJob(body);

    return new Response(
      JSON.stringify({ success: true, jobId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error enqueueing compression job:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
