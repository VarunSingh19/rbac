import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
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
  CheckCircle,
  FileText,
  Plus,
  Eye
} from "lucide-react";
import CreateReportDialog from "@/components/CreateReportDialog";
import AssetReportsDialog from "@/components/AssetReportsDialog";

const assetTypeIcons = {
  "web-app": Globe,
  "api": Server,
  "mobile": Smartphone,
  "iot": Cpu,
};

export default function MyAssignedTasks() {
  return (
    <ProtectedRoute 
      allowedRoles={["tester"]} 
      fallbackMessage="Only testers can view their assigned tasks"
    >
      <AssignedTasksContent />
    </ProtectedRoute>
  );
}

function AssignedTasksContent() {
  const { user } = useAuth();
  const [createReportOpen, setCreateReportOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetReportsOpen, setAssetReportsOpen] = useState(false);

  const { data: assignedTasks = [], isLoading } = useQuery({
    queryKey: ['/api/my-assigned-tasks'],
  });

  const handleCreateReport = (asset: any) => {
    setSelectedAsset(asset);
    setCreateReportOpen(true);
  };

  const handleViewReports = (asset: any) => {
    setSelectedAsset(asset);
    setAssetReportsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading your assigned tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Assigned Tasks</h1>
        <p className="text-gray-600 mt-2">Tasks assigned to you for testing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Assigned Tasks ({assignedTasks.length})
          </CardTitle>
          <CardDescription>
            Review and execute your assigned testing tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedTasks && assignedTasks.length > 0 ? (
            <div className="space-y-6">
              {assignedTasks.map((task: any) => {
                const projectOwner = task.projectOwner;
                const assignedBy = task.assignedBy;
                const assignedTesterBy = task.assignedTesterBy;
                const AssetIcon = assetTypeIcons[task.assetType as keyof typeof assetTypeIcons] || Globe;

                return (
                  <div key={task.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <AssetIcon className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{task.assetName}</h3>
                          <p className="text-sm text-gray-600">{task.projectName}</p>
                          {task.projectDescription && (
                            <p className="text-sm text-gray-500 mt-1">{task.projectDescription}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="default" className="text-xs">
                        Testing Task
                      </Badge>
                    </div>

                    {/* Assignment Chain */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-green-50 rounded-lg">
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
                          Assigned by Admin
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
                      <div>
                        <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Assigned by Team Leader
                        </label>
                        <div className="mt-1 text-sm text-gray-900">
                          {assignedTesterBy ? (
                            <div className="flex items-center gap-2">
                              <span>
                                {`${assignedTesterBy.firstName || ''} ${assignedTesterBy.lastName || ''}`.trim() || assignedTesterBy.username}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                Team Leader
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
                            {task.environment ?
                              task.environment.charAt(0).toUpperCase() + task.environment.slice(1)
                              : 'Not specified'
                            }
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Scan Frequency</label>
                        <div className="mt-1">
                          <Badge variant="secondary">
                            {task.scanFrequency ?
                              task.scanFrequency.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                              : 'Not specified'
                            }
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Plan Tier</label>
                        <div className="mt-1">
                          <Badge>
                            {task.planTier ?
                              task.planTier.charAt(0).toUpperCase() + task.planTier.slice(1)
                              : 'Not specified'
                            }
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Tests/Month</label>
                        <div className="mt-1 text-sm text-gray-900">
                          {task.testsPerMonth || "N/A"}
                        </div>
                      </div>
                    </div>

                    {task.assetURL && (
                      <div className="pt-4 border-t mt-4">
                        <label className="text-sm font-medium text-gray-600">Target URL</label>
                        <div className="mt-1">
                          <a 
                            href={task.assetURL} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-mono bg-gray-100 px-2 py-1 rounded"
                          >
                            {task.assetURL}
                          </a>
                        </div>
                      </div>
                    )}

                    {task.technologyStack && Array.isArray(task.technologyStack) && task.technologyStack.length > 0 && (
                      <div className="pt-4 border-t mt-4">
                        <label className="text-sm font-medium text-gray-600">Technology Stack</label>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {task.technologyStack.map((tech: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {task.scopeInclusions && (
                      <div className="pt-4 border-t mt-4">
                        <label className="text-sm font-medium text-gray-600">Scope Inclusions</label>
                        <div className="mt-1 text-sm text-gray-700 bg-green-50 p-3 rounded">
                          {task.scopeInclusions}
                        </div>
                      </div>
                    )}

                    {task.scopeExclusions && (
                      <div className="pt-4 border-t mt-4">
                        <label className="text-sm font-medium text-gray-600">Scope Exclusions</label>
                        <div className="mt-1 text-sm text-gray-700 bg-red-50 p-3 rounded">
                          {task.scopeExclusions}
                        </div>
                      </div>
                    )}

                    {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
                      <div className="pt-4 border-t mt-4">
                        <label className="text-sm font-medium text-gray-600">Tags</label>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {task.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-4 border-t mt-4 flex justify-between items-center">
                      <div className="text-xs text-gray-500 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Created {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                        {task.assignedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Assigned to Team Leader {new Date(task.assignedAt).toLocaleDateString()}
                          </span>
                        )}
                        {task.assignedTesterAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Assigned to You {new Date(task.assignedTesterAt).toLocaleDateString()}
                          </span>
                        )}
                        {task.contractExpiryDate && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <Calendar className="w-3 h-3" />
                            Contract expires {new Date(task.contractExpiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReports(task)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Reports
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleCreateReport(task)}
                          className="flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Create Report
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No tasks assigned yet</p>
              <p className="text-sm">Tasks will appear here once a team leader assigns them to you</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateReportDialog
        open={createReportOpen}
        onOpenChange={setCreateReportOpen}
        assignedTasks={selectedAsset ? [selectedAsset] : []}
      />

      <AssetReportsDialog
        open={assetReportsOpen}
        onOpenChange={setAssetReportsOpen}
        asset={selectedAsset}
      />
    </div>
  );
}