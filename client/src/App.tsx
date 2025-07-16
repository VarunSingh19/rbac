import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Home from "@/pages/Home";
import Dashboard from "@/pages/dashboard";
import UserManagement from "@/pages/UserManagement";
import Assets from "@/pages/Assets";
import Tasks from "@/pages/Tasks";
import MyAssignedTasks from "@/pages/MyAssignedTasks";
import Reports from "@/pages/Reports";
import ClientTeamAssets from "@/pages/ClientTeamAssets";
import MyClientAssets from "@/pages/MyClientAssets";
import ActivityLogs from "@/pages/ActivityLogs";
import UserSessions from "@/pages/UserSessions";
import SystemHealth from "@/pages/SystemHealth";
import AccessControl from "@/pages/AccessControl";
import Profile from "@/pages/Profile";
import ConsultationRequests from "@/pages/ConsultationRequests";
import AuditTrail from "@/pages/AuditTrail";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Layout>{children}</Layout>;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Home route - public for unauthenticated users, dashboard for authenticated */}
      <Route path="/">
        {isAuthenticated ? (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ) : (
          <Home />
        )}
      </Route>
      
      {/* Protected routes */}
      <Route path="/dashboard/:role?">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/user-management">
        <ProtectedRoute>
          <UserManagement />
        </ProtectedRoute>
      </Route>
      
      <Route path="/assets">
        <ProtectedRoute>
          <Assets />
        </ProtectedRoute>
      </Route>
      
      <Route path="/tasks">
        <ProtectedRoute>
          <Tasks />
        </ProtectedRoute>
      </Route>
      
      <Route path="/my-assigned-tasks">
        <ProtectedRoute>
          <MyAssignedTasks />
        </ProtectedRoute>
      </Route>
      
      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      
      <Route path="/client-team-assets">
        <ProtectedRoute>
          <ClientTeamAssets />
        </ProtectedRoute>
      </Route>
      
      <Route path="/my-client-assets">
        <ProtectedRoute>
          <MyClientAssets />
        </ProtectedRoute>
      </Route>
      
      <Route path="/activity-logs">
        <ProtectedRoute>
          <ActivityLogs />
        </ProtectedRoute>
      </Route>
      
      <Route path="/user-sessions">
        <ProtectedRoute>
          <UserSessions />
        </ProtectedRoute>
      </Route>
      
      <Route path="/system-health">
        <ProtectedRoute>
          <SystemHealth />
        </ProtectedRoute>
      </Route>
      
      <Route path="/access-control">
        <ProtectedRoute>
          <AccessControl />
        </ProtectedRoute>
      </Route>
      
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>
      
      <Route path="/consultation-requests">
        <ProtectedRoute>
          <ConsultationRequests />
        </ProtectedRoute>
      </Route>
      
      <Route path="/security/audit-trail">
        <ProtectedRoute>
          <AuditTrail />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}