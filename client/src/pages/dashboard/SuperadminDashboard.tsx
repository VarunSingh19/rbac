import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Shield, 
  Activity, 
  Database, 
  Server, 
  Globe, 
  TrendingUp,
  UserCheck,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

interface SuperadminData {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
  recentLogs: Array<{
    id: number;
    method: string;
    endpoint: string;
    statusCode: number;
    timestamp: string;
  }>;
  systemHealth: Array<{
    id: number;
    component: string;
    status: string;
    lastChecked: string;
  }>;
}

export default function SuperadminDashboard() {
  const { data, isLoading, refetch } = useQuery<SuperadminData>({
    queryKey: ["/api/dashboard/superadmin"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Superadmin Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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

  const systemHealthScore = data?.systemHealth 
    ? (data.systemHealth.filter(s => s.status === 'running' || s.status === 'connected').length / data.systemHealth.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Superadmin Dashboard</h1>
          <p className="text-gray-600">Complete system overview and management</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Usersss</p>
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
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className="text-3xl font-bold text-gray-900">{Math.round(systemHealthScore)}%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Activity className="text-green-600 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={systemHealthScore} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-3xl font-bold text-gray-900">{data?.activeUsers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <UserCheck className="text-purple-600 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="w-4 h-4 mr-1" />
                <span>Authenticated</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Requests</p>
                <p className="text-3xl font-bold text-gray-900">{data?.recentLogs?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Server className="text-orange-600 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-600">
                <Globe className="w-4 h-4 mr-1" />
                <span>Recent activity</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              System Components
            </CardTitle>
            <CardDescription>Current status of all system components</CardDescription>
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
                        Last checked: {new Date(component.lastChecked).toLocaleTimeString()}
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
              User Distribution
            </CardTitle>
            <CardDescription>Users by role across the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data?.usersByRole || {}).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="font-medium capitalize">
                      {role.split('-').join(' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{count} users</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent API Activity
          </CardTitle>
          <CardDescription>Latest API requests and system activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.recentLogs?.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant={log.statusCode < 400 ? "default" : "destructive"}>
                    {log.method}
                  </Badge>
                  <code className="text-sm bg-gray-200 px-2 py-1 rounded">{log.endpoint}</code>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span className={log.statusCode < 400 ? "text-green-600" : "text-red-600"}>
                    {log.statusCode}
                  </span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}