# Mirror Labs Compression Worker

A background worker service that compresses PLY scan files to SOG format (15-20x compression) using BullMQ + Upstash Redis.

## Architecture

```
Browser → Upload PLY → Supabase Storage
                          ↓
              Supabase Edge Function → Upstash Redis (BullMQ)
                                              ↓
                                    Railway Worker Service
                                              ↓
                           Download PLY → Compress → Upload SOG
                                              ↓
                              Update scan record (status: ready)
```

## Prerequisites

1. **Upstash Redis** - Create a free account at [console.upstash.com](https://console.upstash.com/)
2. **Supabase Project** - With storage bucket `scans` configured
3. **Railway Account** (optional) - For production deployment at [railway.app](https://railway.app/)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Upstash Redis (get from Upstash dashboard)
UPSTASH_REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379

# Supabase (use SERVICE ROLE key, not anon key)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # Service role key with full access

# Optional
WORKER_CONCURRENCY=2
JOB_TIMEOUT_MS=600000
```

## Local Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Supabase Edge Function Setup

The Edge Function `enqueue-compression` needs these secrets configured:

```bash
# In your Supabase project settings > Edge Functions > Secrets
supabase secrets set UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
supabase secrets set UPSTASH_REDIS_REST_TOKEN=xxx
```

Deploy the function:

```bash
supabase functions deploy enqueue-compression
```

## Railway Deployment

1. Create a new project on Railway
2. Connect your GitHub repository
3. Set the root directory to `worker/`
4. Add environment variables (same as `.env`)
5. Railway will auto-deploy on git push

## Monitoring

- **Upstash Dashboard** - View queue depth, failed jobs
- **Railway Logs** - Worker output and errors
- **Supabase Dashboard** - Scan status in `scans` table

## Compression Flow

1. User uploads PLY file → stored in Supabase Storage
2. Scan record created with `status: 'processing'`
3. Edge Function enqueues job to Upstash Redis
4. Worker picks up job from BullMQ queue
5. Worker downloads PLY, compresses to SOG using splat-transform
6. Worker uploads SOG to Supabase Storage
7. Worker deletes original PLY file
8. Worker updates scan record: `status: 'ready'`, `file_url: <sog_url>`

## Error Handling

- Jobs retry 3 times with exponential backoff (1min, 5min, 15min)
- Failed jobs remain in queue for 7 days
- Scan records show `status: 'error'` with `error_message`

## Cost Estimates

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Upstash Redis | Free (10k commands/day) | $0 |
| Railway | Hobby ($5/mo) | $5 |
| **Total** | | **$5** |

## Troubleshooting

### Job stuck in queue
- Check Railway logs for errors
- Verify Redis connection string
- Check Supabase service key permissions

### Compression fails
- Ensure splat-transform is installed: `npx @playcanvas/splat-transform --help`
- Check file size (large files may timeout)
- Verify PLY file is valid

### Worker can't connect to Redis
- Verify `UPSTASH_REDIS_URL` format: `rediss://default:password@endpoint:6379`
- Check Upstash dashboard for connection issues
