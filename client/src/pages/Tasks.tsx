import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ProtectedRoute from "@/components/ProtectedRoute";
import { 
  FolderOpen, 
  Globe,
  Server,
  Smartphone,
  Cpu,
  Calendar,
  Building,
  User,
  Tag,
  Shield,
  Clock,
  UserPlus
} from "lucide-react";
import { type User as UserType } from "@shared/schema";

const assetTypeIcons = {
  "web-app": Globe,
  "api": Server,
  "mobile": Smartphone,
  "iot": Cpu,
};

export default function Tasks() {
  return (
    <ProtectedRoute 
      allowedRoles={["team-leader"]} 
      fallbackMessage="Only team leaders can view and manage tasks"
    >
      <TasksContent />
    </ProtectedRoute>
  );
}

function TasksContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assignedAssets = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/my-tasks'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/my-tasks");
      const data = await response.json();
      console.log('[MY TASKS DEBUG] Raw API response (using direct data):', data);
      return data; // Use data directly from backend
    },
  });

  // Fetch testers for assignment
  const { data: testers = [] } = useQuery<UserType[]>({
    queryKey: ['/api/testers'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/testers");
      const data = await response.json();
      console.log('[TESTERS DEBUG] Raw API response (using direct data):', data);
      return data; // Use data directly from backend
    },
  });

  const assignTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      testerId,
    }: {
      taskId: number;
      testerId: number;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/tasks/${taskId}/assign`,
        { tester_id: testerId },
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Assigned",
        description: "Task has been assigned to tester successfully.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Assign Task",
        description: error.message || "An error occurred while assigning the task.",
        variant: "destructive",
      });
    },
  });

  const unassignTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/tasks/${taskId}/assign`,
        {},
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Unassigned",
        description: "Task has been unassigned from tester successfully.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Unassign Task",
        description: error.message || "An error occurred while unassigning the task.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading your tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-600 mt-2">Assets assigned to you for security testing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Assigned Assets ({assignedAssets.length})
          </CardTitle>
          <CardDescription>
            Review and manage your assigned security testing tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedAssets && assignedAssets.length > 0 ? (
            <div className="space-y-6">
              {assignedAssets.map((asset: any) => {
                const projectOwner = asset.projectOwner;
                const assignedBy = asset.assignedBy;
                const AssetIcon = assetTypeIcons[asset.assetType as keyof typeof assetTypeIcons] || Globe;

                return (
                  <div key={asset.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <AssetIcon className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{asset.assetName}</h3>
                          <p className="text-sm text-gray-600">{asset.projectName}</p>
                          {asset.projectDescription && (
                            <p className="text-sm text-gray-500 mt-1">{asset.projectDescription}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Task Assigned
                      </Badge>
                    </div>

                    {/* Assignment Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-blue-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          Client
                        </label>
                        <div className="mt-1 text-sm text-gray-900">
                          {projectOwner ? 
                            `${projectOwner.firstName || ''} ${projectOwner.lastName || ''}`.trim() || projectOwner.username
                            : 'No client assigned'
                          }
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Assigned By
                        </label>
                        <div className="mt-1 text-sm text-gray-900">
                          {assignedBy ? (
                            <div className="flex items-center gap-2">
                              <span>
                                {`${assignedBy.firstName || ''} ${assignedBy.lastName || ''}`.trim() || assignedBy.username}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {assignedBy.role === 'admin' ? 'Admin' : 
                                 assignedBy.role === 'superadmin' ? 'Super Admin' : 
                                 assignedBy.role}
                              </Badge>
                            </div>
                          ) : 'Unknown'}
                        </div>
                      </div>
                    </div>

                    {/* Asset Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Environment</label>
                        <div className="mt-1">
                          <Badge variant="outline">
                            {asset.environment ?
                              asset.environment.charAt(0).toUpperCase() + asset.environment.slice(1)
                              : 'Not specified'
                            }
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Scan Frequency</label>
                        <div className="mt-1">
                          <Badge variant="secondary">
                            {asset.scanFrequency ?
                              asset.scanFrequency.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                              : 'Not specified'
                            }
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Plan Tier</label>
                        <div className="mt-1">
                          <Badge>
                            {asset.planTier ?
                              asset.planTier.charAt(0).toUpperCase() + asset.planTier.slice(1)
                              : 'Not specified'
                            }
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Tests/Month</label>
                        <div className="mt-1 text-sm text-gray-900">
                          {asset.testsPerMonth || "N/A"}
                        </div>
                      </div>
                    </div>

                    {asset.assetURL && (
                      <div className="pt-4 border-t mt-4">
                        <label className="text-sm font-medium text-gray-600">Target URL</label>
                        <div className="mt-1">
                          <a 
                            href={asset.assetURL} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-mono bg-gray-100 px-2 py-1 rounded"
                          >
                            {asset.assetURL}
                          </a>
                        </div>
                      </div>
                    )}

                    {asset.technologyStack && Array.isArray(asset.technologyStack) && asset.technologyStack.length > 0 && (
                      <div className="pt-4 border-t mt-4">
                        <label className="text-sm font-medium text-gray-600">Technology Stack</label>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {asset.technologyStack.map((tech: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {asset.scopeInclusions && (
                      <div className="pt-4 border-t mt-4">
                        <label className="text-sm font-medium text-gray-600">Scope Inclusions</label>
                        <div className="mt-1 text-sm text-gray-700 bg-green-50 p-3 rounded">
                          {asset.scopeInclusions}
                        </div>
                      </div>
                    )}

                    {asset.scopeExclusions && (
                      <div className="pt-4 border-t mt-4">
                        <label className="text-sm font-medium text-gray-600">Scope Exclusions</label>
                        <div className="mt-1 text-sm text-gray-700 bg-red-50 p-3 rounded">
                          {asset.scopeExclusions}
                        </div>
                      </div>
                    )}

                    {asset.tags && Array.isArray(asset.tags) && asset.tags.length > 0 && (
                      <div className="pt-4 border-t mt-4">
                        <label className="text-sm font-medium text-gray-600">Tags</label>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {asset.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tester Assignment Section */}
                    <div className="pt-4 border-t mt-4">
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-3">
                        <UserPlus className="w-4 h-4" />
                        Tester Assignment
                      </label>
                      <div className="flex items-center gap-3">
                        {asset.assigned_tester ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="text-xs">
                                Assigned to:
                              </Badge>
                              <span className="text-sm font-medium">
                                {(() => {
                                  console.log('[TESTER DEBUG] assigned_tester object:', asset.assigned_tester);
                                  const firstName = asset.assigned_tester.first_name || asset.assigned_tester.firstName || '';
                                  const lastName = asset.assigned_tester.last_name || asset.assigned_tester.lastName || '';
                                  const fullName = `${firstName} ${lastName}`.trim();
                                  console.log('[TESTER DEBUG] firstName:', firstName, 'lastName:', lastName, 'fullName:', fullName);
                                  return fullName || asset.assigned_tester.username || 'Unknown Tester';
                                })()}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                Tester
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unassignTaskMutation.mutate(asset.id)}
                              disabled={unassignTaskMutation.isPending}
                            >
                              {unassignTaskMutation.isPending ? "Unassigning..." : "Unassign"}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              Not assigned to any tester
                            </Badge>
                            <Select
                              onValueChange={(value) => 
                                assignTaskMutation.mutate({
                                  taskId: asset.id,
                                  testerId: parseInt(value)
                                })
                              }
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select a tester" />
                              </SelectTrigger>
                              <SelectContent>
                                {testers.map((tester) => (
                                  <SelectItem key={tester.id} value={tester.id.toString()}>
                                    {`${tester.firstName || ''} ${tester.lastName || ''}`.trim() || tester.username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t mt-4 text-xs text-gray-500 flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Created {new Date(asset.createdAt).toLocaleDateString()}
                      </span>
                      {asset.assignedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Assigned {new Date(asset.assignedAt).toLocaleDateString()}
                        </span>
                      )}
                      {asset.contractExpiryDate && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <Calendar className="w-3 h-3" />
                          Contract expires {new Date(asset.contractExpiryDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No tasks assigned yet</p>
              <p className="text-sm">Assets will appear here once an admin assigns them to you</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}