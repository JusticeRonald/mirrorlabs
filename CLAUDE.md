# Mirror Labs WebApp - Project Context

## Overview
Web-based 3D collaboration platform for construction and real estate professionals. Enables teams to view, annotate, and share 3D Gaussian Splat scans of job sites.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: shadcn/ui + Tailwind CSS
- **Routing**: React Router v6
- **3D Rendering**: Three.js + @sparkjsdev/spark (Gaussian Splat renderer)
- **Backend**: Supabase (Auth + PostgreSQL + Storage + Realtime + Edge Functions)
- **Compression**: @playcanvas/splat-transform (PLY → SOG, 15-20x compression)
- **Job Queue**: Upstash Redis + BullMQ (compression pipeline)

## Architecture

### Key Directories
```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── viewer/       # 3D viewer components (Viewer3D, Toolbar, Sidebar, etc.)
│   ├── upload/       # File upload components (ScanUploader, CompressionProgress)
│   └── illustrations/# Marketing page illustrations
├── contexts/
│   ├── AuthContext.tsx    # Supabase auth with demo mode fallback
│   └── ViewerContext.tsx  # 3D viewer state management
├── hooks/
│   ├── useProjects.ts              # Projects data hook (Supabase + mock fallback)
│   └── useScanStatusSubscription.ts # Real-time scan status (compression progress)
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Supabase client configuration
│   │   ├── database.types.ts  # PostgreSQL schema types
│   │   └── services/          # Data access layer
│   │       ├── projects.ts    # Project CRUD operations
│   │       ├── scans.ts       # Scan CRUD operations
│   │       ├── annotations.ts # Annotations, measurements, waypoints
│   │       └── storage.ts     # File upload/download
│   ├── compression/           # Client-side compression utilities
│   └── viewer/
│       ├── SceneManager.ts     # Three.js scene orchestration
│       ├── SplatPickingSystem.ts   # Hybrid picking (spatial index + WASM)
│       ├── SplatSpatialIndex.ts    # Spatial hash grid for fast splat picking
│       ├── MeasurementRenderer.ts  # 3D measurement lines
│       ├── AnnotationRenderer.ts   # 3D annotation markers
│       ├── constants.ts        # Viewer constants and thresholds
│       └── renderers/          # Gaussian Splat renderer implementations
├── pages/              # Route page components
├── types/
│   ├── user.ts         # User/role types
│   └── viewer.ts       # Viewer state types (includes SavedView)
└── data/
    └── mockProjects.ts # Mock project data (fallback when Supabase not configured)

worker/                   # Compression worker (Railway deployment)
├── src/
│   ├── index.ts         # BullMQ worker entry point
│   ├── queue.ts         # Queue configuration and utilities
│   ├── compress.ts      # PLY → SOG compression logic
│   └── supabase.ts      # Worker Supabase client (service role)
├── Dockerfile           # Railway deployment config
└── package.json         # Worker dependencies

supabase/
├── functions/
│   └── enqueue-compression/  # Edge Function to enqueue BullMQ jobs
└── migrations/               # Database schema migrations
```

### Key Files
- `src/lib/supabase/client.ts` - Supabase client with environment variable config
- `src/lib/supabase/database.types.ts` - TypeScript types for PostgreSQL schema
- `src/lib/supabase/services/*.ts` - Data access layer for all entities
- `src/lib/viewer/SceneManager.ts` - Manages Three.js scene, objects, annotations, measurements
- `src/lib/viewer/renderers/SparkSplatRenderer.ts` - Spark-based Gaussian Splat renderer
- `src/components/viewer/Viewer3D.tsx` - Main 3D canvas component with render loop
- `src/contexts/AuthContext.tsx` - Supabase Auth with demo mode fallback
- `src/contexts/ViewerContext.tsx` - State management for viewer (tools, loading, saved views)
- `src/pages/ViewerPage.tsx` - Main viewer page with collaboration features

### Data Services Layer
All services in `src/lib/supabase/services/` with graceful Supabase fallback:

- **workspaces.ts**: CRUD for workspaces + member management
- **projects.ts**: CRUD + member management
- **scans.ts**: CRUD with status tracking (uploading → processing → ready)
- **annotations.ts**: Annotations, replies, measurements, camera waypoints
- **storage.ts**: File upload with progress, validation, signed URLs

## Compression Pipeline Architecture

PLY files are compressed to SOG format (15-20x smaller) via background workers:

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   Browser    │────▶│      Supabase        │     │  Upstash Redis   │
│  (upload)    │     │  Storage + Postgres  │     │    (BullMQ)      │
└──────────────┘     └──────────────────────┘     └──────────────────┘
       │                      │                           ▲
       │                      │ Edge Function             │
       │                      │ enqueues job              │
       │                      └───────────────────────────┘
       │                                                  │
       │  Real-time                               Worker  │
       │  subscription                          processes │
       ▼                                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  Status: uploading → processing → ready (or error)               │
└──────────────────────────────────────────────────────────────────┘
```

### Compression Job Flow
1. User uploads PLY → status='uploading'
2. Upload completes → Edge Function enqueues BullMQ job → status='processing'
3. Worker downloads PLY, compresses to SOG, uploads compressed file
4. Worker deletes original PLY, updates scan → status='ready'

### File Formats
| Format | Extension | Use Case |
|--------|-----------|----------|
| PLY | `.ply` | Raw upload (uncompressed) |
| SOG | `.sog` | Compressed (bundled WebP in ZIP) |
| SPZ | `.spz` | Alternative compressed format |

## Database Schema

```sql
-- Core Entities
workspaces (id, name, slug, type, owner_id, created_at)  -- type: 'personal' | 'business'
profiles (id, email, name, avatar_url, initials, primary_workspace_id)
workspace_members (workspace_id, user_id, role)

-- Projects & Scans
projects (id, workspace_id, name, description, industry, thumbnail_url, is_archived)
project_members (project_id, user_id, role)
scans (id, project_id, name, file_url, file_type, file_size, splat_count, status,
       compression_progress, original_file_size, compressed_file_size, compression_ratio)

-- Collaboration
annotations (id, scan_id, type, position_x/y/z, content, status, created_by)
annotation_replies (id, annotation_id, content, created_by)
measurements (id, scan_id, type, points_json, value, unit, label, created_by)
camera_waypoints (id, scan_id, name, position_json, target_json, fov, thumbnail_url)
```

### Table Clarification
| Table | Purpose |
|-------|---------|
| `annotations` | 3D-positioned markers on scans (pins with XYZ position) |
| `annotation_replies` | Threaded replies to annotations |
| `measurements` | Distance, area measurements with 3D points |
| `camera_waypoints` | Saved camera views for tours |

## Admin-Centric Organizational Model

Mirror Labs staff manages workspace/project creation:

- **Staff** creates and manages all business workspaces
- **Staff** assigns clients as members to workspaces
- **Clients** view/annotate projects in assigned workspaces only
- **Clients** CANNOT create workspaces or projects

### Account Types & Permissions

| Type | Permissions | Detection |
|------|-------------|-----------|
| **Staff** | Full access - upload, create projects, manage workspaces | `@mirrorlabs3d.com` email OR `is_staff` flag |
| **Client** | View/annotate assigned workspaces only | Default for non-staff |
| **Demo** | Full demo mode features, no persistence | Demo login button |

### Terminology Guide
| UI Term | Database | Notes |
|---------|----------|-------|
| **Workspace** | `workspaces` | Personal or Business type |
| **Member** | `workspace_members` / `project_members` | Person in workspace/project |
| **Person/People** | `profiles` | Avoid "user" in UI |
| **Staff** | `is_staff` flag | Mirror Labs employees |

## Environment Configuration

Create `.env` file (see `.env.example`):
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Demo Mode
When Supabase is not configured:
- App runs in demo mode with mock data
- Users can log in via "Demo Login" button
- All data operations are local only
- File uploads simulate progress but don't persist

## Development Commands
```bash
npm install       # Install dependencies
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Run ESLint
```

## Demo Splat Files
Place `.ply`, `.spz`, or `.splat` files in `public/splats/` for local testing.

## Current State (January 2026)

Core features implemented:
- Supabase Auth with email/password + demo mode fallback
- 3D Gaussian Splat Viewer with Spark renderer
- Measurement tools (distance, area) with persistence
- Annotation system with real-time sync
- Saved Views (camera waypoints) with fly-to animations
- Keyboard shortcuts (G/R/S for transform, C/D for tools, Delete for removal)
- SOG Compression Pipeline (PLY → SOG, 15-20x compression)
  - BullMQ + Upstash Redis job queue
  - Railway worker for compression processing
  - Real-time progress via Supabase subscriptions

### Next Priority
- [ ] Deploy compression infrastructure (Upstash + Railway)
- [ ] Basic sharing (public links)

### Branch Status
Development on `gaussian-splat-viewer` branch, regularly merged to `master`.

## Splat Picking System

Gaussian splats are not traditional geometry - they're probabilistic density functions. Native raycasting doesn't exist in any web implementation. Our hybrid picking system:

```
Interpolation Cache (0.01ms) → Instant feedback between picks
         ↓
BVH Index (0.01-0.02ms) → Fast BVH-accelerated ray queries (default)
         ↓
GPU Depth Buffer (0.1ms) → Surface position refinement
         ↓
WASM Raycast (0.5-2ms) → Fallback for final click placement
```

**Architecture:**
- BVH (three-mesh-bvh) built once on splat load from splat centers (default)
- Spatial hash grid available as fallback for faster build times
- 100-200x faster than O(n) WASM raycast for cursor tracking

**Performance Optimizations (January 2026):**
- Integer hash keys instead of string keys (5400 fewer allocations per pick)
- Generation counter instead of Set for visited tracking
- Cached inverse matrix (only recomputed when mesh moves)
- Object pooling for Vector3 results
- Epsilon-based matrix comparison (replaces hash, avoids collision risk)
- Bounds check early exit in spatial index
- Optimized ray-sphere intersection (assumes normalized rays)
- Proper direction transformation with `transformDirection()`

**Key insight from industry research:** Every major platform (Potree, SuperSplat) uses spatial indices for picking on large datasets. See `docs/ARCHITECTURE.md` for full details.

**Key files:**
- `src/lib/viewer/SplatPickingSystem.ts` - Hybrid picking implementation
- `src/lib/viewer/SplatBVHIndex.ts` - BVH-accelerated index (default)
- `src/lib/viewer/SplatSpatialIndex.ts` - Spatial hash grid (fallback)
- `src/lib/viewer/constants.ts` - Picking thresholds and config

## Related Documentation

| File | Contents |
|------|----------|
| `docs/CHANGELOG.md` | Code review history, feature development timeline |
| `docs/ARCHITECTURE.md` | Design decisions, patterns, roadmap, future evolution |
| `docs/TECHNICAL_DEBT.md` | Known issues to address |
