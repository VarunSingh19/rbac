import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, Activity, Shield, AlertCircle, Filter, Search, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityLog {
  id: number;
  userId: number;
  activityType: string;
  action: string;
  resourceType?: string;
  resourceId?: number;
  resourceName?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    email: string;
  };
}

interface ActivitySummary {
  activityCounts: Array<{
    activityType: string;
    count: number;
  }>;
  activeSessions: number;
  recentActivities: ActivityLog[];
  dateRange: {
    start: string;
    end: string;
  };
}

export default function ActivityLogs() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    activityType: '',
    searchTerm: '',
  });
  const [page, setPage] = useState(0);
  const [limit] = useState(50);

  // Check if user has permission to access activity logs
  const canViewLogs = user?.role === 'superadmin' || user?.role === 'admin';

  if (!canViewLogs) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600">Monitor system activity and user actions</p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>You don't have permission to view activity logs.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch activity summary
  const { data: summary, isLoading: summaryLoading } = useQuery<ActivitySummary>({
    queryKey: ['/api/activity-summary', filters.startDate, filters.endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await apiRequest('GET', `/api/activity-summary?${params}`);
      const data = await response.json();
      console.log('[ACTIVITY SUMMARY DEBUG] Raw API response:', data);

      // Convert snake_case to camelCase if needed
      const convertedData = {
        ...data,
        totalActivities: data.total_activities || data.totalActivities,
        uniqueUsers: data.unique_users || data.uniqueUsers,
        recentActivity: data.recent_activity || data.recentActivity,
      };

      console.log('[ACTIVITY SUMMARY DEBUG] Converted data:', convertedData);
      return convertedData;
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Fetch activity logs
  const { data: logs = [], isLoading: logsLoading, refetch } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity-logs', filters, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.activityType) params.append('activityType', filters.activityType);
      params.append('limit', limit.toString());
      params.append('offset', (page * limit).toString());

      const response = await apiRequest('GET', `/api/activity-logs?${params}`);
      const data = await response.json();
      console.log('[ACTIVITY LOGS DEBUG] Raw API response:', data);

      // Convert snake_case to camelCase for each log entry
      const convertedLogs = data.map((log: any) => ({
        ...log,
        activityType: log.activity_type || log.activityType,
        ipAddress: log.ip_address || log.ipAddress,
        userAgent: log.user_agent || log.userAgent,
        sessionId: log.session_id || log.sessionId,
        createdAt: log.created_at || log.createdAt,
        updatedAt: log.updated_at || log.updatedAt,
      }));

      console.log('[ACTIVITY LOGS DEBUG] Converted logs:', convertedLogs);
      return convertedLogs;
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Filter logs based on search term
  const filteredLogs = logs.filter(log => {
    if (!filters.searchTerm) return true;
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      log.user.username.toLowerCase().includes(searchLower) ||
      log.user.firstName?.toLowerCase().includes(searchLower) ||
      log.user.lastName?.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.activityType.toLowerCase().includes(searchLower) ||
      log.resourceName?.toLowerCase().includes(searchLower)
    );
  });

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'auth':
        return <Shield className="w-4 h-4" />;
      case 'user_management':
        return <User className="w-4 h-4" />;
      case 'asset_management':
        return <Activity className="w-4 h-4" />;
      case 'system':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'auth':
        return 'bg-blue-500';
      case 'user_management':
        return 'bg-green-500';
      case 'asset_management':
        return 'bg-purple-500';
      case 'report_management':
        return 'bg-orange-500';
      case 'system':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      case 'login_failed':
        return 'bg-red-100 text-red-800';
      case 'create':
        return 'bg-blue-100 text-blue-800';
      case 'update':
        return 'bg-yellow-100 text-yellow-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      activityType: '',
      searchTerm: '',
    });
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600">Monitor system activity and user actions in real-time</p>
        </div>
        <Button onClick={() => refetch()} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Activity Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.activeSessions}</div>
              <p className="text-xs text-gray-500">Currently online</p>
            </CardContent>
          </Card>

          {summary.activityCounts.map((activity) => (
            <Card key={activity.activityType}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getActivityIcon(activity.activityType)}
                  {activity.activityType.replace('_', ' ')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activity.count}</div>
                <p className="text-xs text-gray-500">Last 24 hours</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Activity Type</label>
              <Select value={filters.activityType || "all"} onValueChange={(value) => setFilters({ ...filters, activityType: value === "all" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                  <SelectItem value="user_management">User Management</SelectItem>
                  <SelectItem value="asset_management">Asset Management</SelectItem>
                  <SelectItem value="report_management">Report Management</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search logs..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Logs
          </CardTitle>
          <CardDescription>
            Real-time activity monitoring ({filteredLogs.length} entries)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-8">Loading activity logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No activity logs found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${getActivityColor(log.activityType)}`}>
                        {getActivityIcon(log.activityType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getActionBadgeColor(log.action)}>
                            {log.action.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm font-medium">
                            {log.user.firstName} {log.user.lastName} (@{log.user.username})
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {log.user.role}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {log.resourceType && log.resourceName && (
                            <span className="mr-2">
                              {log.resourceType}: {log.resourceName}
                            </span>
                          )}
                          {log.details && (
                            <span className="text-gray-500">
                              {JSON.stringify(log.details, null, 2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(log.createdAt), 'PPp')}
                          </div>
                          {log.ipAddress && (
                            <div className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {log.ipAddress}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </Button>
        <span className="px-4 py-2 text-sm text-gray-600">
          Page {page + 1}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage(p => p + 1)}
          disabled={filteredLogs.length < limit}
        >
          Next
        </Button>
      </div>
    </div>
  );
}