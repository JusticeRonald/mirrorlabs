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

## Platform Roadmap

### Backend Architecture: Supabase
Selected as unified backend for rapid development with path to scale:
- **Auth**: Email/password, OAuth, RLS integration
- **Database**: PostgreSQL for relational data (Projects→Scans→Annotations)
- **Storage**: S3-compatible, direct browser upload with RLS
- **Realtime**: Built on Postgres LISTEN/NOTIFY for collaboration

### Database Schema
```sql
-- Core Entities
organizations (id, name, slug, created_at)
profiles (id, email, name, avatar_url, initials)
org_members (org_id, user_id, role)

-- Projects & Scans
projects (id, org_id, name, description, industry, thumbnail_url, is_archived)
project_members (project_id, user_id, role)
scans (id, project_id, name, file_url, file_type, file_size, splat_count, status)

-- Collaboration
annotations (id, scan_id, type, position_x/y/z, content, status, created_by)
annotation_replies (id, annotation_id, content, created_by)
measurements (id, scan_id, type, points_json, value, unit, label, created_by)
camera_waypoints (id, scan_id, name, position_json, target_json, fov, thumbnail_url)

-- Activity
comments (id, scan_id, annotation_id, parent_id, content, mentions[], created_by)
activity_log (id, project_id, action, entity_type, entity_id, metadata)
```

### Feature Priority Matrix
| Priority | Feature | Status |
|----------|---------|--------|
| **P0** | Supabase Auth | ✅ Implemented |
| **P0** | Database/Persistence | ✅ Types & Services Ready |
| **P0** | File Upload | ✅ Component Ready |
| **P1** | Functional Measurements | Pending |
| **P1** | Annotations/Comments | Pending |
| **P1** | Camera Waypoints (Saved Views) | ✅ Types Ready |
| **P2** | SOG Compression | Future |
| **P2** | Real-time Collaboration | Future |

### Implementation Phases

**Phase 1: Foundation (Current)**
- ✅ Supabase client configuration
- ✅ Database schema types
- ✅ Auth migration (Supabase + demo mode)
- ✅ File upload component
- ✅ Data layer abstraction (hooks)
- ✅ Deploy Supabase schema (profiles trigger deployed)

**Phase 2: Core Collaboration**
- Functional measurement tool
- Annotation system + comments
- Camera waypoints with transitions
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
  - SignupForm with password confirmation
  - DemoAccessCard for demo mode access
  - Profiles table trigger for automatic user creation on signup
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

### 3. Configure Storage (Pending)
1. Create `scans` bucket
2. Set public access policy or use signed URLs
3. Configure RLS for upload permissions

### 4. Enable Auth ✅
- Email/password provider configured
- OAuth providers: pending
- Redirect URLs: configured for localhost

## Known Issues

### Auth Modal Content Shift
When switching between Login and Signup tabs in the AuthModal, the modal content shifts slightly due to different form heights. This is a cosmetic issue deferred for future polish.
