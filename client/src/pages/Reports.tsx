import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Calendar, AlertTriangle, Clock, CheckCircle, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import CreateReportDialog from "@/components/CreateReportDialog";
import ReportDetailsDialog from "@/components/ReportDetailsDialog";

interface Report {
  id: number;
  reportTitle: string;
  associatedAssetId: number;
  testerName: string;
  testStartDate: string;
  testEndDate: string;
  totalTestDuration: string;
  executiveSummary: string;
  totalFindings: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  overallRiskRating: string;
  currentStatus: string;
  preparedBy: string;
  reviewedBy: string;
  reportFinalizedDate: string;
  nextScheduledTest: string;
  distributionEmails: string[];
  createdAt: string;
  updatedAt: string;
  asset?: {
    id: number;
    assetName: string;
    projectName: string;
    assetType: string;
    environment: string;
  };
}

interface AssignedTask {
  id: number;
  projectName: string;
  assetName: string;
  assetType: string;
  environment: string;
  assignedTesterAt: string;
  projectOwner: {
    username: string;
    firstName: string;
    lastName: string;
  };
  assignedTesterBy: {
    username: string;
    firstName: string;
    lastName: string;
  };
}

export default function Reports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [downloadingReports, setDownloadingReports] = useState<Set<number>>(new Set());

  // PDF download function
  const downloadReportPDF = async (reportId: number) => {
    setDownloadingReports(prev => new Set(prev).add(reportId));
    
    try {
      const response = await fetch(`/api/reports/${reportId}/pdf`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Security_Report_${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "PDF report downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to download PDF report",
        variant: "destructive",
      });
    } finally {
      setDownloadingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };
  const [reportDetailsOpen, setReportDetailsOpen] = useState(false);

  const allowedRoles = ['tester', 'team-leader', 'admin', 'superadmin', 'client-admin'];

  // Fetch reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ['/api/reports'],
    enabled: allowedRoles.includes(user?.role || '')
  });

  // Fetch assigned tasks
  const { data: assignedTasks = [], isLoading: tasksLoading } = useQuery<AssignedTask[]>({
    queryKey: ['/api/my-assigned-tasks'],
    enabled: user?.role === 'tester'
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      return apiRequest('DELETE', `/api/reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/reports/${reportId}`, { currentStatus: status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update report status",
        variant: "destructive",
      });
    },
  });

  const handleCreateReport = () => {
    setCreateDialogOpen(true);
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setReportDetailsOpen(true);
  };

  const handleDeleteReport = async (reportId: number) => {
    if (confirm('Are you sure you want to delete this report?')) {
      deleteReportMutation.mutate(reportId);
    }
  };

  const handleStatusUpdate = (reportId: number, newStatus: string) => {
    updateStatusMutation.mutate({ reportId, status: newStatus });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      case 'info': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-500';
      case 'in review': return 'bg-yellow-500';
      case 'final': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'not good': return 'bg-orange-500';
      case 'good': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (!allowedRoles.includes(user?.role || '')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the reports section.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reports</h1>
        {user?.role === 'tester' && (
          <Button onClick={handleCreateReport} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Report
          </Button>
        )}
      </div>

      <Tabs defaultValue="my-reports" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-reports">
            {user?.role === 'tester' ? 'My Reports' : 
             user?.role === 'team-leader' ? 'All Reports' :
             user?.role === 'client-admin' ? 'My Asset Reports' : 'Final Reports'}
          </TabsTrigger>
          <TabsTrigger value="assigned-tasks">
            {user?.role === 'tester' ? 'Assigned Tasks' : 'Task Management'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-reports" className="space-y-4">
          {reportsLoading ? (
            <div className="text-center py-8">Loading reports...</div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
                <p className="text-gray-600 mb-4">
                  Create your first report to get started
                </p>
                <Button onClick={handleCreateReport}>Create Report</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{report.reportTitle}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(report.testStartDate), 'MMM dd, yyyy')} - {format(new Date(report.testEndDate), 'MMM dd, yyyy')}
                          {report.totalTestDuration && (
                            <>
                              <Clock className="w-4 h-4 ml-2" />
                              {report.totalTestDuration}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="min-w-32">
                          {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'client-admin') ? (
                            <Badge className={getStatusColor(report.currentStatus)}>
                              {report.currentStatus}
                            </Badge>
                          ) : (
                            <Select
                              value={report.currentStatus}
                              onValueChange={(newStatus) => handleStatusUpdate(report.id, newStatus)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Draft">Draft</SelectItem>
                                <SelectItem value="In Review">In Review</SelectItem>
                                {user?.role === 'team-leader' && (
                                  <SelectItem value="Final">Final</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <Badge className={getRiskRatingColor(report.overallRiskRating || 'Good')}>
                          {report.overallRiskRating || 'Good'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Asset Information</div>
                        <p className="font-medium">{report.asset?.assetName || 'N/A'}</p>
                        <p className="text-sm text-gray-600">
                          {report.asset?.projectName} • {report.asset?.assetType} • {report.asset?.environment}
                        </p>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Findings Summary</div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-medium">{report.totalFindings} findings</span>
                        </div>
                        {report.severityBreakdown && (
                          <div className="flex gap-1 mt-2">
                            {Object.entries(report.severityBreakdown).map(([severity, count]) => (
                              count > 0 && (
                                <Badge key={severity} className={getSeverityColor(severity)} variant="secondary">
                                  {severity.charAt(0).toUpperCase() + severity.slice(1)}: {count}
                                </Badge>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {report.executiveSummary && (
                      <div className="mt-4">
                        <div className="text-sm text-gray-600 mb-2">Executive Summary</div>
                        <p className="text-sm line-clamp-2">{report.executiveSummary}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        Created {format(new Date(report.createdAt), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReportPDF(report.id)}
                          disabled={downloadingReports.has(report.id)}
                        >
                          {downloadingReports.has(report.id) ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                          disabled={deleteReportMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assigned-tasks" className="space-y-4">
          {tasksLoading ? (
            <div className="text-center py-8">Loading assigned tasks...</div>
          ) : assignedTasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No assigned tasks</h3>
                <p className="text-gray-600">
                  You don't have any tasks assigned to you yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {assignedTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{task.assetName}</CardTitle>
                        <div className="text-sm text-gray-600 mt-1">
                          Project: {task.projectName}
                        </div>
                      </div>
                      <Badge variant="outline">{task.assetType}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Project Owner</div>
                        <p className="font-medium">
                          {task.projectOwner.firstName} {task.projectOwner.lastName}
                        </p>
                        <p className="text-sm text-gray-600">@{task.projectOwner.username}</p>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Assigned By</div>
                        <p className="font-medium">
                          {task.assignedTesterBy.firstName} {task.assignedTesterBy.lastName}
                        </p>
                        <p className="text-sm text-gray-600">@{task.assignedTesterBy.username}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Assigned {format(new Date(task.assignedTesterAt), 'MMM dd, yyyy')}
                      </div>
                      <Button
                        onClick={() => {
                          setCreateDialogOpen(true);
                          // Pre-select this asset when creating a report
                        }}
                      >
                        Create Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Report Dialog */}
      <CreateReportDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        assignedTasks={assignedTasks}
      />

      {/* Report Details Dialog */}
      <ReportDetailsDialog
        open={reportDetailsOpen}
        onOpenChange={setReportDetailsOpen}
        report={selectedReport}
      />
    </div>
  );
}