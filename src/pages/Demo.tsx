import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import Navigation from "@/components/Navigation";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import Viewer3D from "@/components/viewer/Viewer3D";
import ViewerLoadingOverlay from "@/components/viewer/ViewerLoadingOverlay";
import ViewerToolbar from "@/components/viewer/ViewerToolbar";
import ViewerSidebar from "@/components/viewer/ViewerSidebar";
import ViewerHeader from "@/components/viewer/ViewerHeader";
import type { SplatLoadProgress, SplatLoadError, Measurement, Annotation, ViewMode } from "@/types/viewer";
import { ROLE_PERMISSIONS } from "@/types/user";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProjectsByIndustry, featuredProject, featuredScan, type Project } from "@/data/mockProjects";
import { Building2, Home, Landmark, Layers } from "lucide-react";
import { useScrollAnimation, useStaggerAnimation } from "@/hooks/use-scroll-animation";

// Demo placeholder data to show what the full viewer experience looks like
const demoMeasurements: Measurement[] = [
  {
    id: 'demo-1',
    type: 'distance',
    value: 3.45,
    unit: 'm',
    label: 'Wall to window',
    points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(3.45, 0, 0)],
    createdBy: 'Demo User',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    type: 'area',
    value: 12.8,
    unit: 'm²',
    label: 'Floor section',
    points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(4, 0, 0), new THREE.Vector3(4, 0, 3.2), new THREE.Vector3(0, 0, 3.2)],
    createdBy: 'Demo User',
    createdAt: new Date().toISOString(),
  },
];

const demoAnnotations: Annotation[] = [
  {
    id: 'demo-a1',
    type: 'comment',
    content: 'Check electrical outlet placement',
    position: new THREE.Vector3(1, 1.2, 0),
    createdBy: 'Demo User',
    createdAt: new Date().toISOString(),
    replies: [
      { id: 'r1', content: 'Will verify on site visit', createdBy: 'Contractor', createdAt: new Date().toISOString() },
      { id: 'r2', content: 'Confirmed placement is correct', createdBy: 'Engineer', createdAt: new Date().toISOString() },
    ],
  },
  {
    id: 'demo-a2',
    type: 'pin',
    content: 'Confirm ceiling height with contractor',
    position: new THREE.Vector3(2, 2.5, 1),
    createdBy: 'Demo User',
    createdAt: new Date().toISOString(),
    replies: [],
  },
];

type IndustryTab = 'construction' | 'real-estate' | 'cultural';

const industryConfig = {
  construction: {
    label: "Construction",
    icon: Building2,
    description: "Active job sites, MEP coordination, and progress documentation"
  },
  'real-estate': {
    label: "Real Estate",
    icon: Home,
    description: "Property listings, virtual tours, and space planning"
  },
  cultural: {
    label: "Cultural & Hospitality",
    icon: Landmark,
    description: "Museums, galleries, hotels, and tourism venues"
  }
};

const Demo = () => {
  const [activeTab, setActiveTab] = useState<IndustryTab>("construction");
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<SplatLoadProgress | null>(null);
  const [loadError, setLoadError] = useState<SplatLoadError | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('solid');
  const viewerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fixed demo project/scan - not changeable by user interaction
  const demoProject = featuredProject;
  const demoScan = featuredScan;

  // Demo permissions (viewer role - limited capabilities)
  const demoPermissions = ROLE_PERMISSIONS['viewer'];

  // Handlers for toolbar (read-only mode - these are mostly no-ops for demo)
  const handleToolChange = useCallback((tool: string | null) => {
    setActiveTool(tool);
  }, []);

  const handleToggleGrid = useCallback(() => {
    setShowGrid(prev => !prev);
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleResetView = useCallback(() => {
    // Reset view would be handled by the 3D viewer
  }, []);

  const handleShare = useCallback(() => {
    // Demo share action
  }, []);

  const handleExport = useCallback(() => {
    // Demo export action
  }, []);

  const { ref: galleryHeaderRef, isVisible: galleryHeaderVisible } = useScrollAnimation();
  const { ref: galleryRef, isVisible: galleryVisible } = useScrollAnimation({ threshold: 0.1 });
  const staggerDelays = useStaggerAnimation(3, 100);

  // Get projects for current tab (limit to 3)
  const currentProjects = getProjectsByIndustry(activeTab).slice(0, 3);

  // Navigate to full ViewerPage
  const handleViewProject = (project: Project) => {
    const firstScan = project.scans[0];
    if (firstScan) {
      navigate(`/viewer/${project.id}/${firstScan.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section with Featured Demo */}
      <section ref={viewerRef} className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block mb-6 px-4 py-2 rounded-full bg-card border border-border">
              <span className="text-primary text-sm font-medium">Interactive Demo</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-heading mb-6 text-foreground">
              Experience Collaboration
              <br />
              <span className="text-mirror-amber-400">Without Confusion</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
              See how distributed teams use Mirror Labs to measure, annotate, and align on spatial
              decisions in real time—no travel required.
            </p>
          </div>

          {/* Featured Demo Viewport */}
          <div className="relative group">
            <div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
              {/* 3D Viewport - Live Three.js Scene with full viewer UI */}
              <div className="h-[600px] min-h-[500px] max-h-[80vh] bg-gradient-to-br from-secondary via-background to-secondary relative overflow-hidden">
                {/* Viewer Header - Demo variant */}
                <ViewerHeader
                  project={demoProject}
                  scan={demoScan}
                  userRole="viewer"
                  onShare={handleShare}
                  variant="demo"
                />

                {/* Viewer Sidebar - with demo placeholder data */}
                <ViewerSidebar
                  measurements={demoMeasurements}
                  annotations={demoAnnotations}
                  permissions={demoPermissions}
                  defaultCollapsed={true}
                  readOnly={true}
                />

                {/* 3D Canvas */}
                <Viewer3D
                  className="w-full h-full"
                  splatUrl="/splats/demo.ply"
                  showGrid={showGrid}
                  viewMode={viewMode}
                  activeTool={activeTool}
                  enableZoom={false}
                  onSplatLoadStart={() => {
                    setIsLoading(true);
                    setLoadProgress(null);
                    setLoadError(null);
                  }}
                  onSplatLoadProgress={(progress) => setLoadProgress(progress)}
                  onSplatLoadComplete={() => setIsLoading(false)}
                  onSplatLoadError={(err) => {
                    setIsLoading(false);
                    setLoadError({ message: err.message });
                  }}
                />

                {/* Loading Overlay */}
                <ViewerLoadingOverlay
                  isLoading={isLoading}
                  progress={loadProgress}
                  error={loadError}
                />

                {/* Viewer Toolbar - simplified demo variant */}
                <ViewerToolbar
                  activeTool={activeTool}
                  onToolChange={handleToolChange}
                  permissions={demoPermissions}
                  showGrid={showGrid}
                  onToggleGrid={handleToggleGrid}
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                  onResetView={handleResetView}
                  onShare={handleShare}
                  onExport={handleExport}
                  variant="demo"
                />
              </div>

              {/* Viewport Footer */}
              <div className="bg-secondary/30 border-t border-border px-6 py-4">
                <p className="text-muted-foreground text-sm">
                  This is a live 3D Gaussian Splat viewer. Use your mouse to rotate (drag) and pan (right-click drag)
                  to explore the scene. Scroll zoom is disabled to prevent page scroll conflicts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Projects Gallery */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 gradient-mesh opacity-50" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Gallery Header */}
          <div
            ref={galleryHeaderRef}
            className={`text-center mb-12 transition-all duration-700 ${galleryHeaderVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
          >
            <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground mb-4">Sample Projects</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Explore real-world captures across industries. Click 'View Project' to open the full viewer.
            </p>
          </div>

          {/* Industry Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as IndustryTab)} className="mb-8">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 bg-card border border-border">
              {(Object.keys(industryConfig) as IndustryTab[]).map((key) => {
                const config = industryConfig[key];
                const Icon = config.icon;
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Tab Description */}
            <div className="text-center mt-4 mb-8">
              <p className="text-sm text-muted-foreground">
                {industryConfig[activeTab].description}
              </p>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              <div ref={galleryRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {currentProjects.map((project, index) => (
                  <Card
                    key={project.id}
                    style={staggerDelays[index]?.style || {}}
                    className={`group bg-card border-border hover:border-primary/30 transition-all duration-300 card-lift overflow-hidden ${galleryVisible ? 'opacity-100 translate-y-0 animate-tilt-in' : 'opacity-0 translate-y-10'
                      }`}
                  >
                    <CardContent className="p-0">
                      {/* Thumbnail */}
                      <div className="aspect-video relative overflow-hidden">
                        <img
                          src={project.thumbnail}
                          alt={project.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-60" />
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-card/80 text-foreground border-border text-xs">
                            {project.scans.length} {project.scans.length === 1 ? 'scan' : 'scans'}
                          </Badge>
                        </div>
                        {/* Scan count badge */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-card/80 text-xs">
                          <Layers className="w-3 h-3 text-primary" />
                          <span className="text-foreground">{project.scanCount} captures</span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="text-foreground font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-1">
                          {project.name}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{project.description}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                          onClick={() => handleViewProject(project)}
                        >
                          View Project
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {currentProjects.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">No projects found for this category.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA Section - Demo variant with unique messaging */}
      <CTA variant="demo" />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Demo;
