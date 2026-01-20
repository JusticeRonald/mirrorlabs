import { useState } from "react";
import Navigation from "@/components/Navigation";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockProjects } from "@/data/mockProjects";
import { Ruler, MapPin, Share2, Download, Eye } from "lucide-react";

const Demo = () => {
  const [activeTab, setActiveTab] = useState("all");

  // Get all scans from all projects for the sample gallery
  const allScans = mockProjects.flatMap((project) =>
    project.scans.map((scan) => ({
      ...scan,
      projectName: project.name,
      projectId: project.id,
    }))
  ).slice(0, 12);

  // Filter scans based on selected tab
  const filteredScans = activeTab === "all"
    ? allScans
    : allScans.filter((scan) => {
        if (activeTab === "construction") return scan.projectName.toLowerCase().includes("office") || scan.projectName.toLowerCase().includes("construction");
        if (activeTab === "real-estate") return scan.projectName.toLowerCase().includes("showroom") || scan.projectName.toLowerCase().includes("retail");
        if (activeTab === "manufacturing") return scan.projectName.toLowerCase().includes("warehouse") || scan.projectName.toLowerCase().includes("facility");
        return true;
      });

  // Featured project (Downtown Office Renovation - proj-1)
  const featuredProject = mockProjects[0];
  const featuredScan = featuredProject.scans[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-mirror-dark via-mirror-darker to-black">
      <Navigation />

      {/* Hero Section with Featured Demo */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block mb-6 px-4 py-2 rounded-full bg-mirror-blue/10 border border-mirror-blue/30">
              <span className="text-mirror-blue text-sm font-medium">Interactive Demo</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-mirror-blue to-white bg-clip-text text-transparent leading-tight">
              Experience Collaboration
              <br />
              Without Confusion
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-12">
              See how distributed teams use Mirror Labs to measure, annotate, and align on spatial
              decisions in real time—no travel required.
            </p>
          </div>

          {/* Featured Demo Viewport */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-mirror-blue/20 to-purple-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
            <div className="relative bg-mirror-darker/80 backdrop-blur-sm border border-mirror-blue/30 rounded-3xl overflow-hidden shadow-2xl shadow-mirror-blue/10">
              {/* Viewport Header */}
              <div className="bg-mirror-dark/50 border-b border-mirror-blue/20 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <span className="text-white font-semibold">{featuredProject.name}</span>
                  <Badge className="bg-mirror-blue/20 text-mirror-blue border-mirror-blue/30">
                    {featuredScan.name}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 text-sm">Last updated: {featuredScan.date}</span>
                </div>
              </div>

              {/* 3D Viewport Mockup */}
              <div className="aspect-video bg-gradient-to-br from-mirror-dark via-mirror-darker to-black relative overflow-hidden">
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(96, 165, 250, 0.1) 25%, rgba(96, 165, 250, 0.1) 26%, transparent 27%, transparent 74%, rgba(96, 165, 250, 0.1) 75%, rgba(96, 165, 250, 0.1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(96, 165, 250, 0.1) 25%, rgba(96, 165, 250, 0.1) 26%, transparent 27%, transparent 74%, rgba(96, 165, 250, 0.1) 75%, rgba(96, 165, 250, 0.1) 76%, transparent 77%, transparent)',
                    backgroundSize: '50px 50px'
                  }} />
                </div>

                {/* Simulated 3D Content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Center focal point */}
                    <div className="w-4 h-4 bg-mirror-blue rounded-full animate-pulse shadow-lg shadow-mirror-blue/50" />

                    {/* Measurement Line with Animation */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="relative w-64 h-0.5 bg-gradient-to-r from-transparent via-mirror-blue to-transparent animate-pulse">
                        <div className="absolute -left-2 -top-2 w-4 h-4 bg-mirror-blue rounded-full shadow-lg shadow-mirror-blue/50" />
                        <div className="absolute -right-2 -top-2 w-4 h-4 bg-mirror-blue rounded-full shadow-lg shadow-mirror-blue/50" />
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-mirror-blue/90 px-3 py-1 rounded-md text-white text-sm whitespace-nowrap">
                          3.8m
                        </div>
                      </div>
                    </div>

                    {/* Annotation Pins */}
                    <div className="absolute -top-20 -left-32 animate-float">
                      <div className="relative">
                        <MapPin className="w-8 h-8 text-mirror-blue drop-shadow-lg" fill="currentColor" />
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-mirror-darker/90 border border-mirror-blue/30 px-3 py-2 rounded-lg shadow-xl min-w-48">
                          <p className="text-white text-sm font-semibold mb-1">Clearance Verification</p>
                          <p className="text-gray-400 text-xs">Critical measurement zone</p>
                        </div>
                      </div>
                    </div>

                    <div className="absolute -bottom-16 right-20 animate-float" style={{ animationDelay: "1s" }}>
                      <div className="relative">
                        <MapPin className="w-8 h-8 text-purple-500 drop-shadow-lg" fill="currentColor" />
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-mirror-darker/90 border border-purple-500/30 px-3 py-2 rounded-lg shadow-xl min-w-48">
                          <p className="text-white text-sm font-semibold mb-1">Equipment Location</p>
                          <p className="text-gray-400 text-xs">Installation planning</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Toolbar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-mirror-dark/90 backdrop-blur-md border border-mirror-blue/30 rounded-2xl px-6 py-3 shadow-2xl">
                  <div className="flex items-center space-x-6">
                    <button className="flex flex-col items-center space-y-1 text-mirror-blue hover:text-blue-400 transition-colors">
                      <Ruler className="w-5 h-5" />
                      <span className="text-xs">Measure</span>
                    </button>
                    <button className="flex flex-col items-center space-y-1 text-gray-400 hover:text-mirror-blue transition-colors">
                      <MapPin className="w-5 h-5" />
                      <span className="text-xs">Annotate</span>
                    </button>
                    <button className="flex flex-col items-center space-y-1 text-gray-400 hover:text-mirror-blue transition-colors">
                      <Share2 className="w-5 h-5" />
                      <span className="text-xs">Share</span>
                    </button>
                    <button className="flex flex-col items-center space-y-1 text-gray-400 hover:text-mirror-blue transition-colors">
                      <Download className="w-5 h-5" />
                      <span className="text-xs">Export</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Viewport Footer */}
              <div className="bg-mirror-dark/50 border-t border-mirror-blue/20 px-6 py-4">
                <p className="text-gray-400 text-sm">
                  This interactive demo showcases real-time measurements and collaborative annotations
                  in an immersive 3D environment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Scans Gallery */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Sample Projects</h2>
            <p className="text-gray-400 text-lg">
              Explore real-world captures from various industries
            </p>
          </div>

          {/* Tabs Filter */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 bg-mirror-darker/50 border border-mirror-blue/20">
              <TabsTrigger value="all" className="data-[state=active]:bg-mirror-blue data-[state=active]:text-white">
                All
              </TabsTrigger>
              <TabsTrigger value="construction" className="data-[state=active]:bg-mirror-blue data-[state=active]:text-white">
                Construction
              </TabsTrigger>
              <TabsTrigger value="real-estate" className="data-[state=active]:bg-mirror-blue data-[state=active]:text-white">
                Real Estate
              </TabsTrigger>
              <TabsTrigger value="manufacturing" className="data-[state=active]:bg-mirror-blue data-[state=active]:text-white">
                Manufacturing
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredScans.map((scan, index) => (
                  <Card
                    key={`${scan.projectId}-${scan.id}-${index}`}
                    className="group bg-mirror-darker/50 border-mirror-blue/20 hover:border-mirror-blue/50 transition-all duration-300 hover:shadow-xl hover:shadow-mirror-blue/10 overflow-hidden"
                  >
                    <CardContent className="p-0">
                      {/* Thumbnail */}
                      <div className="aspect-video bg-gradient-to-br from-mirror-blue/20 to-purple-500/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-mirror-darker to-transparent opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Eye className="w-12 h-12 text-mirror-blue/50 group-hover:text-mirror-blue transition-colors" />
                        </div>
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-mirror-blue/20 text-mirror-blue border-mirror-blue/30 text-xs">
                            {scan.date}
                          </Badge>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="text-white font-semibold mb-1 group-hover:text-mirror-blue transition-colors">
                          {scan.name}
                        </h3>
                        <p className="text-gray-400 text-sm mb-3">{scan.projectName}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-mirror-blue/30 text-mirror-blue hover:bg-mirror-blue hover:text-white transition-colors"
                        >
                          Explore Scan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredScans.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No scans found for this category.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA Section */}
      <CTA />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Demo;
