# Mirror Labs WebApp - Phase 1

Web-based 3D collaboration platform for construction and real estate.

## Tech Stack
- React 18 + TypeScript + Vite
- shadcn/ui + Tailwind CSS
- React Router
- Three.js (3D rendering)
- @sparkjsdev/spark (Gaussian Splat rendering)

## Development
```bash
npm install
npm run dev
```

## Pages
- Landing (/)
- Product (/product)
- Use Cases (/use-cases)
- Contact (/contact)
- Demo (/demo)
- My Projects (/projects) - Mock data
- Project Detail (/projects/:id) - Mock data
- Viewer (/viewer/:id) - 3D Gaussian Splat viewer

## 3D Viewer
The viewer supports loading and displaying Gaussian Splat files with:
- Multiple file formats: PLY, SPZ, SPLAT, KSPLAT
- Orbit camera controls for navigation
- Loading progress indicator
- Role-based tool permissions (measure, annotate, export, share)
- Toolbar with navigation, measurement, and annotation tools

## Current State
Fully functional platform with:
- **Authentication**: Supabase email/password auth with demo mode fallback
- **3D Viewer**: Gaussian Splat rendering with PLY, SPZ, SPLAT, KSPLAT support
- **Backend**: Supabase (PostgreSQL + Storage + Realtime)
- **Demo Mode**: Works without Supabase configuration using mock data

## Environment Setup
Copy `.env.example` to `.env` and add your Supabase credentials:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Without Supabase configured, the app runs in demo mode with mock data.
