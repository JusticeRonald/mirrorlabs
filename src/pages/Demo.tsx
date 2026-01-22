import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import Viewer3D from "@/components/viewer/Viewer3D";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProjectsByIndustry, featuredProject, featuredScan, type Scan, type Project } from "@/data/mockProjects";
import { Ruler, MapPin, Share2, Download, Building2, Home, Landmark, Layers } from "lucide-react";
import { useScrollAnimation, useStaggerAnimation } from "@/hooks/use-scroll-animation";

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
  const [selectedProject, setSelectedProject] = useState<Project>(featuredProject);
  const [selectedScan, setSelectedScan] = useState<Scan>(featuredScan);
  const viewerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { ref: galleryHeaderRef, isVisible: galleryHeaderVisible } = useScrollAnimation();
  const { ref: galleryRef, isVisible: galleryVisible } = useScrollAnimation({ threshold: 0.1 });
  const staggerDelays = useStaggerAnimation(3, 100);

  // Get projects for current tab (limit to 3)
  const currentProjects = getProjectsByIndustry(activeTab).slice(0, 3);

  // Handle project/scan selection for inline viewer preview
  const handleScanSelect = (project: Project, scan: Scan) => {
    setSelectedProject(project);
    setSelectedScan(scan);
    // Scroll to viewer
    viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
              {/* Viewport Header */}
              <div className="bg-secondary/30 border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                    <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                    <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                  </div>
                  <span className="text-foreground font-semibold">{selectedProject.name}</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {selectedScan.name}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground text-sm">Last updated: {selectedScan.date}</span>
                </div>
              </div>

              {/* 3D Viewport - Live Three.js Scene */}
              <div className="aspect-video bg-gradient-to-br from-secondary via-background to-secondary relative overflow-hidden">
                <Viewer3D className="w-full h-full" />

                {/* Bottom Toolbar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-md border border-border rounded-xl px-6 py-3 shadow-xl">
                  <div className="flex items-center space-x-6">
                    <button className="flex flex-col items-center space-y-1 text-primary hover:text-primary/80 transition-colors">
                      <Ruler className="w-5 h-5" />
                      <span className="text-xs">Measure</span>
                    </button>
                    <button className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-primary transition-colors">
                      <MapPin className="w-5 h-5" />
                      <span className="text-xs">Annotate</span>
                    </button>
                    <button className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-primary transition-colors">
                      <Share2 className="w-5 h-5" />
                      <span className="text-xs">Share</span>
                    </button>
                    <button className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-primary transition-colors">
                      <Download className="w-5 h-5" />
                      <span className="text-xs">Export</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport Footer */}
              <div className="bg-secondary/30 border-t border-border px-6 py-4">
                <p className="text-muted-foreground text-sm">
                  This is a live Three.js 3D viewer. Use your mouse to rotate (drag), zoom (scroll),
                  and explore the scene. Full measurement and annotation features coming soon.
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
              Explore real-world captures across industries. Click any scan to load it in the viewer above.
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
                    className={`group bg-card border-border hover:border-primary/30 transition-all duration-300 card-lift overflow-hidden cursor-pointer ${galleryVisible ? 'opacity-100 translate-y-0 animate-tilt-in' : 'opacity-0 translate-y-10'
                      } ${selectedProject.id === project.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleScanSelect(project, project.scans[0])}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProject(project);
                          }}
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
