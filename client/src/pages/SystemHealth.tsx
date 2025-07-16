import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Server, 
  Globe, 
  Database, 
  Shield, 
  Users, 
  FileText, 
  Activity,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Clock
} from "lucide-react";

interface SystemHealthData {
  overallHealth: number;
  totalApis: number;
  healthyApis: number;
  unhealthyApis: number;
  apisByCategory: Record<string, any[]>;
  systemComponents: Array<{
    id: number;
    component: string;
    status: string;
    last_checked: string;
    details?: string;
  }>;
  lastUpdated: string;
}

const categoryIcons = {
  authentication: Shield,
  dashboard: Activity,
  'user-management': Users,
  assets: Database,
  reports: FileText,
  system: Server,
};

const categoryColors = {
  authentication: 'bg-blue-100 text-blue-800',
  dashboard: 'bg-green-100 text-green-800',
  'user-management': 'bg-purple-100 text-purple-800',
  assets: 'bg-orange-100 text-orange-800',
  reports: 'bg-indigo-100 text-indigo-800',
  system: 'bg-gray-100 text-gray-800',
};

export default function SystemHealth() {
  const { data, isLoading, refetch } = useQuery<SystemHealthData>({
    queryKey: ["/api/system-health"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">System Health Monitoring</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'unhealthy':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Health Monitoring</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : 'Never'}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Overall Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Health</p>
                <p className="text-3xl font-bold">{data?.overallHealth || 0}%</p>
              </div>
              <Activity className={`w-12 h-12 ${data?.overallHealth && data.overallHealth >= 80 ? 'text-green-500' : data?.overallHealth && data.overallHealth >= 60 ? 'text-yellow-500' : 'text-red-500'}`} />
            </div>
            <Progress value={data?.overallHealth || 0} className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total APIs</p>
                <p className="text-3xl font-bold">{data?.totalApis || 0}</p>
              </div>
              <Globe className="w-12 h-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Healthy APIs</p>
                <p className="text-3xl font-bold text-green-600">{data?.healthyApis || 0}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unhealthy APIs</p>
                <p className="text-3xl font-bold text-red-600">{data?.unhealthyApis || 0}</p>
              </div>
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Status by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="w-5 h-5 mr-2" />
            API Health Status
          </CardTitle>
          <CardDescription>
            Monitor the health status of all API endpoints across different categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="authentication">Auth</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="user-management">Users</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <div className="space-y-6">
                {Object.entries(data?.apisByCategory || {}).map(([category, apis]) => {
                  const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Server;
                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-5 h-5" />
                        <h3 className="text-lg font-semibold capitalize">{category.replace('-', ' ')}</h3>
                        <Badge className={categoryColors[category as keyof typeof categoryColors]}>
                          {apis.length} APIs
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {apis.map((api) => (
                          <Card key={api.id} className="border-l-4" style={{ borderLeftColor: api.status === 'healthy' ? '#10b981' : '#ef4444' }}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    {getStatusIcon(api.status)}
                                    <h4 className="font-semibold text-sm">{api.name}</h4>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">{api.description}</p>
                                  <div className="flex items-center space-x-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {api.method}
                                    </Badge>
                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      {api.endpoint}
                                    </code>
                                  </div>
                                </div>
                                <Badge variant={getStatusVariant(api.status)}>
                                  {api.status}
                                </Badge>
                              </div>
                              <div className="mt-3 text-xs text-gray-500">
                                Last checked: {new Date(api.lastChecked).toLocaleString()}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {Object.keys(data?.apisByCategory || {}).map((category) => (
              <TabsContent key={category} value={category} className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(data?.apisByCategory?.[category] || []).map((api) => (
                    <Card key={api.id} className="border-l-4" style={{ borderLeftColor: api.status === 'healthy' ? '#10b981' : '#ef4444' }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(api.status)}
                              <h4 className="font-semibold text-sm">{api.name}</h4>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{api.description}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {api.method}
                              </Badge>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {api.endpoint}
                              </code>
                            </div>
                          </div>
                          <Badge variant={getStatusVariant(api.status)}>
                            {api.status}
                          </Badge>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          Last checked: {new Date(api.lastChecked).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* System Components */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            System Components
          </CardTitle>
          <CardDescription>
            Core system components status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.systemComponents || []).map((component) => (
              <Card key={component.id} className="border-l-4" style={{ borderLeftColor: component.status === 'running' || component.status === 'connected' ? '#10b981' : '#ef4444' }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(component.status === 'running' || component.status === 'connected' ? 'healthy' : 'unhealthy')}`} />
                      <div>
                        <p className="font-medium capitalize">{component.component}</p>
                        {/* <p className="font-medium capitalize">{component.details}</p> */}
                        <p className="text-sm text-gray-500">
                          {new Date(component.last_checked).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={component.status === 'running' || component.status === 'connected' ? 'default' : 'destructive'}>
                      {component.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}