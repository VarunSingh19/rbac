import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, RefreshCw, Search, Filter, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import ProtectedRoute from "@/components/ProtectedRoute";

interface AuditTrailEntry {
  id: number;
  userId: number;
  action: string;
  resource: string;
  resourceId?: number;
  details?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

function AuditTrailContent() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    resource: "",
    action: "",
    searchTerm: "",
    limit: 50,
    offset: 0
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: auditTrailData = [], isLoading, refetch } = useQuery<AuditTrailEntry[]>({
    queryKey: ["/api/audit-trail", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.resource && filters.resource !== "all") params.set("resource", filters.resource);
      if (filters.action && filters.action !== "all") params.set("action", filters.action);
      params.set("limit", filters.limit.toString());
      params.set("offset", filters.offset.toString());

      const response = await apiRequest("GET", `/api/audit-trail?${params}`);
      const data = await response.json();
      console.log('[AUDIT TRAIL DEBUG] Raw API response:', data);

      // Convert snake_case to camelCase for each entry
      const convertedData = data.map((entry: any) => ({
        ...entry,
        userId: entry.user_id || entry.userId,
        resourceId: entry.resource_id || entry.resourceId,
        ipAddress: entry.ip_address || entry.ipAddress,
        userAgent: entry.user_agent || entry.userAgent,
        // Handle both timestamp (server-django) and created_at (ReactDjangoPro/django-server)
        createdAt: entry.created_at || entry.timestamp || entry.createdAt,
        timestamp: entry.timestamp || entry.created_at || entry.timestamp,
      }));

      console.log('[AUDIT TRAIL DEBUG] Converted data:', convertedData);
      return convertedData;
    },
  });

  const filteredData = auditTrailData.filter(entry => {
    if (!filters.searchTerm) return true;
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      entry.action.toLowerCase().includes(searchLower) ||
      entry.resource.toLowerCase().includes(searchLower) ||
      entry.ipAddress.toLowerCase().includes(searchLower) ||
      entry.userAgent.toLowerCase().includes(searchLower)
    );
  });

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return "bg-green-100 text-green-800";
      case "update":
      case "patch":
        return "bg-blue-100 text-blue-800";
      case "delete":
        return "bg-red-100 text-red-800";
      case "view":
      case "get":
        return "bg-gray-100 text-gray-800";
      case "login":
        return "bg-purple-100 text-purple-800";
      case "logout":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getResourceIcon = (resource: string) => {
    switch (resource.toLowerCase()) {
      case "user":
        return "👤";
      case "asset":
        return "🏢";
      case "report":
        return "📋";
      case "finding":
        return "🔍";
      case "audit-trail":
        return "📊";
      default:
        return "📄";
    }
  };

  const resetFilters = () => {
    setFilters({
      resource: "all",
      action: "all",
      searchTerm: "",
      limit: 50,
      offset: 0
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Audit Trail</h1>
          <p className="text-gray-600">Complete activity log of all security-related actions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? "Hide" : "Show"} Filters
          </Button>
          <Button onClick={() => refetch()} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Search</label>
                <Input
                  placeholder="Search actions, resources, IP..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Resource</label>
                <Select
                  value={filters.resource}
                  onValueChange={(value) => setFilters({ ...filters, resource: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="finding">Finding</SelectItem>
                    <SelectItem value="audit-trail">Audit Trail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Action</label>
                <Select
                  value={filters.action}
                  onValueChange={(value) => setFilters({ ...filters, action: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="VIEW">View</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={resetFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Audit Trail Entries ({filteredData.length})
          </CardTitle>
          <CardDescription>
            Chronological log of all system activities and user actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-lg" />
              ))}
            </div>
          ) : filteredData.length > 0 ? (
            <div className="space-y-4">
              {filteredData.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getResourceIcon(entry.resource)}</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getActionColor(entry.action)}>
                            {entry.action}
                          </Badge>
                          <span className="text-sm font-medium">{entry.resource}</span>
                          {entry.resourceId && (
                            <span className="text-xs text-gray-500">#{entry.resourceId}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(entry.timestamp), "MMM dd, yyyy 'at' h:mm:ss a")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">User ID: {entry.userId}</p>
                      <p className="text-xs text-gray-500">IP: {entry.ipAddress}</p>
                    </div>
                  </div>

                  {entry.details && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-600 mb-2">Details:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {entry.details.method && (
                          <div>
                            <span className="font-medium">Method:</span> {entry.details.method}
                          </div>
                        )}
                        {entry.details.url && (
                          <div>
                            <span className="font-medium">URL:</span> {entry.details.url}
                          </div>
                        )}
                        {entry.details.statusCode && (
                          <div>
                            <span className="font-medium">Status:</span> {entry.details.statusCode}
                          </div>
                        )}
                        {entry.details.responseTime && (
                          <div>
                            <span className="font-medium">Response Time:</span> {entry.details.responseTime}ms
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div>
                      <span className="font-medium">User Agent:</span> {entry.userAgent.substring(0, 80)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No audit trail entries found</p>
              <p className="text-sm">Security actions will appear here as they occur</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditTrail() {
  return (
    <ProtectedRoute 
      allowedRoles={["superadmin", "admin"]} 
      fallbackMessage="Only administrators can view the audit trail"
    >
      <AuditTrailContent />
    </ProtectedRoute>
  );
}