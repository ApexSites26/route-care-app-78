import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BrandingProvider } from "@/hooks/useBranding";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import RegisterCompany from "./pages/RegisterCompany";
import DriverDashboard from "./pages/driver/DriverDashboard";
import DriverForm from "./pages/driver/DriverForm";
import GarageVisitForm from "./pages/driver/GarageVisitForm";
import EscortDashboard from "./pages/escort/EscortDashboard";
import EscortForm from "./pages/escort/EscortForm";
import ManagerOverview from "./pages/manager/ManagerOverview";
import ManageUsers from "./pages/manager/ManageUsers";
import ManageVehicles from "./pages/manager/ManageVehicles";
import ManageSchoolRuns from "./pages/manager/ManageSchoolRuns";
import ManageGarage from "./pages/manager/ManageGarage";
import ViewEntries from "./pages/manager/ViewEntries";
import BrandingSettings from "./pages/manager/BrandingSettings";
import AuditLogs from "./pages/manager/AuditLogs";
import WorkshopRecords from "./pages/manager/WorkshopRecords";
import VehicleDefects from "./pages/manager/VehicleDefects";
import VehicleDiary from "./pages/manager/VehicleDiary";
import VehicleDriverHistory from "./pages/manager/VehicleDriverHistory";
import VehicleInspection from "./pages/VehicleInspection";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BrandingProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/register" element={<RegisterCompany />} />
              <Route path="/inspect" element={<VehicleInspection />} />
              
              {/* Driver Routes */}
              <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverDashboard /></ProtectedRoute>} />
              <Route path="/driver/form" element={<ProtectedRoute allowedRoles={['driver']}><DriverForm /></ProtectedRoute>} />
              <Route path="/driver/garage-visit" element={<ProtectedRoute allowedRoles={['driver']}><GarageVisitForm /></ProtectedRoute>} />
              
              {/* Escort Routes */}
              <Route path="/escort" element={<ProtectedRoute allowedRoles={['escort']}><EscortDashboard /></ProtectedRoute>} />
              <Route path="/escort/form" element={<ProtectedRoute allowedRoles={['escort']}><EscortForm /></ProtectedRoute>} />
              
              {/* Manager Routes */}
              <Route path="/manager" element={<ProtectedRoute allowedRoles={['manager']}><ManagerOverview /></ProtectedRoute>} />
              <Route path="/manager/users" element={<ProtectedRoute allowedRoles={['manager']}><ManageUsers /></ProtectedRoute>} />
              <Route path="/manager/vehicles" element={<ProtectedRoute allowedRoles={['manager']}><ManageVehicles /></ProtectedRoute>} />
              <Route path="/manager/runs" element={<ProtectedRoute allowedRoles={['manager']}><ManageSchoolRuns /></ProtectedRoute>} />
              <Route path="/manager/garage" element={<ProtectedRoute allowedRoles={['manager']}><ManageGarage /></ProtectedRoute>} />
              <Route path="/manager/entries" element={<ProtectedRoute allowedRoles={['manager']}><ViewEntries /></ProtectedRoute>} />
              <Route path="/manager/branding" element={<ProtectedRoute allowedRoles={['manager']}><BrandingSettings /></ProtectedRoute>} />
              <Route path="/manager/audit" element={<ProtectedRoute allowedRoles={['manager']}><AuditLogs /></ProtectedRoute>} />
              <Route path="/manager/workshop" element={<ProtectedRoute allowedRoles={['manager']}><WorkshopRecords /></ProtectedRoute>} />
              <Route path="/manager/defects" element={<ProtectedRoute allowedRoles={['manager']}><VehicleDefects /></ProtectedRoute>} />
              <Route path="/manager/vehicle-diary" element={<ProtectedRoute allowedRoles={['manager']}><VehicleDiary /></ProtectedRoute>} />
              <Route path="/manager/driver-history" element={<ProtectedRoute allowedRoles={['manager']}><VehicleDriverHistory /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrandingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
