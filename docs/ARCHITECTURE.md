# Architecture Decisions - Mirror Labs WebApp

Technical decisions, patterns, and roadmap for the platform.

---

## Backend Platform Choice: Supabase

Selected as unified backend for rapid development with path to scale:
- **Auth**: Email/password, OAuth, RLS integration
- **Database**: PostgreSQL for relational data (Projects→Scans→Annotations)
- **Storage**: S3-compatible, direct browser upload with RLS
- **Realtime**: Built on Postgres LISTEN/NOTIFY for collaboration

### Why Not Alternatives

| Platform | Reason Against |
|----------|----------------|
| **Firebase** | NoSQL model awkward for hierarchical data (Projects→Scans→Annotations) |
| **Custom Backend** | 3-6 months to build what Supabase provides |
| **Serverless (Vercel)** | Poor for real-time, connection pooling issues |

---

## Gaussian Splat Renderer Choice

**Decision**: Use `@sparkjsdev/spark` over `@mkkellogg/gaussian-splats-3d`

**Rationale**:
- Spark has cleaner Three.js integration (extends THREE.Object3D)
- Better TypeScript support
- `autoUpdate: true` option handles render loop integration automatically
- Simpler initialization pattern

---

## SOG Compression Pipeline

### Architecture

Background workers compress PLY uploads to SOG format (15-20x smaller):

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

### Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Compression Tool** | @playcanvas/splat-transform | Production-ready, 15-20x compression |
| **Job Queue** | Upstash Redis + BullMQ | Industry standard, robust retry, free tier |
| **Worker Hosting** | Railway ($5/mo) | Simple deployment, can scale |
| **Storage Strategy** | Delete original PLY after compression | Minimize storage costs |

### Why Not Alternatives?

| Alternative | Reason Against |
|-------------|----------------|
| **Supabase Edge Functions** | 2-second CPU limit - compression takes 30-60s |
| **pg-boss (PostgreSQL)** | Polling-based, Upstash is more robust |
| **Client-side compression** | Requires WebGPU, high variance in user hardware |
| **QStash** | Webhook delivery timeouts cause retries for long jobs |

### Format Details

| Format | Extension | Type Enum | Notes |
|--------|-----------|-----------|-------|
| SOG (bundled) | `.sog` | `PCSOGSZIP` | Lossless WebP images in ZIP container |
| SOG (unbundled) | `.pcsogs` | `PCSOGS` | meta.json + separate files |
| SPZ | `.spz` | `SPZ` | Gzip with binary header (magic 0x504C5053) |

**Critical**: SOG and SPZ are fundamentally different formats. SOG must map to `PCSOGSZIP`, not `SPZ`.

---

## File Upload Strategy

Tiered approach by file size:

| Size | Format | Notes |
|------|--------|-------|
| < 10MB | SOG | Fast compression, direct upload |
| 10-50MB | SOG | Background compression |
| 50-200MB | SOG + LOD | LOD generation (future) |
| > 200MB | SOG + chunked LOD | Streaming support (future) |

**Compression Ratios:**
- PLY → SOG: ~15-20x smaller, lossless WebP compression
- PLY → SPZ: ~10x smaller, alternative format

---

## Viewer3D useEffect Ordering

The Viewer3D component has specific useEffect ordering requirements:

1. **Canvas setup** (first) - Creates canvas, renderer, scene, camera
2. **Controls setup** - OrbitControls after renderer exists
3. **Splat renderer setup** - SparkRenderer after canvas is ready
4. **Render loop** (last) - Animation loop after all setup complete

---

## SceneManager Pattern

SceneManager wraps raw Three.js operations to provide:
- Object lifecycle management (add/remove with proper disposal)
- Abstraction over renderer implementation (GaussianSplatRenderer interface)
- Annotation and measurement management
- Raycasting utilities

---

## Feature Priority Matrix

| Priority | Feature | Status |
|----------|---------|--------|
| **P0** | Supabase Auth | ✅ Implemented |
| **P0** | Database/Persistence | ✅ Implemented |
| **P0** | File Upload | ✅ Implemented |
| **P1** | Functional Measurements | ✅ Implemented (Jan 2026) |
| **P1** | Annotations/Comments | ✅ Implemented (Jan 2026) |
| **P1** | Camera Waypoints (Saved Views) | ✅ Implemented (Jan 2026) |
| **P2** | SOG Compression | ✅ Implemented (Jan 2026) - deployment pending |
| **P2** | Real-time Collaboration | ✅ Implemented (Jan 2026) |

---

## Implementation Phases

### Phase 1: Foundation (Complete)
- ✅ Supabase client configuration
- ✅ Database schema types
- ✅ Auth migration (Supabase + demo mode)
- ✅ File upload component
- ✅ Data layer abstraction (hooks)
- ✅ Deploy Supabase schema (profiles trigger deployed)

### Phase 2: Core Collaboration (Complete)
- ✅ Functional measurement tool (distance, area)
- ✅ Annotation system + persistence to Supabase
- ✅ Real-time annotation sync across users
- ✅ Camera waypoints with smooth transitions (Saved Views)
- ✅ SOG compression pipeline (BullMQ + Railway worker)
- Basic sharing (public links) - pending

### Phase 3: Scale & Polish (Future)
- Deploy compression infrastructure (Upstash + Railway)
- Real-time presence indicators
- Notification system
- Export functionality

---

## Future Evolution: Self-Service Client Model

The Admin-Centric model is designed to evolve toward client self-service when needed.

### Current State

| Layer | Current Behavior | Future-Ready? |
|-------|------------------|---------------|
| **Database RLS** | Staff OR workspace editors can create projects | ✅ Already supports role-based access |
| **Frontend Permissions** | Only staff accounts can create | 🔧 Single file change needed |
| **Workspace Roles** | owner / editor / viewer roles exist | ✅ Ready for client promotion |

### Evolution Phases

| Phase | Model | Client Capabilities | When to Use |
|-------|-------|---------------------|-------------|
| **Phase 1** (Current) | Admin-Centric | View/annotate only | Early stage, onboarding new clients |
| **Phase 2** | Trusted Client | Editors can create projects/upload scans | Established clients, reduce admin workload |
| **Phase 3** | Self-Service | Clients create own workspaces, invite team | Scale, SaaS model, billing per workspace |

### Migration Path to Phase 2 (Trusted Clients)

When ready to enable trusted client self-service:

1. **Update `ACCOUNT_PERMISSIONS`** in `src/types/user.ts`:
   - Make permissions role-aware (check workspace role, not just account type)

2. **Update UI components** to pass workspace context to permission checks

3. **No database changes needed** - RLS already supports role-based project creation:
   ```sql
   -- Workspace editors can create in their workspace
   workspace_id IN (
     SELECT workspace_id FROM workspace_members
     WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
   )
   ```

### Design Decisions to Preserve

For future compatibility, maintain these patterns:
- **Workspace as container**: All projects belong to a workspace
- **Role-based access**: Use `workspace_members.role`, not `account_type`, for fine-grained permissions
- **Separation of concerns**: RLS for security, frontend for UX (don't rely solely on frontend)
