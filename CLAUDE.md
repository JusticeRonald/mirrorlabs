# Mirror Labs WebApp - Project Context

## Overview
Web-based 3D collaboration platform for construction and real estate professionals. Enables teams to view, annotate, and share 3D Gaussian Splat scans of job sites.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: shadcn/ui + Tailwind CSS
- **Routing**: React Router v6
- **3D Rendering**: Three.js + @sparkjsdev/spark (Gaussian Splat renderer)
- **Backend**: Supabase (Auth + PostgreSQL + Storage + Realtime)

## Architecture

### Key Directories
```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── viewer/       # 3D viewer components (Viewer3D, Toolbar, Sidebar, etc.)
│   ├── upload/       # File upload components (ScanUploader)
│   └── illustrations/# Marketing page illustrations
├── contexts/
│   ├── AuthContext.tsx    # Supabase auth with demo mode fallback
│   └── ViewerContext.tsx  # 3D viewer state management
├── hooks/
│   └── useProjects.ts     # Projects data hook (Supabase + mock fallback)
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Supabase client configuration
│   │   ├── database.types.ts  # PostgreSQL schema types
│   │   └── services/          # Data access layer
│   │       ├── projects.ts    # Project CRUD operations
│   │       ├── scans.ts       # Scan CRUD operations
│   │       ├── annotations.ts # Annotations, measurements, waypoints
│   │       └── storage.ts     # File upload/download
│   └── viewer/
│       ├── SceneManager.ts     # Three.js scene orchestration
│       └── renderers/          # Gaussian Splat renderer implementations
├── pages/              # Route page components
├── types/
│   ├── user.ts         # User/role types
│   └── viewer.ts       # Viewer state types (includes SavedView)
└── data/
    └── mockProjects.ts # Mock project data (fallback when Supabase not configured)
```

### Key Files
- `src/lib/supabase/client.ts` - Supabase client with environment variable config
- `src/lib/supabase/database.types.ts` - TypeScript types for PostgreSQL schema
- `src/lib/supabase/services/*.ts` - Data access layer for all entities
- `src/lib/viewer/SceneManager.ts` - Manages Three.js scene, objects, annotations, measurements
- `src/lib/viewer/renderers/SparkSplatRenderer.ts` - Spark-based Gaussian Splat renderer
- `src/components/auth/AuthModal.tsx` - Login/signup modal with tab switching
- `src/components/auth/LoginForm.tsx` - Email/password login form
- `src/components/auth/SignupForm.tsx` - User registration form
- `src/components/auth/DemoAccessCard.tsx` - Demo mode access card
- `src/components/viewer/Viewer3D.tsx` - Main 3D canvas component with render loop
- `src/components/upload/ScanUploader.tsx` - Drag-drop file upload component
- `src/contexts/AuthContext.tsx` - Supabase Auth with demo mode fallback
- `src/contexts/ViewerContext.tsx` - State management for viewer (tools, loading, saved views)
- `src/hooks/useProjects.ts` - Projects hook with Supabase/mock data abstraction

### Data Services Layer
All services in `src/lib/supabase/services/` with graceful Supabase fallback:

- **workspaces.ts**: CRUD for workspaces + member management (replaces organizations.ts)
- **projects.ts**: CRUD + member management
- **scans.ts**: CRUD with status tracking (uploading → processing → ready)
- **annotations.ts**: Annotations, replies, measurements, camera waypoints, comments
- **storage.ts**: File upload with progress, validation, signed URLs

## Platform Roadmap

### Backend Architecture: Supabase
Selected as unified backend for rapid development with path to scale:
- **Auth**: Email/password, OAuth, RLS integration
- **Database**: PostgreSQL for relational data (Projects→Scans→Annotations)
- **Storage**: S3-compatible, direct browser upload with RLS
- **Realtime**: Built on Postgres LISTEN/NOTIFY for collaboration

### Admin-Centric Organizational Model
The platform uses an admin-centric model where Mirror Labs staff manages workspace/project creation:

**Model Summary:**
- **Staff** creates and manages all business workspaces
- **Staff** assigns clients as members to workspaces
- **Clients** view/annotate projects in assigned workspaces only
- **Clients** CANNOT create workspaces or projects

**Client Workspace Policy:**
- Clients sign up → profile created → NO workspace
- Staff adds client to business workspace → client can access projects
- Portfolio page shows projects from all assigned workspaces

**Staff Workspace Policy:**
- Staff sign up → personal workspace created (internal sandbox)
- Staff can create business workspaces for clients in Admin UI
- Staff can view all projects across all workspaces

**Terminology Guide:**
| Concept | UI Term | Database | Notes |
|---------|---------|----------|-------|
| Umbrella container | **Workspace** | `workspaces` | Personal or Business type |
| Workspace user link | **Member** | `workspace_members` | Person in a workspace |
| Project user link | **Member** | `project_members` | Person in a project |
| Individual account | **Person/People** | `profiles` | Avoid "user" in UI |
| Mirror Labs employees | **Staff** | `is_staff` flag | Internal team |

### Database Schema
```sql
-- Core Entities
workspaces (id, name, slug, type, owner_id, created_at)  -- type: 'personal' | 'business'
profiles (id, email, name, avatar_url, initials, primary_workspace_id)
workspace_members (workspace_id, user_id, role)

-- Projects & Scans
projects (id, workspace_id, name, description, industry, thumbnail_url, is_archived)
project_members (project_id, user_id, role)
scans (id, project_id, name, file_url, file_type, file_size, splat_count, status)

-- Collaboration (Annotations)
annotations (id, scan_id, type, position_x/y/z, content, status, created_by)
annotation_replies (id, annotation_id, content, created_by)
measurements (id, scan_id, type, points_json, value, unit, label, created_by)
camera_waypoints (id, scan_id, name, position_json, target_json, fov, thumbnail_url)

-- Activity & General Discussion (Future)
comments (id, scan_id, annotation_id, parent_id, content, mentions[], created_by)
activity_log (id, project_id, action, entity_type, entity_id, metadata)
```

#### Collaboration Table Clarification
| Table | Purpose | Usage |
|-------|---------|-------|
| `annotations` | 3D-positioned markers on scans | Main table for viewer annotations (pins, comments with XYZ position) |
| `annotation_replies` | Threaded replies to annotations | Used for discussion threads on specific annotations |
| `comments` | (Future) General scan discussion | Reserved for activity feed / scan-level discussion without 3D position |
| `measurements` | Distance, area, angle measurements | 3D measurement points with calculated values |
| `camera_waypoints` | Saved camera views | Named camera positions for tours / saved views |

**Note:** The `annotations` table stores 3D-positioned comments (with `position_x/y/z`). The `comments` table is reserved for future general discussion features without 3D positioning. Do not confuse the two tables.

### Feature Priority Matrix
| Priority | Feature | Status |
|----------|---------|--------|
| **P0** | Supabase Auth | ✅ Implemented |
| **P0** | Database/Persistence | ✅ Implemented |
| **P0** | File Upload | ✅ Implemented |
| **P1** | Functional Measurements | ✅ Implemented (Jan 2026) |
| **P1** | Annotations/Comments | ✅ Implemented (Jan 2026) |
| **P1** | Camera Waypoints (Saved Views) | ✅ Implemented (Jan 2026) |
| **P2** | SOG Compression | Future |
| **P2** | Real-time Collaboration | ✅ Implemented (Jan 2026) |

### Implementation Phases

**Phase 1: Foundation (Current)**
- ✅ Supabase client configuration
- ✅ Database schema types
- ✅ Auth migration (Supabase + demo mode)
- ✅ File upload component
- ✅ Data layer abstraction (hooks)
- ✅ Deploy Supabase schema (profiles trigger deployed)

**Phase 2: Core Collaboration**
- ✅ Functional measurement tool (distance, area)
- ✅ Annotation system + persistence to Supabase
- ✅ Real-time annotation sync across users
- ✅ Camera waypoints with smooth transitions (Saved Views)
- Basic sharing (public links)

**Phase 3: Scale & Polish**
- SOG compression pipeline (Edge Function)
- Real-time presence indicators
- Notification system
- Export functionality

## Completed Features

### January 2026 - Platform Foundation
- **Supabase Integration**: Auth, database types, storage service
  - `@supabase/supabase-js` client with TypeScript
  - Full database schema types for all entities
  - File upload service with progress tracking and validation
  - Demo mode fallback when Supabase not configured

- **Authentication System**: Full email/password auth with Supabase
  - AuthModal component with Login/Signup tab switching
  - LoginForm with email/password validation
  - SignupForm with name/email/password (simplified, no company field)
  - DemoAccessCard for demo mode access
  - Profiles trigger creates personal workspace for staff only (Admin-Centric Model)
  - Seamless demo mode fallback when Supabase not configured

- **Gaussian Splat Viewer**: Full 3D viewer with Spark renderer
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

## Implementation Decisions

### Backend Platform Choice: Supabase
**Why Not Alternatives:**
- **Firebase**: NoSQL model awkward for hierarchical data (Projects→Scans→Annotations)
- **Custom Backend**: 3-6 months to build what Supabase provides
- **Serverless (Vercel)**: Poor for real-time, connection pooling issues

### Gaussian Splat Renderer Choice
**Decision**: Use `@sparkjsdev/spark` over `@mkkellogg/gaussian-splats-3d`

**Rationale**:
- Spark has cleaner Three.js integration (extends THREE.Object3D)
- Better TypeScript support
- `autoUpdate: true` option handles render loop integration automatically
- Simpler initialization pattern

### File Upload Strategy
**Tiered approach by file size:**
- < 10MB: Optional compression
- 10-50MB: Recommended → SPZ
- 50-200MB: Required → SPZ + LOD generation
- \> 200MB: Required → SOG + chunked LOD + streaming

**Compression Ratios:**
- PLY → SPZ: ~10x smaller, virtually no quality loss
- PLY → SOG: ~10-15x smaller, minimal quality loss

### useEffect Ordering in Viewer3D
The Viewer3D component has specific useEffect ordering requirements:
1. **Canvas setup** (first) - Creates canvas, renderer, scene, camera
2. **Controls setup** - OrbitControls after renderer exists
3. **Splat renderer setup** - SparkRenderer after canvas is ready
4. **Render loop** (last) - Animation loop after all setup complete

### SceneManager Pattern
SceneManager wraps raw Three.js operations to provide:
- Object lifecycle management (add/remove with proper disposal)
- Abstraction over renderer implementation (GaussianSplatRenderer interface)
- Annotation and measurement management (placeholder for future)
- Raycasting utilities

## Environment Configuration

### Required Environment Variables
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
The demo page loads from this directory.

## Supabase Setup (Completed)

### 1. Create Supabase Project ✅
1. Go to https://supabase.com/dashboard
2. Create new project
3. Copy URL and anon key to `.env`

### 2. Deploy Schema ✅
- Profiles table with trigger for automatic user creation on signup
- SQL migration files in `supabase/migrations/`

### 3. Configure Storage ✅
- Storage service implemented in `src/lib/supabase/services/storage.ts`
- File upload with XHR progress tracking
- File validation with size limits:
  - PLY: 2GB max
  - SPZ/SPLAT/KSPLAT/PCSOGS: 500MB each
- Thumbnail upload support
- Signed URL generation for private files

**Bucket Setup (if not done):**
1. Create `scans` bucket in Supabase Storage
2. Configure RLS policies for authenticated uploads

### 4. Enable Auth ✅
- Email/password provider configured
- OAuth providers: pending
- Redirect URLs: configured for localhost

### Account Types & Permissions (Admin-Centric Model)
Three account types with different permission levels:
- **Staff**: Full access - upload scans, create projects, manage workspaces
  - Detected via `@mirrorlabs3d.com` email domain OR `is_staff` profile flag
  - Can see all workspaces in Admin → Workspaces
  - Gets personal workspace on signup (internal sandbox)
- **Client**: View/annotate access to assigned workspaces only
  - NO workspace created on signup (profile only)
  - Staff adds client to workspaces via Admin UI
  - Cannot create projects or upload scans
- **Demo**: Full demo mode features without real data persistence

**Implementation**: `src/contexts/AuthContext.tsx`
- `handle_new_user` trigger creates profile for all users
- Only staff gets personal workspace on signup
- Clients wait to be added to workspaces by staff
- Generates initials from name via `generate_initials` function
- Session persistence with auth state subscription

**RLS Enforcement** (Database Level):
- `workspaces` INSERT: Staff only
- `projects` INSERT: Staff or workspace editors
- `projects` SELECT: Workspace members or staff

## Development Status & Next Steps

### Current State (January 2026)
- ✅ Supabase Auth with email/password + demo mode fallback
- ✅ Admin-Centric organizational model (staff manages workspaces/projects)
- ✅ 3D Gaussian Splat Viewer with Spark renderer
- ✅ File upload with validation and progress tracking
- ✅ Data services layer for all entities
- ✅ Account type permissions (Staff/Client/Demo) with RLS enforcement
- ✅ Admin UI: Workspaces (business) + People pages
- ✅ Code review cleanup (January 24, 2026)
- ✅ Security review & cleanup (January 25, 2026)
- ✅ WASM raycasting guard fix for annotation placement (January 25, 2026)
- ✅ Annotation persistence to Supabase (January 26, 2026)
- ✅ Real-time annotation sync via Supabase Realtime (January 26, 2026)
- ✅ Measurement tools (distance, area) with MeasurementRenderer (January 26, 2026)
- ✅ CollaborationPanel with tabbed interface (January 26, 2026)
- ✅ Keyboard shortcuts (G/R/S for transform, C/D for tools, Delete for removal)
- ✅ Saved Views (camera waypoints) with fly-to animations (January 27, 2026)
- ✅ AxisNavigator gizmo with view snapping (January 27, 2026)
- ✅ 4-engineer code review with targeted fixes (January 27, 2026)

### Next Priority (P1 Features)
- [x] Functional measurement tool (distance, area)
- [x] Annotation system with persistence and real-time sync
- [x] Camera waypoints with smooth transitions (Saved Views)
- [ ] Basic sharing (public links)
- [ ] Measurement persistence to Supabase (currently local-only)

### Branch Status
Development on `gaussian-splat-viewer` branch, regularly merged to `master`. Both branches are in sync as of January 27, 2026.

### To Resume Development
1. Run `npm run dev` to start dev server
2. Check this file's "Next Priority" section for pending work
3. Use demo mode (no Supabase config needed) for local development

## Code Review Summary (January 27, 2026)

Comprehensive 4-engineer code review (Senior, Security, Performance, Architect) of the full codebase:

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
| **P0 Security** | `storage.ts` | Remove anon key fallback — require authenticated session for uploads |
| **P1 Validation** | `ViewerPage.tsx` | Add `isValidPosition` check on measurement points before Supabase persistence |

### Verified — No Fix Needed
- **MeasurementRenderer.ts** — `dispose()` already exists with `removeEventListener('resize', ...)`
- **annotation_replies RLS** — Policies exist in `schema.sql` (lines 500-516)
- **Viewer3D.tsx ref pattern** — Intentional design to prevent stale closures

### Known Technical Debt (Documented, Not Fixed)
| # | Category | Issue | Risk |
|---|----------|-------|------|
| 1 | Architecture | ViewerPage.tsx 1,371 lines | Med |
| 2 | Performance | N+1 query in getWorkspaces() | Med |
| 3 | Performance | annotation_replies subscription unfiltered | Low |
| 4 | Architecture | No centralized keyboard shortcut system | Low |
| 5 | Testing | No test framework or tests | Med |
| 6 | Code Quality | Viewer3D ref callback pattern | Low |
| 7 | Code Quality | Console logging in AuthContext (~10 stmts) | Low |
| 8 | Code Quality | Duplicate UUID validation across services | Low |
| 9 | Code Quality | Dead deprecated methods in SceneManager | Low |
| 10 | TypeScript | Strict mode disabled project-wide | Low |

### New Features on This Branch
- Saved Views (camera waypoints) with save dialog and fly-to animations
- AxisNavigator gizmo with view snapping (front/back/top/bottom/left/right)
- ViewsTab in CollaborationPanel for managing saved views
- CameraAnimator with spherical interpolation for smooth arc transitions

### Files Modified
- `src/lib/viewer/CameraAnimator.ts` — Try-catch in animate(), spherical lerp
- `src/lib/supabase/services/storage.ts` — Session-only auth for uploads
- `src/pages/ViewerPage.tsx` — Measurement validation, saved views integration
- `src/components/viewer/AxisNavigator.tsx` — View snapping improvements
- `src/components/viewer/CollaborationPanel.tsx` — Saved Views tab

### New Files
- `src/components/viewer/AxisNavigator.tsx` — 3D axis navigation gizmo
- `src/components/viewer/SaveViewDialog.tsx` — Dialog for naming saved views
- `src/components/viewer/ViewsTab.tsx` — Saved views list in CollaborationPanel

### Branch Status
- `gaussian-splat-viewer` merged to `master` (January 27, 2026)

---

## Code Review Summary (January 26, 2026 - Pre-Merge)

Comprehensive code review with three specialized engineers before merging to master:

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

### Changes Made
1. **Viewer3D.tsx**: Consolidated drag state useEffects (prevents race conditions)
2. **AnnotationRenderer.ts**: Removed dead `addReplyBadge` and `updateReplyBadge` methods
3. **MeasurementsTab.tsx**: Use `AREA_UNIT_DISPLAY` constant instead of hardcoded template literal
4. **MeasurementRenderer.ts**: Added 100ms debounce to resize handler
5. **ViewerPage.tsx**: Demo user session isolation (unique session IDs), position coordinate validation

### New Features Added
- Measurement tools (distance, area) with MeasurementRenderer
- MeasurementCalculator for unit conversion and formatting
- HTML icon overlays for annotations and measurement points
- CollaborationPanel with tabbed interface (Annotations / Measurements)
- Keyboard shortcuts (G/R/S for transform, C for comment, D for distance, Delete for removal)

### Files Modified
- `src/components/viewer/Viewer3D.tsx` - Drag useEffect consolidation
- `src/lib/viewer/AnnotationRenderer.ts` - Dead code removal
- `src/components/viewer/MeasurementsTab.tsx` - Use constant for units
- `src/lib/viewer/MeasurementRenderer.ts` - Debounce resize
- `src/pages/ViewerPage.tsx` - Demo user isolation, position validation

### New Files
- `src/components/viewer/CollaborationPanel.tsx` - Tabbed panel for annotations/measurements
- `src/components/viewer/MeasurementMarker.tsx` - HTML overlay for measurement points
- `src/components/viewer/MeasurementsTab.tsx` - Measurements list UI
- `src/lib/viewer/MeasurementCalculator.ts` - Distance/area calculations
- `src/lib/viewer/MeasurementRenderer.ts` - 3D measurement line rendering

### Deleted Files
- `src/components/viewer/ViewerSidebar.tsx` - Replaced by CollaborationPanel

### Branch Status
- `gaussian-splat-viewer` merged to `master`

---

## Code Review Summary (January 26, 2026)

Code review cleanup following annotation panel UI fixes:

### Issues Fixed
| Category | Count | Summary |
|----------|-------|---------|
| **Critical (P0)** | 16 | Console.error cleanup from viewer and services |
| **High (P1)** | 2 | Unused parameter removal, type duplication fix |

### Console Cleanup (P0)
Removed console.error statements for cleaner production code:
1. **ViewerPage.tsx**: 9 console.error statements removed (annotation save/update/delete error logging)
2. **annotations.ts**: 4 console.error statements removed (fetch operations)
3. **markups.ts**: 3 console.error statements removed (fetch operations)

### Code Quality Fixes (P1)
1. **Unused Parameter Removed**: `handleAnnotationReply` no longer accepts unused `createdBy` parameter
2. **Type Duplication Fixed**: `AnnotationRenderer.ts` now imports `AnnotationType` and `AnnotationStatus` from `@/types/viewer` instead of defining locally

### Files Modified
- `src/pages/ViewerPage.tsx` - Console cleanup, unused param fix
- `src/lib/supabase/services/annotations.ts` - Console cleanup
- `src/lib/supabase/services/markups.ts` - Console cleanup
- `src/lib/viewer/AnnotationRenderer.ts` - Type imports from viewer.ts

### UI Improvements (Previous Session)
- Renamed "Comments" → "Annotations" throughout panel UI
- Added `createdByName` field to display user names instead of UUIDs
- Full annotation persistence to Supabase with real-time sync

### Quality Score
- **Before**: 8.8/10
- **After**: 9.2/10 (estimated)

---

## Code Review Summary (January 25, 2026)

Comprehensive security and code quality review with the following cleanup:

### Issues Fixed
| Category | Count | Summary |
|----------|-------|---------|
| **Critical (P0)** | 4 | Security fixes - secrets, RLS, privilege escalation, auth tokens |
| **High (P1)** | 4 | Console cleanup, dead code removal, disabled unimplemented features |
| **Medium (P2)** | 4 | Missing exports, error handling, dead code cleanup |

### Security Fixes (P0)
1. **Secrets Removed from Git**: Added `.claude/settings.local.json` to `.gitignore` and removed from tracking
2. **Privilege Escalation Fix**: `updateProfile` now filters `is_staff`, `account_type`, `id`, `created_at` fields
3. **Storage Upload Token Fix**: XHR upload now uses session access token instead of anon key
4. **RLS Policy Fix**: Measurements and camera_waypoints INSERT policies now verify scan/project membership

### High Priority Fixes (P1)
1. **Console Cleanup**: Removed 20+ console statements from `SparkSplatRenderer.ts`
2. **Dead Code Removal**: Removed unimplemented `archiveWorkspace` function
3. **CTA Form Disabled**: Email form now shows "Coming Soon" instead of non-functional form
4. **Debug Log Removed**: Removed debug console.log from `ViewerPage.tsx`

### Code Quality Fixes (P2)
1. **Missing Export Added**: `usePermissions` hook now exported from `hooks/index.ts`
2. **Dead Code Deleted**: Removed unused `AppLayout.tsx` component
3. **Legacy Exports Removed**: Removed `AdminClients` aliases from `pages/admin/index.ts`
4. **Error Handling Added**: `useViewPreference.ts` now logs errors in development mode

### Files Modified
- `.gitignore` - Added `.claude/settings.local.json`
- `src/contexts/AuthContext.tsx` - Privilege escalation fix
- `src/lib/supabase/services/storage.ts` - Auth token fix
- `supabase/schema.sql` - RLS policy fixes for measurements + camera_waypoints
- `src/lib/viewer/renderers/SparkSplatRenderer.ts` - Console cleanup
- `src/lib/supabase/services/workspaces.ts` - Removed archiveWorkspace
- `src/components/CTA.tsx` - Disabled form with "Coming Soon"
- `src/pages/ViewerPage.tsx` - Removed debug log
- `src/hooks/index.ts` - Added usePermissions export
- `src/components/AppLayout.tsx` - Deleted (unused)
- `src/pages/admin/index.ts` - Removed legacy exports
- `src/hooks/useViewPreference.ts` - Added error logging

### Quality Score
- **Before**: 7.5/10
- **After**: 8.8/10 (estimated)

### Remaining Technical Debt (P3 - Future Sprint)
- Verbose auth context logging (AuthContext.tsx lines 288-300)
- Missing JSDoc documentation across services
- Hardcoded values in Profile page

---

## Code Review Summary (January 24, 2026)

Comprehensive code review performed by AI agents with the following cleanup:

### Issues Fixed
| Category | Count | Summary |
|----------|-------|---------|
| **Critical (P0)** | 7 | Route fixes, type consolidation |
| **High (P1)** | 6 | Service layer, console cleanup |
| **Medium (P2)** | 4 | Accessibility, UI fixes |

### Key Changes
1. **Route Fixes**: All `/portfolio` references updated to `/projects` (deleted page cleanup)
2. **Type Consolidation**: Removed duplicate `User` type from AuthContext, now imports from `@/types/user`
3. **Deprecated Export Removed**: `currentUser` export removed from types/user.ts
4. **Service Layer**: Added workspaces export, improved error handling in annotations/projects/workspaces
5. **Console Cleanup**: Removed 18+ console statements from Viewer3D.tsx and other files
6. **Accessibility**: Added aria-label to user menu button
7. **UI Fixes**: Disabled unimplemented export buttons, fixed hardcoded layer count

### Files Modified
- `src/components/HomeRedirect.tsx` - Route fix
- `src/components/Navigation.tsx` - Route fixes
- `src/components/admin/AdminGuard.tsx` - Route fix
- `src/pages/Profile.tsx` - Route fixes
- `src/pages/Projects.tsx` - Removed deprecated import, updated fallbacks
- `src/contexts/AuthContext.tsx` - Type consolidation
- `src/types/user.ts` - Removed deprecated export
- `src/lib/supabase/services/index.ts` - Added workspaces export
- `src/lib/supabase/services/workspaces.ts` - Error handling, type fix
- `src/lib/supabase/services/annotations.ts` - Error handling
- `src/lib/supabase/services/projects.ts` - Error handling
- `src/components/viewer/Viewer3D.tsx` - Console cleanup
- `src/components/CTA.tsx` - Console cleanup
- `src/components/viewer/ViewerSharePanel.tsx` - Console cleanup, disabled buttons
- `src/components/viewer/ViewerSidebar.tsx` - Fixed hardcoded count
- `src/components/AppNavigation.tsx` - Accessibility fix

### Quality Score
- **Before**: 7.3/10
- **After**: 8.5/10 (estimated)

## Future Evolution: Self-Service Client Model

The Admin-Centric model is designed to evolve toward client self-service when needed:

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
