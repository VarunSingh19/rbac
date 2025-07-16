import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import ProtectedRoute from "@/components/ProtectedRoute";
import { registerSchema, type RegisterData, type User, roleHierarchy } from "@shared/schema";
import { 
  Users, 
  UserPlus, 
  Eye, 
  EyeOff, 
  Copy, 
  Shield,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Network,
  TreePine,
  UserCheck,
  ArrowRight,
  Link,
  Unlink,
  UserX,
  AlertTriangle
} from "lucide-react";

interface CreatedUser extends User {
  plainPassword?: string;
}

interface UserHierarchy extends CreatedUser {
  children?: UserHierarchy[];
}

export default function UserManagement() {
  return (
    <ProtectedRoute 
      allowedRoles={["superadmin", "admin", "team-leader", "client-admin"]} 
      fallbackMessage="Only administrators and team leaders can manage users"
    >
      <UserManagementContent />
    </ProtectedRoute>
  );
}

function UserManagementContent() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CreatedUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  // Get allowed roles based on current user's role
  const getAllowedRoles = () => {
    if (!currentUser) return [];
    
    switch (currentUser.role) {
      case "superadmin":
        return ["admin"];
      case "admin":
        return ["team-leader", "tester", "client-admin"];
      case "team-leader":
        return ["tester"];
      case "client-admin":
        return ["client-user"];
      default:
        return [];
    }
  };

  const allowedRoles = getAllowedRoles();

  // Fetch created users
  const { data: createdUsers, isLoading, refetch } = useQuery<CreatedUser[]>({
    queryKey: ["/api/users/created"],
    enabled: allowedRoles.length > 0,
  });

  // Fetch user hierarchy 
  const { data: userHierarchy, isLoading: hierarchyLoading, refetch: refetchHierarchy } = useQuery<UserHierarchy[]>({
    queryKey: ["/api/users/hierarchy"],
    enabled: allowedRoles.length > 0,
  });

  // Fetch assigned users (users assigned to current user)
  const { data: assignedUsers, isLoading: assignedLoading, refetch: refetchAssigned } = useQuery<CreatedUser[]>({
    queryKey: ["/api/users/assigned"],
    enabled: allowedRoles.length > 0,
  });

  // Fetch assignable users for specific roles
  const { data: assignableTesters } = useQuery<CreatedUser[]>({
    queryKey: ["/api/users/assignable/tester"],
    enabled: currentUser?.role === "admin" && allowedRoles.includes("tester"),
  });

  const { data: assignableTeamLeaders } = useQuery<CreatedUser[]>({
    queryKey: ["/api/users/assignable/team-leader"],
    enabled: currentUser?.role === "admin" && allowedRoles.includes("team-leader"),
  });

  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      role: allowedRoles[0] as any || "client-user",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await apiRequest("POST", "/api/users/create", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "User Created Successfully",
        description: `${data.user.username} has been created with the password shown below.`,
      });
      setShowCreateDialog(false);
      form.reset();
      refetch();
      refetchHierarchy();
      refetchAssigned();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create User",
        description: error.message || "An error occurred while creating the user.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "User has been successfully deleted.",
      });
      refetch();
      refetchHierarchy();
      refetchAssigned();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete User",
        description: error.message || "An error occurred while deleting the user.",
        variant: "destructive",
      });
    },
  });

  const revokeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/access-control/revoke/${userId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Revoked",
        description: "User access has been revoked successfully.",
      });
      refetch();
      refetchHierarchy();
      refetchAssigned();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Revoke User",
        description: error.message || "An error occurred while revoking the user.",
        variant: "destructive",
      });
    },
  });

  // Assignment mutation
  const assignUserMutation = useMutation({
    mutationFn: async ({ assignedUserId, assigneeId }: { assignedUserId: number; assigneeId: number }) => {
      const response = await apiRequest("POST", "/api/users/assign", { assignedUserId, assigneeId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Assigned Successfully",
        description: "The user has been assigned to the team leader.",
      });
      setShowAssignDialog(false);
      setSelectedUser(null);
      refetch();
      refetchHierarchy();
      refetchAssigned();
      queryClient.invalidateQueries({ queryKey: ["/api/users/assignable"] });
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterData) => {
    createUserMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Password copied to clipboard",
    });
  };

  const getPageTitle = () => {
    switch (currentUser?.role) {
      case "superadmin":
        return "Admin Management";
      case "admin":
        return "User Management";
      case "team-leader":
        return "Tester Management";
      case "client-admin":
        return "Team Management";
      default:
        return "User Management";
    }
  };

  const getCreateButtonText = () => {
    switch (currentUser?.role) {
      case "superadmin":
        return "Create Admin";
      case "admin":
        return "Create User";
      case "team-leader":
        return "Create Tester";
      case "client-admin":
        return "Create Team Member";
      default:
        return "Create User";
    }
  };

  if (allowedRoles.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage users in your organization</p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>You don't have permission to create or manage users.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{getPageTitle()}</h1>
          <p className="text-gray-600">Create and manage users you can oversee</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => { refetch(); refetchHierarchy(); refetchAssigned(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                {getCreateButtonText()}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{getCreateButtonText()}</DialogTitle>
                <DialogDescription>
                  Create a new user account. The password will be displayed after creation.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="Enter first name"
                      {...form.register("firstName")}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-sm text-red-600">{form.formState.errors.firstName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Enter last name"
                      {...form.register("lastName")}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-sm text-red-600">{form.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Choose a username"
                    {...form.register("username")}
                  />
                  {form.formState.errors.username && (
                    <p className="text-sm text-red-600">{form.formState.errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={form.watch("role")}
                    onValueChange={(value) => form.setValue("role", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.role && (
                    <p className="text-sm text-red-600">{form.formState.errors.role.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        {...form.register("password")}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm the password"
                        {...form.register("confirmPassword")}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    {form.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600">{form.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <UserPlus className="w-4 h-4" />
                        <span>Create User</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* User Hierarchy View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TreePine className="w-5 h-5 mr-2" />
            User Hierarchy
          </CardTitle>
          <CardDescription>
            Complete hierarchy of users you've created and their sub-users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hierarchyLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-lg" />
              ))}
            </div>
          ) : userHierarchy && userHierarchy.length > 0 ? (
            <div className="space-y-4">
              {userHierarchy.map((user) => (
                <UserHierarchyCard 
                  key={user.id} 
                  user={user} 
                  level={0}
                  onDelete={(userId) => deleteUserMutation.mutate(userId)}
                  onCopy={copyToClipboard}
                  onAssign={(user) => {
                    setSelectedUser(user);
                    setShowAssignDialog(true);
                  }}
                  currentUserRole={currentUser?.role}
                  deleteLoading={deleteUserMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Network className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No user hierarchy yet</p>
              <p className="text-sm">Create users to see the hierarchy tree</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Users (only show for team leaders and below) */}
      {currentUser?.role !== "superadmin" && currentUser?.role !== "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="w-5 h-5 mr-2" />
              Assigned Users
            </CardTitle>
            <CardDescription>
              Users that have been assigned to you for management
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignedLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 h-16 rounded-lg" />
                ))}
              </div>
            ) : assignedUsers && assignedUsers.length > 0 ? (
              <div className="space-y-4">
                {assignedUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}`
                              : user.username
                            }
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">
                          {user.role.replace('-', ' ')}
                        </Badge>
                        <Badge variant="secondary">
                          Assigned
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t bg-green-50 rounded p-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Username</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="text-sm bg-gray-200 px-2 py-1 rounded flex-1">
                            {user.username}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(user.username)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-600">Assigned At</label>
                        <div className="text-sm text-gray-500 mt-1">
                          {user.assignedAt ? new Date(user.assignedAt).toLocaleDateString() : 'Recently'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No users assigned to you yet</p>
                <p className="text-sm">Users will appear here when assigned by your manager</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Direct Created Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Directly Created Users
          </CardTitle>
          <CardDescription>
            Users you have directly created with their login credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 h-16 rounded-lg" />
              ))}
            </div>
          ) : createdUsers && createdUsers.length > 0 ? (
            <div className="space-y-4">
              {createdUsers.map((user) => (
                <div key={user.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.username
                          }
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="capitalize">
                        {user.role.replace('-', ' ')}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeUserMutation.mutate(user.id)}
                        disabled={revokeUserMutation.isPending}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteUserMutation.mutate(user.id)}
                        disabled={deleteUserMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t bg-gray-50 rounded p-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Username</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <code className="text-sm bg-gray-200 px-2 py-1 rounded flex-1">
                          {user.username}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(user.username)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {user.plainPassword && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Password</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="text-sm bg-gray-200 px-2 py-1 rounded flex-1">
                            {user.plainPassword}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(user.plainPassword!)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No users created yet</p>
              <p className="text-sm">Click "Create User" to get started</p>
            </div>
          )}
        </CardContent>
      </Card>



      {/* Assignment Dialog */}
      {selectedUser && (
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign User</DialogTitle>
              <DialogDescription>
                Assign {selectedUser.username} ({selectedUser.role}) to a team leader
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Select Team Leader to assign to:</Label>
                <div className="space-y-2 mt-2">
                  {assignableTeamLeaders && assignableTeamLeaders.length > 0 ? (
                    assignableTeamLeaders.map((teamLeader) => (
                      <div key={teamLeader.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{teamLeader.username}</div>
                          <div className="text-sm text-gray-500">{teamLeader.email}</div>
                          <Badge variant="outline">{teamLeader.role}</Badge>
                        </div>
                        <Button
                          onClick={() => {
                            if (selectedUser) {
                              assignUserMutation.mutate({
                                assignedUserId: selectedUser.id,
                                assigneeId: teamLeader.id
                              });
                            }
                          }}
                          disabled={assignUserMutation.isPending}
                        >
                          {assignUserMutation.isPending ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Link className="w-4 h-4 mr-2" />
                              Assign
                            </>
                          )}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>No team leaders available for assignment</p>
                      <p className="text-sm">Create team leaders first to assign users to them</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Component for displaying user hierarchy cards
function UserHierarchyCard({ 
  user, 
  level, 
  onDelete, 
  onCopy, 
  onAssign,
  currentUserRole,
  deleteLoading 
}: { 
  user: UserHierarchy; 
  level: number; 
  onDelete: (userId: number) => void;
  onCopy: (text: string) => void;
  onAssign?: (user: UserHierarchy) => void;
  currentUserRole?: string;
  deleteLoading: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = user.children && user.children.length > 0;
  
  const getRoleColor = (role: string) => {
    const colors = {
      'superadmin': 'bg-red-100 text-red-800 border-red-200',
      'admin': 'bg-purple-100 text-purple-800 border-purple-200',
      'team-leader': 'bg-blue-100 text-blue-800 border-blue-200',
      'tester': 'bg-green-100 text-green-800 border-green-200',
      'client-admin': 'bg-orange-100 text-orange-800 border-orange-200',
      'client-user': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className={`border rounded-lg ${level > 0 ? 'ml-6 border-l-4 border-l-blue-200' : ''}`}>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 h-8 w-8"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            )}
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user.username
                }
              </p>
              <p className="text-sm text-gray-500">{user.email}</p>
              {hasChildren && (
                <p className="text-xs text-blue-600">
                  {user.children!.length} subordinate{user.children!.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`capitalize ${getRoleColor(user.role)}`}>
              {user.role.replace('-', ' ')}
            </Badge>
            {onAssign && currentUserRole === "admin" && user.role === "tester" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAssign(user)}
              >
                <Link className="w-4 h-4 mr-1" />
                Assign
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(user.id)}
              disabled={deleteLoading}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t bg-gray-50 rounded p-3">
          <div>
            <label className="text-sm font-medium text-gray-600">Username</label>
            <div className="flex items-center space-x-2 mt-1">
              <code className="text-sm bg-gray-200 px-2 py-1 rounded flex-1">
                {user.username}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(user.username)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {user.plainPassword && (
            <div>
              <label className="text-sm font-medium text-gray-600">Password</label>
              <div className="flex items-center space-x-2 mt-1">
                <code className="text-sm bg-gray-200 px-2 py-1 rounded flex-1">
                  {user.plainPassword}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(user.plainPassword!)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Children hierarchy */}
      {hasChildren && isExpanded && (
        <div className="border-t bg-gray-50/50 p-2">
          <div className="space-y-2">
            {user.children!.map((child) => (
              <UserHierarchyCard
                key={child.id}
                user={child}
                level={level + 1}
                onDelete={onDelete}
                onCopy={onCopy}
                onAssign={onAssign}
                currentUserRole={currentUserRole}
                deleteLoading={deleteLoading}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}