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

## Splat Picking Architecture (January 2026)

### Critical Research Insight

> "Native raycasting on Gaussian data doesn't exist in any current implementation."
> — Industry analysis of SuperSplat, Potree, GaussianSplats3D

Gaussian splats are probabilistic density functions, not geometry. Traditional mesh raycasting doesn't apply. Every major platform (Potree, SuperSplat) uses spatial indices as workarounds.

### Current Implementation: Hybrid Picking System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MIRROR LABS PICKING SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 1: INTERPOLATION CACHE (Implemented ✅)                               │
│  ├── Cache last pick result with surface plane                             │
│  ├── Predict cursor position via ray-plane intersection                    │
│  └── ~0.01ms, used for instant feedback                                     │
│                                                                              │
│  LAYER 2: BVH INDEX (Default ✅) / SPATIAL HASH (Fallback ✅)                 │
│  ├── BVH via three-mesh-bvh: ~0.01-0.02ms query, ~200-400ms build          │
│  ├── Spatial hash: ~0.05ms query, ~100ms build (kept as fallback)          │
│  └── Replaces WASM in cursor tracking for 100x speedup                      │
│                                                                              │
│  LAYER 3: GPU DEPTH BUFFER (Implemented ✅)                                  │
│  ├── Render scene to depth target each frame                               │
│  ├── Async readback (1-frame delay, imperceptible)                         │
│  └── ~0.1ms per query, used for surface position refinement                │
│                                                                              │
│  LAYER 4: WASM RAYCAST (Fallback ✅)                                         │
│  ├── Spark.js SplatMesh.raycast() via WASM                                 │
│  ├── O(n) per splat, 0.5-2ms for 1M splats                                 │
│  └── Used for final click placement when accuracy matters                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Spatial Index Implementation Details

The system now supports two index types, with BVH as the default:

#### BVH Index (Default) - `SplatBVHIndex.ts`

Uses [three-mesh-bvh](https://www.npmjs.com/package/three-mesh-bvh) (742K weekly downloads):

**Why BVH?**
- Industry-standard for spatial queries
- 2-5x faster queries than spatial hash
- Native Three.js raycasting integration
- Surface Area Heuristic (SAH) for optimal tree construction

**Build Phase:**
1. Create small billboards at each splat center (for raycasting)
2. Build BVH with SAH strategy: `O(n log n)` time
3. ~200-400ms for 1M splats

**Query Phase:**
1. Accelerated raycast via BVH tree traversal
2. ~0.01-0.02ms per query

#### Spatial Hash Index (Fallback) - `SplatSpatialIndex.ts`

Kept as fallback for specific use cases:

**Why Spatial Hash?**
- Faster build time (important for frequent reloads)
- Lower memory usage
- Simpler implementation

**Optimizations (Phase 2a - January 2026):**
- Integer hash keys instead of string keys (5400 fewer allocations per pick)
- Generation counter instead of Set for visited tracking
- Object pooling for Vector3 results
- Cached inverse matrix (only recomputed when mesh moves)

**Build Phase:**
1. Extract splat centers, scales, and opacities via `forEachSplat()`
2. Compute optimal cell size from bounding box (target ~12 splats/cell)
3. Insert each splat into its grid cell: `O(n)` time

**Query Phase:**
1. Sample points along the ray at `0.5 × cellSize` intervals
2. For each sample, check 3×3×3 neighborhood (27 cells)
3. Collect unique candidates (typically 10-50 splats)
4. Ray-sphere intersection test on each candidate
5. Return closest hit

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/viewer/SplatPickingSystem.ts` | Hybrid picking with BVH/spatial index + cache |
| `src/lib/viewer/SplatBVHIndex.ts` | BVH-accelerated spatial index (default) |
| `src/lib/viewer/SplatSpatialIndex.ts` | Spatial hash grid for fast ray queries (fallback) |
| `src/lib/viewer/SceneManager.ts` | Builds spatial index on splat load |
| `src/components/viewer/Viewer3D.tsx` | Render loop integration |

### Why Not Alternatives?

| Approach | Issue |
|----------|-------|
| **SuperSplat two-pass depth** | Requires forking Spark.js or PlayCanvas engine |
| **GaussianSplats3D** | Same depth limitation for transparent splats |
| **Pure WASM raycast** | Too slow (0.5-2ms) for 60fps cursor tracking |

### Industry Patterns We Follow

| Pattern | Source | Our Implementation |
|---------|--------|-------------------|
| HTML overlay labels | Potree, SuperSplat, Figma | ✅ `MeasurementRenderer` + overlays |
| Lazy depth sorting | Spark.js | ✅ Configured in renderer |
| SOG/SPZ compression | PlayCanvas | ✅ 15-20x compression pipeline |
| Spatial index for picking | Potree | ✅ Spatial hash grid |
| GPU index picking | SuperSplat | 📋 Future consideration |

### Performance Targets

| Operation | Target | Current |
|-----------|--------|---------|
| Cursor tracking | <0.5ms | ✅ ~0.01-0.02ms (BVH) |
| Click placement | <5ms | ✅ ~1ms (WASM raycast) |
| BVH index query | <0.05ms | ✅ ~0.01-0.02ms for 1M splats |
| BVH index build | <500ms | ✅ ~200-400ms for 1M splats |
| Spatial hash query | <0.1ms | ✅ ~0.05ms for 1M splats |
| Spatial hash build | <200ms | ✅ ~100ms for 1M splats |
| Interpolation | <0.05ms | ✅ ~0.01ms |

### Code Review Fixes (January 31, 2026)

Comprehensive code review addressed critical and high-priority issues:

**Critical Fixes:**
- **Ray direction transformation**: Use `transformDirection()` instead of `applyMatrix4()` for correct non-uniform scaling
- **Global prototype pollution**: Apply `acceleratedRaycast` only to BVH mesh instance, not `Mesh.prototype`
- **Material memory leak**: Instance-based material with proper `dispose()` in `SplatBVHIndex`
- **Hot path allocations**: Pooled Vector3 objects avoid GC pressure during picking

**High Priority Fixes:**
- **Matrix comparison**: Epsilon-based element comparison replaces hash (avoids collision risk)
- **Ray-sphere optimization**: Simplified formula for normalized rays in spatial index
- **Bounds early exit**: Early return when ray misses bounding box entirely
- **Redundant scene update**: Removed `updateMatrixWorld()` call (scene graph updated in render loop)
- **Cache invalidation**: Reset `cachedMatrixElements` when spatial index is rebuilt

**Implementation Details Updated:**
- Object pooling pattern throughout picking pipeline
- Named constants for magic numbers (`BILLBOARD_SCALE`, `MULTI_SAMPLE_OFFSET`, etc.)
- Consolidated cache update logic via `updateCache()` helper

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
