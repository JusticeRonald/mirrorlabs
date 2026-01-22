import { UserRole, ProjectMember, mockUsers } from '@/types/user';

export interface Scan {
  id: string;
  name: string;
  thumbnail: string;
  date: string;
  createdAt: string;
  annotationCount: number;
  collaborators: number;
  measurements?: number;
  modelUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  industry: 'construction' | 'real-estate' | 'cultural';
  createdAt: string;
  updatedAt: string;
  scanCount: number;
  collaborators: string[];
  scans: Scan[];
  isArchived: boolean;
  members: ProjectMember[];
  userRole: UserRole;
}

// Helper to create project members
const createMembers = (userIds: string[], roles: UserRole[]): ProjectMember[] => {
  return userIds.map((id, i) => ({
    user: mockUsers.find(u => u.id === id) || mockUsers[0],
    role: roles[i] || 'viewer',
    joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

export const mockProjects: Project[] = [
  // Construction Projects
  {
    id: "proj-1",
    name: "Downtown Office Tower",
    description: "45-story commercial tower with MEP coordination and structural documentation",
    thumbnail: "https://images.unsplash.com/photo-1486718448742-163732cd1544?w=400&h=300&fit=crop",
    industry: 'construction',
    createdAt: "2024-12-01",
    updatedAt: "2025-01-15",
    scanCount: 12,
    collaborators: ["JD", "MK", "SR", "AL"],
    isArchived: false,
    userRole: 'owner',
    members: createMembers(['user-1', 'user-2', 'user-3', 'user-4'], ['owner', 'editor', 'editor', 'viewer']),
    scans: [
      {
        id: "scan-1-1",
        name: "Level 23 - MEP Rough-in",
        thumbnail: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop",
        date: "Jan 12, 2025",
        createdAt: "2025-01-12",
        annotationCount: 18,
        collaborators: 4,
        measurements: 12,
      },
      {
        id: "scan-1-2",
        name: "Level 22 - Framing Complete",
        thumbnail: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=300&fit=crop",
        date: "Jan 10, 2025",
        createdAt: "2025-01-10",
        annotationCount: 24,
        collaborators: 3,
        measurements: 8,
      },
      {
        id: "scan-1-3",
        name: "Lobby - Progress Update",
        thumbnail: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=300&fit=crop",
        date: "Jan 8, 2025",
        createdAt: "2025-01-08",
        annotationCount: 15,
        collaborators: 4,
        measurements: 6,
      },
    ],
  },
  {
    id: "proj-2",
    name: "Hospital Wing Addition",
    description: "Critical care expansion with specialized equipment coordination",
    thumbnail: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop",
    industry: 'construction',
    createdAt: "2024-11-15",
    updatedAt: "2025-01-12",
    scanCount: 8,
    collaborators: ["BC", "DM"],
    isArchived: false,
    userRole: 'editor',
    members: createMembers(['user-5', 'user-1', 'user-6'], ['owner', 'editor', 'viewer']),
    scans: [
      {
        id: "scan-2-1",
        name: "Operating Suite - Framing",
        thumbnail: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&h=300&fit=crop",
        date: "Jan 8, 2025",
        createdAt: "2025-01-08",
        annotationCount: 32,
        collaborators: 4,
        measurements: 15,
      },
      {
        id: "scan-2-2",
        name: "Patient Rooms Wing",
        thumbnail: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400&h=300&fit=crop",
        date: "Jan 5, 2025",
        createdAt: "2025-01-05",
        annotationCount: 22,
        collaborators: 3,
        measurements: 10,
      },
    ],
  },
  {
    id: "proj-3",
    name: "Mixed-Use Development",
    description: "Retail podium with residential tower above",
    thumbnail: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&h=300&fit=crop",
    industry: 'construction',
    createdAt: "2024-10-20",
    updatedAt: "2025-01-10",
    scanCount: 15,
    collaborators: ["LP", "RM", "TC"],
    isArchived: false,
    userRole: 'viewer',
    members: createMembers(['user-7', 'user-8', 'user-1'], ['owner', 'editor', 'viewer']),
    scans: [
      {
        id: "scan-3-1",
        name: "Retail Level - Progress",
        thumbnail: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=300&fit=crop",
        date: "Jan 6, 2025",
        createdAt: "2025-01-06",
        annotationCount: 28,
        collaborators: 3,
        measurements: 14,
      },
      {
        id: "scan-3-2",
        name: "Parking Structure B2",
        thumbnail: "https://images.unsplash.com/photo-1573167507387-6b4b98cb7c13?w=400&h=300&fit=crop",
        date: "Jan 3, 2025",
        createdAt: "2025-01-03",
        annotationCount: 12,
        collaborators: 2,
        measurements: 8,
      },
    ],
  },
  {
    id: "proj-4",
    name: "Industrial Warehouse Complex",
    description: "500,000 sq ft distribution center with dock facilities",
    thumbnail: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop",
    industry: 'construction',
    createdAt: "2024-08-15",
    updatedAt: "2024-11-20",
    scanCount: 6,
    collaborators: ["JD", "TC"],
    isArchived: true,
    userRole: 'owner',
    members: createMembers(['user-1', 'user-9'], ['owner', 'editor']),
    scans: [
      {
        id: "scan-4-1",
        name: "Loading Dock Area",
        thumbnail: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop",
        date: "Nov 15, 2024",
        createdAt: "2024-11-15",
        annotationCount: 8,
        collaborators: 2,
        measurements: 4,
      },
    ],
  },

  // Real Estate Projects
  {
    id: "proj-5",
    name: "Luxury Penthouse Listing",
    description: "High-end residential property with panoramic views",
    thumbnail: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop",
    industry: 'real-estate',
    createdAt: "2025-01-05",
    updatedAt: "2025-01-14",
    scanCount: 4,
    collaborators: ["ES", "KN"],
    isArchived: false,
    userRole: 'owner',
    members: createMembers(['user-1', 'user-10'], ['owner', 'editor']),
    scans: [
      {
        id: "scan-5-1",
        name: "Living & Dining Area",
        thumbnail: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&h=300&fit=crop",
        date: "Jan 12, 2025",
        createdAt: "2025-01-12",
        annotationCount: 8,
        collaborators: 2,
        measurements: 5,
      },
      {
        id: "scan-5-2",
        name: "Master Suite",
        thumbnail: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&h=300&fit=crop",
        date: "Jan 11, 2025",
        createdAt: "2025-01-11",
        annotationCount: 6,
        collaborators: 2,
        measurements: 4,
      },
      {
        id: "scan-5-3",
        name: "Rooftop Terrace",
        thumbnail: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&h=300&fit=crop",
        date: "Jan 10, 2025",
        createdAt: "2025-01-10",
        annotationCount: 4,
        collaborators: 2,
        measurements: 3,
      },
    ],
  },
  {
    id: "proj-6",
    name: "Commercial Office Space",
    description: "Class A office building available for lease",
    thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
    industry: 'real-estate',
    createdAt: "2024-12-15",
    updatedAt: "2025-01-08",
    scanCount: 6,
    collaborators: ["PL", "JH"],
    isArchived: false,
    userRole: 'editor',
    members: createMembers(['user-7', 'user-1'], ['owner', 'editor']),
    scans: [
      {
        id: "scan-6-1",
        name: "Open Floor Plan",
        thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop",
        date: "Jan 5, 2025",
        createdAt: "2025-01-05",
        annotationCount: 12,
        collaborators: 3,
        measurements: 8,
      },
      {
        id: "scan-6-2",
        name: "Executive Offices",
        thumbnail: "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=400&h=300&fit=crop",
        date: "Jan 3, 2025",
        createdAt: "2025-01-03",
        annotationCount: 8,
        collaborators: 2,
        measurements: 6,
      },
    ],
  },
  {
    id: "proj-7",
    name: "Retail Storefront",
    description: "Prime location retail space in shopping district",
    thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
    industry: 'real-estate',
    createdAt: "2024-11-20",
    updatedAt: "2025-01-02",
    scanCount: 3,
    collaborators: ["AW"],
    isArchived: false,
    userRole: 'viewer',
    members: createMembers(['user-4', 'user-1'], ['owner', 'viewer']),
    scans: [
      {
        id: "scan-7-1",
        name: "Main Sales Floor",
        thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
        date: "Dec 28, 2024",
        createdAt: "2024-12-28",
        annotationCount: 6,
        collaborators: 2,
        measurements: 4,
      },
    ],
  },
  {
    id: "proj-8",
    name: "Historic Brownstone",
    description: "Renovated 1890s townhouse in heritage district",
    thumbnail: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop",
    industry: 'real-estate',
    createdAt: "2024-09-10",
    updatedAt: "2024-10-15",
    scanCount: 5,
    collaborators: ["ES"],
    isArchived: true,
    userRole: 'owner',
    members: createMembers(['user-1', 'user-10'], ['owner', 'viewer']),
    scans: [
      {
        id: "scan-8-1",
        name: "Main Parlor",
        thumbnail: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop",
        date: "Oct 10, 2024",
        createdAt: "2024-10-10",
        annotationCount: 10,
        collaborators: 2,
        measurements: 6,
      },
    ],
  },

  // Cultural & Hospitality Projects
  {
    id: "proj-9",
    name: "Contemporary Art Museum",
    description: "Exhibition space documentation for virtual tours",
    thumbnail: "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=400&h=300&fit=crop",
    industry: 'cultural',
    createdAt: "2025-01-02",
    updatedAt: "2025-01-14",
    scanCount: 8,
    collaborators: ["SR", "LP"],
    isArchived: false,
    userRole: 'editor',
    members: createMembers(['user-3', 'user-1', 'user-7'], ['owner', 'editor', 'viewer']),
    scans: [
      {
        id: "scan-9-1",
        name: "Main Gallery Hall",
        thumbnail: "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=400&h=300&fit=crop",
        date: "Jan 10, 2025",
        createdAt: "2025-01-10",
        annotationCount: 22,
        collaborators: 3,
        measurements: 10,
      },
      {
        id: "scan-9-2",
        name: "Sculpture Garden",
        thumbnail: "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400&h=300&fit=crop",
        date: "Jan 8, 2025",
        createdAt: "2025-01-08",
        annotationCount: 15,
        collaborators: 2,
        measurements: 8,
      },
      {
        id: "scan-9-3",
        name: "Modern Wing",
        thumbnail: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=400&h=300&fit=crop",
        date: "Jan 6, 2025",
        createdAt: "2025-01-06",
        annotationCount: 18,
        collaborators: 3,
        measurements: 12,
      },
    ],
  },
  {
    id: "proj-10",
    name: "Boutique Hotel Renovation",
    description: "Historic property restoration and modernization",
    thumbnail: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
    industry: 'cultural',
    createdAt: "2024-11-10",
    updatedAt: "2025-01-06",
    scanCount: 10,
    collaborators: ["MK", "JD", "ES"],
    isArchived: false,
    userRole: 'owner',
    members: createMembers(['user-1', 'user-2', 'user-10'], ['owner', 'editor', 'viewer']),
    scans: [
      {
        id: "scan-10-1",
        name: "Grand Lobby",
        thumbnail: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
        date: "Jan 4, 2025",
        createdAt: "2025-01-04",
        annotationCount: 18,
        collaborators: 4,
        measurements: 9,
      },
      {
        id: "scan-10-2",
        name: "Presidential Suite",
        thumbnail: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop",
        date: "Jan 2, 2025",
        createdAt: "2025-01-02",
        annotationCount: 14,
        collaborators: 3,
        measurements: 7,
      },
    ],
  },
  {
    id: "proj-11",
    name: "Historic Theater Restoration",
    description: "1920s theater preservation and acoustic documentation",
    thumbnail: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&h=300&fit=crop",
    industry: 'cultural',
    createdAt: "2024-09-20",
    updatedAt: "2024-12-15",
    scanCount: 12,
    collaborators: ["TC", "RM"],
    isArchived: false,
    userRole: 'viewer',
    members: createMembers(['user-9', 'user-8', 'user-1'], ['owner', 'editor', 'viewer']),
    scans: [
      {
        id: "scan-11-1",
        name: "Main Auditorium",
        thumbnail: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&h=300&fit=crop",
        date: "Dec 10, 2024",
        createdAt: "2024-12-10",
        annotationCount: 42,
        collaborators: 3,
        measurements: 18,
      },
      {
        id: "scan-11-2",
        name: "Stage & Backstage",
        thumbnail: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400&h=300&fit=crop",
        date: "Dec 8, 2024",
        createdAt: "2024-12-08",
        annotationCount: 28,
        collaborators: 3,
        measurements: 14,
      },
    ],
  },
  {
    id: "proj-12",
    name: "Concert Venue",
    description: "Live music venue acoustic and spatial documentation",
    thumbnail: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop",
    industry: 'cultural',
    createdAt: "2024-06-15",
    updatedAt: "2024-08-20",
    scanCount: 4,
    collaborators: ["RM"],
    isArchived: true,
    userRole: 'owner',
    members: createMembers(['user-1', 'user-8'], ['owner', 'editor']),
    scans: [
      {
        id: "scan-12-1",
        name: "Main Stage",
        thumbnail: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop",
        date: "Aug 15, 2024",
        createdAt: "2024-08-15",
        annotationCount: 12,
        collaborators: 2,
        measurements: 8,
      },
    ],
  },
];

// Helper function to get projects by industry
export const getProjectsByIndustry = (industry: Project['industry']) => {
  return mockProjects.filter(p => p.industry === industry);
};

// Helper to get active (non-archived) projects
export const getActiveProjects = () => {
  return mockProjects.filter(p => !p.isArchived);
};

// Helper to get archived projects
export const getArchivedProjects = () => {
  return mockProjects.filter(p => p.isArchived);
};

// Helper to get projects by user role
export const getProjectsByRole = (role: UserRole) => {
  return mockProjects.filter(p => p.userRole === role);
};

// Helper to get projects owned by current user
export const getOwnedProjects = () => {
  return mockProjects.filter(p => p.userRole === 'owner');
};

// Helper to get projects shared with current user
export const getSharedProjects = () => {
  return mockProjects.filter(p => p.userRole !== 'owner');
};

// Featured project for auto-loading (first construction project)
export const featuredProject = mockProjects[0];
export const featuredScan = featuredProject.scans[0];

// Legacy exports for compatibility
export const featuredProjects = mockProjects.slice(0, 2);
export const demoScans = mockProjects.flatMap(p => p.scans).slice(0, 12);

// Helper to get a project by ID
export const getProjectById = (id: string) => {
  return mockProjects.find(p => p.id === id);
};

// Helper to get a scan by project and scan ID
export const getScanById = (projectId: string, scanId: string) => {
  const project = getProjectById(projectId);
  return project?.scans.find(s => s.id === scanId);
};
