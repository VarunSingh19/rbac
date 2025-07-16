import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Shield, 
  UserX, 
  UserCheck, 
  Mail, 
  Calendar, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react";

interface AccessControlUser {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AccessControl() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, refetch } = useQuery<AccessControlUser[]>({
    queryKey: ["/api/access-control/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/access-control/users");
      const data = await response.json();
      console.log('[ACCESS CONTROL DEBUG] Raw API response:', data);

      // Convert snake_case to camelCase for frontend compatibility
      const convertedUsers = data.map((user: any) => ({
        ...user,
        isActive: user.is_active,
        firstName: user.first_name,
        lastName: user.last_name,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }));

      console.log('[ACCESS CONTROL DEBUG] Converted users:', convertedUsers);
      return convertedUsers;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", `/api/access-control/revoke/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Access Revoked",
        description: "User access has been revoked successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/access-control/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to revoke user access.",
        variant: "destructive",
      });
    },
  });

  const restoreAccessMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", `/api/access-control/restore/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Access Restored",
        description: "User access has been restored successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/access-control/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore user access.",
        variant: "destructive",
      });
    },
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-orange-100 text-orange-800';
      case 'team-leader':
        return 'bg-blue-100 text-blue-800';
      case 'tester':
        return 'bg-green-100 text-green-800';
      case 'client-admin':
        return 'bg-purple-100 text-purple-800';
      case 'client-user':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    return new Date(lastLogin).toLocaleDateString() + ' ' + new Date(lastLogin).toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Access Control</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const activeUsers = users.filter(u => u.isActive).length;
  const revokedUsers = users.filter(u => !u.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Access Control</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {user?.role === 'superadmin' ? 'All Users' : 'Users You Created'}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
              <Shield className="w-12 h-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-3xl font-bold text-green-600">{activeUsers}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revoked Access</p>
                <p className="text-3xl font-bold text-red-600">{revokedUsers}</p>
              </div>
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            User Access Management
          </CardTitle>
          <CardDescription>
            {user?.role === 'superadmin' 
              ? 'Manage access for all users in the system'
              : 'Manage access for users you created'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="font-medium">{user.username}</div>
                        {(user.firstName || user.lastName) && (
                          <div className="text-sm text-gray-500">
                            {[user.firstName, user.lastName].filter(Boolean).join(' ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {user.isActive ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-green-700 font-medium">Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-red-700 font-medium">Revoked</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{formatLastLogin(user.lastLogin)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{formatDate(user.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {/* Debug user status */}
                        {(() => { console.log(`[ACCESS CONTROL DEBUG] User ${user.username} isActive:`, user.isActive, typeof user.isActive); return null; })()}
                        {user.isActive ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <UserX className="w-4 h-4 mr-1" />
                                Revoke
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center space-x-2">
                                  <AlertTriangle className="w-5 h-5 text-red-500" />
                                  <span>Revoke User Access</span>
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to revoke access for user "{user.username}"? 
                                  This will prevent them from logging into the system. You can restore 
                                  their access later if needed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revokeAccessMutation.mutate(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Revoke Access
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Restore
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center space-x-2">
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                  <span>Restore User Access</span>
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to restore access for user "{user.username}"? 
                                  This will allow them to log into the system again.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => restoreAccessMutation.mutate(user.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Restore Access
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {users.length === 0 && (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
              <p className="text-sm text-gray-400 mt-1">
                {user?.role === 'superadmin' 
                  ? 'No users exist in the system yet'
                  : 'You haven\'t created any users yet'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}