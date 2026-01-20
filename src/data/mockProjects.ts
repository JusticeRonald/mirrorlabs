export interface Scan {
  id: string;
  name: string;
  thumbnail: string;
  createdAt: string;
  annotationCount: number;
  collaborators: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  scanCount: number;
  collaborators: string[];
  scans: Scan[];
}

export const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "Healthcare Facility Expansion",
    description: "New wing addition with specialized equipment planning and coordination",
    thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
    createdAt: "2024-12-01",
    updatedAt: "2025-01-10",
    scanCount: 8,
    collaborators: ["JD", "MK", "SR"],
    scans: [
      {
        id: "scan-1-1",
        name: "Reception Area - Initial",
        thumbnail: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=300&fit=crop",
        createdAt: "2024-12-01",
        annotationCount: 12,
        collaborators: 3,
      },
      {
        id: "scan-1-2",
        name: "Conference Room A",
        thumbnail: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop",
        createdAt: "2024-12-05",
        annotationCount: 8,
        collaborators: 2,
      },
      {
        id: "scan-1-3",
        name: "Open Floor Plan - Progress",
        thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
        createdAt: "2024-12-15",
        annotationCount: 24,
        collaborators: 4,
      },
      {
        id: "scan-1-4",
        name: "Kitchen & Break Area",
        thumbnail: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
        createdAt: "2025-01-02",
        annotationCount: 6,
        collaborators: 2,
      },
    ],
  },
  {
    id: "proj-2",
    name: "Manufacturing Plant Layout",
    description: "Production floor optimization and equipment placement planning",
    thumbnail: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop",
    createdAt: "2024-11-15",
    updatedAt: "2025-01-08",
    scanCount: 12,
    collaborators: ["AW", "BC"],
    scans: [
      {
        id: "scan-2-1",
        name: "Loading Dock Area",
        thumbnail: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&h=300&fit=crop",
        createdAt: "2024-11-15",
        annotationCount: 18,
        collaborators: 2,
      },
      {
        id: "scan-2-2",
        name: "Storage Zone A",
        thumbnail: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop",
        createdAt: "2024-11-20",
        annotationCount: 15,
        collaborators: 3,
      },
      {
        id: "scan-2-3",
        name: "Conveyor System",
        thumbnail: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=400&h=300&fit=crop",
        createdAt: "2024-12-01",
        annotationCount: 22,
        collaborators: 2,
      },
    ],
  },
  {
    id: "proj-3",
    name: "Educational Campus Planning",
    description: "Multi-building campus coordination and accessibility planning",
    thumbnail: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&h=300&fit=crop",
    createdAt: "2024-10-20",
    updatedAt: "2024-12-28",
    scanCount: 15,
    collaborators: ["LP", "RM", "TC", "JB"],
    scans: [
      {
        id: "scan-3-1",
        name: "Grand Entrance Hall",
        thumbnail: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&h=300&fit=crop",
        createdAt: "2024-10-20",
        annotationCount: 45,
        collaborators: 4,
      },
      {
        id: "scan-3-2",
        name: "Ornate Ceiling Details",
        thumbnail: "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=400&h=300&fit=crop",
        createdAt: "2024-10-25",
        annotationCount: 32,
        collaborators: 3,
      },
    ],
  },
  {
    id: "proj-4",
    name: "Art Gallery Exhibition",
    description: "Virtual tour documentation for upcoming exhibition",
    thumbnail: "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=400&h=300&fit=crop",
    createdAt: "2025-01-05",
    updatedAt: "2025-01-12",
    scanCount: 6,
    collaborators: ["ES"],
    scans: [
      {
        id: "scan-4-1",
        name: "Main Gallery Space",
        thumbnail: "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=400&h=300&fit=crop",
        createdAt: "2025-01-05",
        annotationCount: 8,
        collaborators: 2,
      },
      {
        id: "scan-4-2",
        name: "Sculpture Wing",
        thumbnail: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&h=300&fit=crop",
        createdAt: "2025-01-08",
        annotationCount: 14,
        collaborators: 1,
      },
    ],
  },
  {
    id: "proj-5",
    name: "Retail Store Remodel",
    description: "Flagship store renovation planning and documentation",
    thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
    createdAt: "2024-11-01",
    updatedAt: "2025-01-05",
    scanCount: 10,
    collaborators: ["KN", "PL", "JH"],
    scans: [
      {
        id: "scan-5-1",
        name: "Storefront Exterior",
        thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
        createdAt: "2024-11-01",
        annotationCount: 10,
        collaborators: 3,
      },
      {
        id: "scan-5-2",
        name: "Display Area - Current",
        thumbnail: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400&h=300&fit=crop",
        createdAt: "2024-11-10",
        annotationCount: 16,
        collaborators: 2,
      },
    ],
  },
  {
    id: "proj-6",
    name: "Manufacturing Facility Audit",
    description: "Safety compliance and space optimization study",
    thumbnail: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop",
    createdAt: "2024-09-15",
    updatedAt: "2024-11-30",
    scanCount: 20,
    collaborators: ["DM", "WS", "RK", "AL", "CT"],
    scans: [
      {
        id: "scan-6-1",
        name: "Assembly Line A",
        thumbnail: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop",
        createdAt: "2024-09-15",
        annotationCount: 28,
        collaborators: 5,
      },
      {
        id: "scan-6-2",
        name: "Quality Control Station",
        thumbnail: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=400&h=300&fit=crop",
        createdAt: "2024-09-20",
        annotationCount: 19,
        collaborators: 3,
      },
    ],
  },
];

// Helper exports for Demo page
export const featuredProjects = mockProjects.slice(0, 2);
export const demoScans = mockProjects.flatMap(p => p.scans).slice(0, 12);
