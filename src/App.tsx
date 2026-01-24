import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Product from "./pages/Product";
import UseCasesPage from "./pages/UseCasesPage";
import Contact from "./pages/Contact";
import Demo from "./pages/Demo";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ViewerPage from "./pages/ViewerPage";
import Portfolio from "./pages/Portfolio";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import { AdminGuard } from "@/components/admin";
import {
  AdminDashboard,
  AdminWorkspaces,
  AdminWorkspaceDetail,
  AdminProjects,
  AdminUsers,
  AdminDemo,
} from "./pages/admin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/product" element={<Product />} />
            <Route path="/use-cases" element={<UseCasesPage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/viewer/:projectId/:scanId" element={<ViewerPage />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/profile" element={<Profile />} />
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/workspaces" element={<AdminGuard><AdminWorkspaces /></AdminGuard>} />
            <Route path="/admin/workspaces/:id" element={<AdminGuard><AdminWorkspaceDetail /></AdminGuard>} />
            <Route path="/admin/projects" element={<AdminGuard><AdminProjects /></AdminGuard>} />
            <Route path="/admin/people" element={<AdminGuard><AdminUsers /></AdminGuard>} />
            <Route path="/admin/demo" element={<AdminGuard><AdminDemo /></AdminGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
