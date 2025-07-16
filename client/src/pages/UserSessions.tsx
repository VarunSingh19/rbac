import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, Activity, Shield, Filter, Search, RefreshCw, Globe, Smartphone, Monitor } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface UserSession {
  id: number;
  userId: number;
  sessionId: string;
  loginTime: string;
  logoutTime?: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  lastActivity: string;
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
    email: string;
  };
}

export default function UserSessions() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    isActive: '',
    searchTerm: '',
  });
  const [page, setPage] = useState(0);
  const [limit] = useState(50);

  // Check if user has permission to access user sessions
  const canViewSessions = user?.role === 'superadmin' || user?.role === 'admin';

  if (!canViewSessions) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Sessions</h1>
          <p className="text-gray-600">Monitor user sessions and login activities</p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>You don't have permission to view user sessions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch user sessions
  const { data: sessions = [], isLoading: sessionsLoading, refetch } = useQuery<UserSession[]>({
    queryKey: ['/api/user-sessions', filters, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.isActive) params.append('isActive', filters.isActive);
      params.append('limit', limit.toString());
      params.append('offset', (page * limit).toString());

      const response = await apiRequest('GET', `/api/user-sessions?${params}`);
      const data = await response.json();
      console.log('[USER SESSIONS DEBUG] Raw API response:', data);

      // Convert snake_case to camelCase for each session
      const convertedSessions = data.map((session: any) => ({
        ...session,
        userId: session.user_id || session.userId,
        sessionId: session.session_id || session.sessionId,
        loginTime: session.login_time || session.loginTime,
        logoutTime: session.logout_time || session.logoutTime,
        lastActivity: session.last_activity || session.lastActivity,
        ipAddress: session.ip_address || session.ipAddress,
        userAgent: session.user_agent || session.userAgent,
        isActive: session.is_active || session.isActive,
      }));

      console.log('[USER SESSIONS DEBUG] Converted sessions:', convertedSessions);
      return convertedSessions;
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Filter sessions based on search term
  const filteredSessions = sessions.filter(session => {
    if (!filters.searchTerm) return true;
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      session.user.username.toLowerCase().includes(searchLower) ||
      session.user.firstName?.toLowerCase().includes(searchLower) ||
      session.user.lastName?.toLowerCase().includes(searchLower) ||
      session.user.email.toLowerCase().includes(searchLower) ||
      session.ipAddress?.toLowerCase().includes(searchLower)
    );
  });

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Monitor className="w-4 h-4" />;
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  const getDeviceInfo = (userAgent?: string) => {
    if (!userAgent) return 'Unknown Device';
    
    const ua = userAgent.toLowerCase();
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    
    // Detect browser
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    
    // Detect OS
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios')) os = 'iOS';
    
    return `${browser} on ${os}`;
  };

  const getSessionDuration = (loginTime: string, logoutTime?: string) => {
    const start = new Date(loginTime);
    const end = logoutTime ? new Date(logoutTime) : new Date();
    const duration = end.getTime() - start.getTime();
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      isActive: '',
      searchTerm: '',
    });
    setPage(0);
  };

  const activeSessions = filteredSessions.filter(s => s.isActive);
  const totalSessions = filteredSessions.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Sessions</h1>
          <p className="text-gray-600">Monitor user sessions and login activities in real-time</p>
        </div>
        <Button onClick={() => refetch()} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Session Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeSessions.length}</div>
            <p className="text-xs text-gray-500">Currently online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-gray-500">In current view</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredSessions.map(s => s.userId)).size}
            </div>
            <p className="text-xs text-gray-500">Different users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredSessions.length > 0 ? 
                Math.round(filteredSessions.reduce((acc, s) => {
                  const duration = s.logoutTime ? 
                    new Date(s.logoutTime).getTime() - new Date(s.loginTime).getTime() :
                    new Date().getTime() - new Date(s.loginTime).getTime();
                  return acc + duration;
                }, 0) / filteredSessions.length / (1000 * 60)) : 0
              }m
            </div>
            <p className="text-xs text-gray-500">Average duration</p>
          </CardContent>
        </Card>
      </div>

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
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.isActive || "all"} onValueChange={(value) => setFilters({ ...filters, isActive: value === "all" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sessions</SelectItem>
                  <SelectItem value="true">Active only</SelectItem>
                  <SelectItem value="false">Ended only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search sessions..."
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

      {/* User Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Sessions
          </CardTitle>
          <CardDescription>
            Real-time session monitoring ({filteredSessions.length} sessions)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="text-center py-8">Loading user sessions...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No user sessions found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getDeviceIcon(session.userAgent)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {session.user.firstName} {session.user.lastName}
                          </span>
                          <span className="text-sm text-gray-500">
                            (@{session.user.username})
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {session.user.role}
                          </Badge>
                          <Badge className={session.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                            {session.isActive ? 'Active' : 'Ended'}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          {getDeviceInfo(session.userAgent)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Login: {format(new Date(session.loginTime), 'PPp')}</span>
                          </div>
                          
                          {session.logoutTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Logout: {format(new Date(session.logoutTime), 'PPp')}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            <span>Duration: {getSessionDuration(session.loginTime, session.logoutTime)}</span>
                          </div>
                          
                          {session.ipAddress && (
                            <div className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              <span>IP: {session.ipAddress}</span>
                            </div>
                          )}
                        </div>
                        
                        {session.isActive && (
                          <div className="mt-2 text-xs text-green-600">
                            Last activity: {(() => {
  const date = new Date(session.lastActivity);
  return isNaN(date.getTime()) ? 'Unknown' : formatDistanceToNow(date, { addSuffix: true });
})()}
                          </div>
                        )}
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
          disabled={filteredSessions.length < limit}
        >
          Next
        </Button>
      </div>
    </div>
  );
}