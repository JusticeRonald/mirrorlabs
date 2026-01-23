# Mirror Labs WebApp - Project Context

## Overview
Web-based 3D collaboration platform for construction and real estate professionals. Enables teams to view, annotate, and share 3D Gaussian Splat scans of job sites.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: shadcn/ui + Tailwind CSS
- **Routing**: React Router v6
- **3D Rendering**: Three.js + @sparkjsdev/spark (Gaussian Splat renderer)

## Architecture

### Key Directories
```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── viewer/       # 3D viewer components (Viewer3D, Toolbar, Sidebar, etc.)
│   └── illustrations/# Marketing page illustrations
├── contexts/
│   ├── AuthContext.tsx    # Mock auth state
│   └── ViewerContext.tsx  # 3D viewer state management
├── lib/
│   └── viewer/
│       ├── SceneManager.ts     # Three.js scene orchestration
│       └── renderers/          # Gaussian Splat renderer implementations
├── pages/              # Route page components
├── types/
│   ├── user.ts         # User/role types
│   └── viewer.ts       # Viewer state types
└── data/
    └── mockProjects.ts # Mock project data
```

### Key Files
- `src/lib/viewer/SceneManager.ts` - Manages Three.js scene, objects, annotations, measurements, and splat loading
- `src/lib/viewer/renderers/SparkSplatRenderer.ts` - Spark-based Gaussian Splat renderer implementation
- `src/components/viewer/Viewer3D.tsx` - Main 3D canvas component with render loop
- `src/contexts/ViewerContext.tsx` - State management for viewer (tools, loading state, metadata)
- `src/pages/ViewerPage.tsx` - Viewer page with layout (header, sidebar, toolbar)
- `src/types/viewer.ts` - TypeScript types for viewer state, tools, and splat loading

## Completed Features

### January 2026
- **Gaussian Splat Viewer**: Full 3D viewer with Spark renderer integration
  - Loads PLY, SPZ, SPLAT, KSPLAT file formats
  - Loading progress indicator with percentage
  - Orbit controls for camera navigation
  - SceneManager abstraction for scene operations
  - Role-based tool permissions

### Initial Implementation
- Marketing pages (Landing, Product, Use Cases, Contact)
- Demo page with project cards
- Projects list with mock data
- Project detail pages
- Mock authentication context with role-based permissions

## Implementation Decisions

### Gaussian Splat Renderer Choice
**Decision**: Use `@sparkjsdev/spark` over `@mkkellogg/gaussian-splats-3d`

**Rationale**:
- Spark has cleaner Three.js integration (extends THREE.Object3D)
- Better TypeScript support
- `autoUpdate: true` option handles render loop integration automatically
- Simpler initialization pattern

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

## Known Issues / TODOs

### Current Limitations
- No backend integration (all data is mock)
- No real authentication (mock auth context only)
- Measurement and annotation tools are UI-only (not functional)
- No splat file upload (loads from public/splats/ directory)

### Future Work
- Implement measurement tool functionality
- Add annotation persistence
- Backend API integration
- Real authentication flow
- Splat file upload/management
- Multi-user collaboration

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
