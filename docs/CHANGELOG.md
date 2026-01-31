# Changelog - Mirror Labs WebApp

Historical record of code reviews, fixes, and feature development.

---

## January 31, 2026 - Splat Picking Code Review Fixes

Comprehensive code review fixes for the splat picking system optimizations.

### Critical Fixes
| Issue | File | Fix |
|-------|------|-----|
| Ray direction transformation bug | `SplatPickingSystem.ts` | Use `transformDirection()` for correct non-uniform scaling |
| Global prototype pollution | `SplatBVHIndex.ts` | Apply `acceleratedRaycast` only to BVH mesh instance |
| Static material memory leak | `SplatBVHIndex.ts` | Instance-based material with proper disposal |
| Hot path memory allocations | All 3 files | Pooled Vector3 objects avoid GC pressure |

### High Priority Fixes
| Issue | File | Fix |
|-------|------|-----|
| Matrix hash collision risk | `SplatPickingSystem.ts` | Epsilon-based element comparison |
| Ray-sphere not optimized | `SplatSpatialIndex.ts` | Simplified formula for normalized rays |
| Missing bounds early exit | `SplatSpatialIndex.ts` | Early return if ray misses bounds |
| Redundant updateMatrixWorld | `SplatPickingSystem.ts` | Removed (scene graph updated in render loop) |
| Cache reset on mesh change | `SplatPickingSystem.ts` | Reset `cachedMatrixElements` in `buildSpatialIndex()` |

### Medium Priority Fixes
| Issue | Fix |
|-------|-----|
| Duplicate cache update logic | Refactored `processPendingDepthRead()` to use `updateCache()` |
| Magic numbers | Added named constants (`BILLBOARD_SCALE`, `MULTI_SAMPLE_OFFSET`, etc.) |

### Files Modified
- `src/lib/viewer/SplatPickingSystem.ts`
- `src/lib/viewer/SplatBVHIndex.ts`
- `src/lib/viewer/SplatSpatialIndex.ts`

### Verification
- TypeScript compilation passed
- ESLint passed (no new issues)
- Production build passed

---

## January 31, 2026 - SOG Compression Pipeline

Implemented background compression pipeline for PLY → SOG format conversion (15-20x compression).

### Architecture

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Job Queue** | Upstash Redis + BullMQ | Robust job queue with retry logic |
| **Worker** | Node.js on Railway | Background compression processing |
| **Compression** | @playcanvas/splat-transform | PLY → SOG conversion |
| **Job Enqueue** | Supabase Edge Function | Enqueue jobs after upload |

### Files Created

| File | Purpose |
|------|---------|
| `worker/src/index.ts` | BullMQ worker entry point with graceful shutdown |
| `worker/src/queue.ts` | Queue configuration, retry settings, stats |
| `worker/src/compress.ts` | PLY → SOG compression via splat-transform CLI |
| `worker/src/supabase.ts` | Worker Supabase client (service role) |
| `worker/Dockerfile` | Railway deployment configuration |
| `worker/package.json` | Worker dependencies (bullmq, ioredis, etc.) |
| `supabase/functions/enqueue-compression/index.ts` | Edge Function to enqueue BullMQ jobs |
| `supabase/migrations/20260131_compression_pipeline.sql` | Compression tracking columns |
| `src/hooks/useScanStatusSubscription.ts` | Real-time scan status subscription |
| `src/components/upload/CompressionProgress.tsx` | Progress indicator UI |
| `src/lib/compression/` | Client-side compression utilities |

### Files Modified

| File | Changes |
|------|---------|
| `src/lib/viewer/renderers/SparkSplatRenderer.ts` | Fixed SOG format mapping (SPZ → PCSOGSZIP) |
| `src/lib/supabase/services/scans.ts` | Added compression status/progress updates |
| `src/lib/supabase/database.types.ts` | Added compression columns to Scan type |
| `src/components/upload/ScanUploader.tsx` | Integrated compression progress UI |
| `src/pages/ViewerPage.tsx` | Subscribe to scan status changes |

### Critical Bug Fixed

**Issue**: SOG files were incorrectly mapped to `SplatFileType.SPZ` in SparkSplatRenderer.ts

**Impact**: SOG files would fail to load with "failed to match magic number" error

**Fix**: Map `.sog` → `SplatFileType.PCSOGSZIP`, `.pcsogs` → `SplatFileType.PCSOGS`

### Compression Job Flow

```
Upload PLY → status='uploading'
    ↓
Upload complete → Edge Function enqueues BullMQ job → status='processing'
    ↓
Worker processes: download PLY → compress → upload SOG → delete PLY
    ↓
Worker updates scan → status='ready'
```

### Deployment Checklist (Pending)

- [ ] Create Upstash Redis instance
- [ ] Deploy worker to Railway
- [ ] Deploy Edge Function with secrets
- [ ] Run database migration
- [ ] End-to-end test

---

## January 30, 2026 - Pre-Commit Performance & Robustness

Comprehensive code review fixes addressing performance, robustness, and maintainability.

### Issues Fixed

| Issue | Category | Fix |
|-------|----------|-----|
| **#5** | Performance | Fix double-render: only two-pass when magnifier enabled AND measurements visible |
| **#6** | Performance | Reduce resize debounce from 100ms to 16ms for responsive line width |
| **#11** | Performance | Add frustum culling to all Line2 objects |
| **#12** | Maintainability | Centralize polygon offset values in `constants.ts` |
| **#17** | Robustness | Add null checks in `MeasurementRenderer.setParentObject()` |
| **#21** | Maintainability | Extract label/marker scaling magic numbers to constants |
| **#26** | Robustness | Add unit validation in `updateMeasurement()` |

### New Constants Added (`src/lib/viewer/constants.ts`)

```typescript
// Polygon offset for depth handling
POLYGON_OFFSET_OUTLINE = { factor: -0.5, units: -0.5 }
POLYGON_OFFSET_MAIN = { factor: -1.0, units: -1.0 }

// Distance-based scaling
LABEL_SCALE = { base: 100, minSize: 10, maxSize: 14 }
MARKER_SCALE = { base: 150, minSize: 12, maxSize: 24 }

// Unit validation
VALID_MEASUREMENT_UNITS = ['ft', 'm', 'in', 'cm']
isValidMeasurementUnit(unit: string): boolean
```

### State Management Fix

- Restore `selectedMeasurementId` after drag ends (prevents selection loss)
- Added `selectedMeasurementIdBeforeDrag` to ViewerState

### Files Modified

- `src/lib/viewer/constants.ts` - Added new constants
- `src/lib/viewer/MeasurementRenderer.ts` - Frustum culling, null checks, unit validation, debounce, constants
- `src/components/viewer/MeasurementLabel.tsx` - Use `LABEL_SCALE` constant
- `src/components/viewer/MeasurementMarker.tsx` - Use `MARKER_SCALE` constant
- `src/components/viewer/Viewer3D.tsx` - Fixed double-render logic
- `src/contexts/ViewerContext.tsx` - Restore selection after drag
- `src/types/viewer.ts` - Added `selectedMeasurementIdBeforeDrag` state

---

## January 30, 2026 - Area Fill Styling

Area measurement polygon fill visual improvements.

### Changes Made
| Category | Summary |
|----------|---------|
| **Color Change** | Changed area fill from purple (`0x8B5CF6`) to blue (`0x3B82F6`) matching distance measurements |
| **Opacity Increase** | Increased fill opacity from 35% to 45% for better visibility |
| **Viewing Angle Fix** | Added `polygonOffset` and `renderOrder` to fix fill disappearing at certain camera angles |

### Technical Details
- **polygonOffset**: `polygonOffsetFactor: -1.0`, `polygonOffsetUnits: -1.0` pushes fill forward in depth
- **renderOrder**: `98` ensures fill renders after splat but before outline lines (99) and main lines (100)
- Applied to both finalized area measurements and preview fills during placement

---

## January 30, 2026 - Measurement Selection UX

Measurement selection visual feedback improvements.

### Changes Made
| Category | Summary |
|----------|---------|
| **Total Label Removal** | Removed redundant total distance label from 3D view (already shown in UI panel) |
| **Selection Pulse Effect** | Added pulsing/glowing animation when measurements selected from UI panel |
| **Renderer Integration** | Connected `selectedMeasurementId` state to `MeasurementRenderer.setSelected()` |

### Pulse Animation Details
- ~1.5 second cycle time (sine wave)
- Intensity range: 0.3 to 1.0 (never fully transparent)
- Applies to both line segments and area fills
- Continuous pulse while measurement is selected

---

## January 30, 2026 - Segment Split

Distance measurement segment split behavior and persistence.

### Changes Made
| Category | Summary |
|----------|---------|
| **Segment Split Behavior** | Middle segment deletion splits measurement into two independent measurements |
| **Segment Truncate** | First/last segment deletion truncates measurement (removes endpoint) |
| **Action Return Type** | `removeSegmentFromMeasurement` now returns `'deleted' | 'truncated' | 'split'` |
| **Measurement Persistence** | New `updateMeasurement` service for Supabase persistence |
| **Split Persistence** | Split creates new measurement in Supabase, original is updated |

### Segment Deletion Behavior
| Scenario | Action | Result |
|----------|--------|--------|
| Delete only segment (2 points) | `deleted` | Measurement removed entirely |
| Delete first segment | `truncated` | First point removed, measurement shortened |
| Delete last segment | `truncated` | Last point removed, measurement shortened |
| Delete middle segment | `split` | Creates two independent measurements from remaining points |

---

## January 29, 2026 - Measurement Labels

Measurement label overlays and UX improvements.

### Changes Made
| Category | Summary |
|----------|---------|
| **Measurement Labels** | HTML overlay labels showing distance/area values at midpoints and centroids |
| **Live Preview Labels** | Blue-styled labels during measurement placement showing real-time distance |
| **Measurement Preview** | Live preview line showing distance/area during point placement |
| **Constants Extraction** | Magic numbers moved to `src/lib/viewer/constants.ts` |
| **Undo Support** | Ctrl+Z removes last measurement point during placement |
| **Area Confirmation** | Right-click tap confirms area polygon (alternative to closing loop) |
| **Bug Fix** | Removed stale `setSceneManager()` call after state cleanup |

### Measurement Label Feature Details
- **Distance labels**: Show formatted distance at line midpoint (e.g., "24.5 ft")
- **Area labels**: Show total area at centroid, segment lengths at each side midpoint
- **Preview labels**: Blue styling (`bg-blue-500/90`) during placement, dark styling (`bg-neutral-900/90`) for final
- **Distance-based scaling**: Font size scales with camera distance (10-14px range)
- **Hidden in point cloud mode**: Labels follow same visibility rules as other markers

---

## January 28, 2026 - Repositioning Refactor

Refactored annotation and measurement repositioning, improved point cloud mode.

### Changes Made
| Category | Summary |
|----------|---------|
| **UX Simplification** | Removed click-to-relocate, keeping gizmo-only repositioning |
| **Point Cloud Mode** | Markers hidden during point cloud view, transform delta applied on mode switch |
| **Overlay Sync** | Point cloud overlay now syncs transform every frame during gizmo drags |

### Rationale
Click-to-relocate conflicted with the TransformControls gizmo when the crosshair cursor got close to gizmo axes. Gizmo-only repositioning provides cleaner UX.

### What Still Works
- Annotation/measurement selection (clicking markers)
- Gizmo-based repositioning (TransformControls)
- Placement tools (C for comment, D for distance)
- Hover detection (pointer cursor on markers)
- Point cloud visualization mode (markers hidden during transforms)

---

## January 27, 2026 - 4-Engineer Code Review

Comprehensive 4-engineer code review (Senior, Security, Performance, Architect) of the full codebase.

### Review Scores
| Review Type | Score | Critical | High | Medium | Low |
|-------------|-------|----------|------|--------|-----|
| **Senior Engineer** | 9.0/10 | 0 | 1 | 3 | 2 |
| **Security Engineer** | 8.8/10 | 1 | 0 | 2 | 1 |
| **Performance Engineer** | 8.5/10 | 0 | 1 | 2 | 1 |
| **Architect** | 8.7/10 | 0 | 1 | 3 | 2 |

### Issues Fixed (3)
| Category | File | Fix |
|----------|------|-----|
| **P1 Error Handling** | `CameraAnimator.ts` | Wrap `animate()` in try-catch to prevent frozen camera on math errors |
| **P0 Security** | `storage.ts` | Remove anon key fallback - require authenticated session for uploads |
| **P1 Validation** | `ViewerPage.tsx` | Add `isValidPosition` check on measurement points before Supabase persistence |

### New Features on This Branch
- Saved Views (camera waypoints) with save dialog and fly-to animations
- AxisNavigator gizmo with view snapping (front/back/top/bottom/left/right)
- ViewsTab in CollaborationPanel for managing saved views
- CameraAnimator with spherical interpolation for smooth arc transitions

---

## January 26, 2026 - Pre-Merge Review

Comprehensive code review with three specialized engineers before merging to master.

### Review Scores
| Review Type | Score | Critical | High | Medium | Low |
|-------------|-------|----------|------|--------|-----|
| **Senior Engineer** | 8.4/10 → 9.0/10 | 0 | 3 | 6 | 3 |
| **Security Engineer** | 8.2/10 → 9.0/10 | 0 | 0 | 4 | 1 |
| **Performance Engineer** | N/A | 2 | 3 | 4 | 0 |

### Issues Fixed
| Category | Count | Summary |
|----------|-------|---------|
| **Code Quality (P1)** | 4 | Dead code removal, consolidate useEffects, add constants |
| **Performance (P1)** | 1 | Debounce resize listener |
| **Security (P1)** | 2 | Demo user isolation, position validation |

### New Features Added
- Measurement tools (distance, area) with MeasurementRenderer
- MeasurementCalculator for unit conversion and formatting
- HTML icon overlays for annotations and measurement points
- CollaborationPanel with tabbed interface (Annotations / Measurements)
- Keyboard shortcuts (G/R/S for transform, C for comment, D for distance, Delete for removal)

---

## January 26, 2026 - Annotation Panel Cleanup

Code review cleanup following annotation panel UI fixes.

### Issues Fixed
| Category | Count | Summary |
|----------|-------|---------|
| **Critical (P0)** | 16 | Console.error cleanup from viewer and services |
| **High (P1)** | 2 | Unused parameter removal, type duplication fix |

### UI Improvements
- Renamed "Comments" → "Annotations" throughout panel UI
- Added `createdByName` field to display user names instead of UUIDs
- Full annotation persistence to Supabase with real-time sync

---

## January 25, 2026 - Security Review

Comprehensive security and code quality review.

### Issues Fixed
| Category | Count | Summary |
|----------|-------|---------|
| **Critical (P0)** | 4 | Security fixes - secrets, RLS, privilege escalation, auth tokens |
| **High (P1)** | 4 | Console cleanup, dead code removal, disabled unimplemented features |
| **Medium (P2)** | 4 | Missing exports, error handling, dead code cleanup |

### Security Fixes (P0)
1. **Secrets Removed from Git**: Added `.claude/settings.local.json` to `.gitignore`
2. **Privilege Escalation Fix**: `updateProfile` now filters `is_staff`, `account_type`, `id`, `created_at` fields
3. **Storage Upload Token Fix**: XHR upload now uses session access token instead of anon key
4. **RLS Policy Fix**: Measurements and camera_waypoints INSERT policies now verify scan/project membership

---

## January 24, 2026 - Initial Code Review

Comprehensive code review performed by AI agents.

### Issues Fixed
| Category | Count | Summary |
|----------|-------|---------|
| **Critical (P0)** | 7 | Route fixes, type consolidation |
| **High (P1)** | 6 | Service layer, console cleanup |
| **Medium (P2)** | 4 | Accessibility, UI fixes |

### Key Changes
1. **Route Fixes**: All `/portfolio` references updated to `/projects`
2. **Type Consolidation**: Removed duplicate `User` type from AuthContext
3. **Service Layer**: Added workspaces export, improved error handling
4. **Console Cleanup**: Removed 18+ console statements from Viewer3D.tsx and other files
5. **Accessibility**: Added aria-label to user menu button

---

## January 2026 - Platform Foundation

### Supabase Integration
- `@supabase/supabase-js` client with TypeScript
- Full database schema types for all entities
- File upload service with progress tracking and validation
- Demo mode fallback when Supabase not configured

### Authentication System
- AuthModal component with Login/Signup tab switching
- LoginForm with email/password validation
- SignupForm with name/email/password (simplified)
- DemoAccessCard for demo mode access
- Profiles trigger creates personal workspace for staff only

### Gaussian Splat Viewer
- Loads PLY, SPZ, SPLAT, KSPLAT file formats
- Loading progress indicator with percentage
- Orbit controls for camera navigation
- SceneManager abstraction for scene operations
- Role-based tool permissions
- Saved Views (camera waypoints) support

### Initial Implementation
- Marketing pages (Landing, Product, Use Cases, Contact)
- Demo page with project cards
- Projects list with mock data
- Project detail pages
- Mock authentication context with role-based permissions
