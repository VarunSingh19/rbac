import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import type { UserRole } from "@shared/schema";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackMessage?: string;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles, 
  fallbackMessage = "Access Denied" 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role as UserRole)) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500 py-12">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold">Access Denied</p>
              <p className="text-sm mt-2">{fallbackMessage}</p>
              <p className="text-xs mt-2 text-gray-400">
                Your current role: {user?.role || 'Unknown'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}