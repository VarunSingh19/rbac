import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Shield, 
  Activity, 
  Settings, 
  TrendingUp,
  UserPlus,
  RefreshCw,
  Building2
} from "lucide-react";

interface AdminData {
  totalUsers: number;
  activeUsers: number;
  systemHealth: Array<{
    id: number;
    component: string;
    status: string;
    lastChecked: string;
  }>;
  teamMembers: Array<{
    id: number;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
}

export default function AdminDashboard() {
  const { data, isLoading, refetch } = useQuery<AdminData>({
    queryKey: ["/api/dashboard/admin"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">System administration and user management</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{data?.totalUsers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>Active: {data?.activeUsers || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-3xl font-bold text-gray-900">{data?.teamMembers?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 className="text-green-600 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-600">
                <UserPlus className="w-4 h-4 mr-1" />
                <span>Managed Users</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className="text-3xl font-bold text-gray-900">
                  {data?.systemHealth?.filter(s => s.status === 'running' || s.status === 'connected').length || 0}
                  /{data?.systemHealth?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="text-purple-600 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="w-4 h-4 mr-1" />
                <span>Components Online</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health and Team Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              System Health
            </CardTitle>
            <CardDescription>Monitor system component status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.systemHealth?.map((component) => (
                <div key={component.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      component.status === 'running' || component.status === 'connected' 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium capitalize">{component.component}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(component.lastChecked).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={
                    component.status === 'running' || component.status === 'connected' 
                      ? 'default' 
                      : 'destructive'
                  }>
                    {component.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Team Members
            </CardTitle>
            <CardDescription>Recent team member activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.teamMembers?.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div>
                      <p className="font-medium">{member.username}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {member.role.replace('-', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-20 flex-col space-y-2">
              <UserPlus className="w-6 h-6" />
              <span>Add User</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Shield className="w-6 h-6" />
              <span>Manage Roles</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Settings className="w-6 h-6" />
              <span>System Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}