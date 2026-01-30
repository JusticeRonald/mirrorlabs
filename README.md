# Mirror Labs WebApp

Web-based 3D collaboration platform for construction and real estate professionals. Enables teams to view, annotate, and share 3D Gaussian Splat scans of job sites.

## Tech Stack
- React 18 + TypeScript + Vite
- shadcn/ui + Tailwind CSS
- React Router v6
- Three.js (3D rendering)
- @sparkjsdev/spark (Gaussian Splat rendering)
- Supabase (Auth + PostgreSQL + Storage + Realtime)

## Development
```bash
npm install
npm run dev
npm run build    # Production build
npm run lint     # Run ESLint
```

## Pages
- Landing (/)
- Product (/product)
- Use Cases (/use-cases)
- Contact (/contact)
- Demo (/demo)
- My Projects (/projects)
- Project Detail (/projects/:id)
- 3D Viewer (/viewer/:projectId/:scanId)
- Profile (/profile)
- Dashboard (/dashboard)
- Admin: Workspaces (/admin/workspaces)
- Admin: People (/admin/people)

## 3D Viewer
The viewer supports loading and displaying Gaussian Splat files with:
- **File formats**: PLY, SPZ, SPLAT, KSPLAT
- **Camera controls**: Orbit navigation with smooth animations
- **Annotations**: 3D-positioned pins and comments with real-time sync via Supabase Realtime
- **Measurements**: Distance and area tools with gizmo-based point repositioning
- **Measurement Labels**: Live distance/area values displayed at line midpoints and polygon centroids
- **Saved Views**: Camera waypoints with fly-to animations
- **Axis Navigator**: 3D gizmo for snapping to orthographic views (front/back/top/bottom/left/right)
- **Collaboration Panel**: Tabbed interface for annotations, measurements, and saved views
- **Transform tools**: Translate, rotate, scale with keyboard shortcuts (G/R/S)
- **Keyboard shortcuts**: C (comment), D (distance), V (reset view), T (grid), Delete (remove selected)
- Role-based tool permissions

## Admin-Centric Model
Mirror Labs staff manages workspace and project creation. Clients are assigned to workspaces by staff and can view/annotate projects in their assigned workspaces only.

## Current State
Fully functional platform with:
- **Authentication**: Supabase email/password auth with demo mode fallback
- **3D Viewer**: Gaussian Splat rendering with annotations, measurements, saved views, and collaboration
- **Real-time Sync**: Annotation changes broadcast to all connected viewers via Supabase Realtime
- **Backend**: Supabase (PostgreSQL + Storage + Realtime + RLS enforcement)
- **Admin UI**: Workspace and people management for staff
- **Demo Mode**: Works without Supabase configuration using mock data

## Environment Setup
Copy `.env.example` to `.env` and add your Supabase credentials:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Without Supabase configured, the app runs in demo mode with mock data.
