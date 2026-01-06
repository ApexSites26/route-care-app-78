import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import DriverDashboard from "./pages/driver/DriverDashboard";
import DriverForm from "./pages/driver/DriverForm";
import EscortDashboard from "./pages/escort/EscortDashboard";
import EscortForm from "./pages/escort/EscortForm";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManageUsers from "./pages/manager/ManageUsers";
import ManageVehicles from "./pages/manager/ManageVehicles";
import ManageSchoolRuns from "./pages/manager/ManageSchoolRuns";
import ManageGarage from "./pages/manager/ManageGarage";
import ViewEntries from "./pages/manager/ViewEntries";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            
            {/* Driver Routes */}
            <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverDashboard /></ProtectedRoute>} />
            <Route path="/driver/form" element={<ProtectedRoute allowedRoles={['driver']}><DriverForm /></ProtectedRoute>} />
            
            {/* Escort Routes */}
            <Route path="/escort" element={<ProtectedRoute allowedRoles={['escort']}><EscortDashboard /></ProtectedRoute>} />
            <Route path="/escort/form" element={<ProtectedRoute allowedRoles={['escort']}><EscortForm /></ProtectedRoute>} />
            
            {/* Manager Routes */}
            <Route path="/manager" element={<ProtectedRoute allowedRoles={['manager']}><ManagerDashboard /></ProtectedRoute>} />
            <Route path="/manager/users" element={<ProtectedRoute allowedRoles={['manager']}><ManageUsers /></ProtectedRoute>} />
            <Route path="/manager/vehicles" element={<ProtectedRoute allowedRoles={['manager']}><ManageVehicles /></ProtectedRoute>} />
            <Route path="/manager/runs" element={<ProtectedRoute allowedRoles={['manager']}><ManageSchoolRuns /></ProtectedRoute>} />
            <Route path="/manager/garage" element={<ProtectedRoute allowedRoles={['manager']}><ManageGarage /></ProtectedRoute>} />
            <Route path="/manager/entries" element={<ProtectedRoute allowedRoles={['manager']}><ViewEntries /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
