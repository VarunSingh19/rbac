import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Edit3, 
  Trash2, 
  Bug, 
  ExternalLink,
  Eye,
  EyeOff
} from "lucide-react";
import { format } from "date-fns";
import VulnerabilityFindingForm from "./VulnerabilityFindingForm";

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
  createdById: number;
  createdAt: string;
  updatedAt: string;
  asset?: {
    id: number;
    assetName: string;
    projectName: string;
    assetType: string;
    environment: string;
  };
  createdBy?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
}

interface VulnerabilityFinding {
  id: number;
  reportId: number;
  findingId: string;
  vulnerabilityTitle: string;
  severity: string;
  impact: string;
  likelihood: string;
  category: string;
  vulnerabilityStatus: string;
  numberOfOccurrences: number;
  affectedURLs: string[];
  description: string;
  proofOfConcept: string;
  recommendation: string;
  references: string[];
  additionalNotes: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report | null;
}

export default function ReportDetailsDialog({
  open,
  onOpenChange,
  report,
}: ReportDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<VulnerabilityFinding | null>(null);
  const [findingFormOpen, setFindingFormOpen] = useState(false);

  // Check if current user can edit this report
  const canEditReport = user && report && (
    (user.role === 'tester' && (report.createdById === user.id || report.createdBy?.id === user.id)) ||
    user.role === 'team-leader'
  );

  // Fetch vulnerability findings for this report
  const { data: findings = [], isLoading: findingsLoading } = useQuery<VulnerabilityFinding[]>({
    queryKey: ['/api/reports', report?.id, 'findings'],
    enabled: !!report?.id && open,
  });

  const updateReportMutation = useMutation({
    mutationFn: async (data: Partial<Report>) => {
      const response = await apiRequest("PATCH", `/api/reports/${report?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update report",
        variant: "destructive",
      });
    },
  });

  const deleteFindingMutation = useMutation({
    mutationFn: async (findingId: number) => {
      const response = await apiRequest("DELETE", `/api/findings/${findingId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vulnerability finding deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports', report?.id, 'findings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete vulnerability finding",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      reportTitle: report?.reportTitle || '',
      executiveSummary: report?.executiveSummary || '',
      overallRiskRating: report?.overallRiskRating || '',
      currentStatus: report?.currentStatus || '',
      preparedBy: report?.preparedBy || '',
      reviewedBy: report?.reviewedBy || '',
    },
  });

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
      case 'new': return 'bg-blue-500';
      case 'reopened': return 'bg-yellow-500';
      case 'not fixed': return 'bg-red-500';
      case 'fixed': return 'bg-green-500';
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

  const onSubmit = (data: any) => {
    updateReportMutation.mutate(data);
  };

  const handleAddFinding = () => {
    setSelectedFinding(null);
    setFindingFormOpen(true);
  };

  const handleEditFinding = (finding: VulnerabilityFinding) => {
    setSelectedFinding(finding);
    setFindingFormOpen(true);
  };

  const handleDeleteFinding = (finding: VulnerabilityFinding) => {
    if (confirm('Are you sure you want to delete this vulnerability finding?')) {
      deleteFindingMutation.mutate(finding.id);
    }
  };

  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {report.reportTitle}
          </DialogTitle>
          <DialogDescription>
            Comprehensive report details and vulnerability findings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Report Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Overall Risk Rating</span>
                    <Badge className={getRiskRatingColor(report.overallRiskRating || 'Good')}>
                      {report.overallRiskRating || 'Good'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge variant="outline">{report.currentStatus}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Findings</span>
                    <span className="font-semibold">{report.totalFindings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Test Duration</span>
                    <span className="font-semibold">{report.totalTestDuration || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tester</span>
                    <span className="font-semibold">{report.testerName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Test Period</span>
                    <div className="text-right">
                      <div className="font-semibold">
                        {format(new Date(report.testStartDate), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-sm text-gray-600">
                        to {format(new Date(report.testEndDate), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Prepared By</span>
                    <span className="font-semibold">{report.preparedBy || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Reviewed By</span>
                    <span className="font-semibold">{report.reviewedBy || 'N/A'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Severity Breakdown */}
            {report.severityBreakdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Severity Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-4">
                    {Object.entries(report.severityBreakdown).map(([severity, count]) => (
                      <div key={severity} className="text-center">
                        <div className={`w-12 h-12 rounded-full ${getSeverityColor(severity)} flex items-center justify-center text-white font-bold text-lg mx-auto mb-2`}>
                          {count}
                        </div>
                        <div className="text-sm font-medium capitalize">{severity}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Asset Information */}
            {report.asset && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Asset Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Asset Name</div>
                      <div className="font-semibold">{report.asset.assetName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Project</div>
                      <div className="font-semibold">{report.asset.projectName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Type</div>
                      <div className="font-semibold">{report.asset.assetType}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Environment</div>
                      <div className="font-semibold">{report.asset.environment}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Executive Summary */}
            {report.executiveSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{report.executiveSummary}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="findings" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Vulnerability Findings</h3>
              <Button onClick={handleAddFinding} size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Finding
              </Button>
            </div>

            {findingsLoading ? (
              <div className="text-center py-8">Loading findings...</div>
            ) : findings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Bug className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No findings yet</h3>
                  <p className="text-gray-600 mb-4">
                    Add vulnerability findings to this report
                  </p>
                  <Button onClick={handleAddFinding}>Add First Finding</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {findings.map((finding) => (
                  <Card key={finding.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{finding.vulnerabilityTitle}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getSeverityColor(finding.severity)}>
                              {finding.severity}
                            </Badge>
                            <Badge className={getStatusColor(finding.vulnerabilityStatus)}>
                              {finding.vulnerabilityStatus}
                            </Badge>
                            <Badge variant="outline">{finding.findingId}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditFinding(finding)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteFinding(finding)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Impact / Likelihood</div>
                          <div className="font-semibold">{finding.impact} / {finding.likelihood}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Category</div>
                          <div className="font-semibold">{finding.category || 'N/A'}</div>
                        </div>
                      </div>
                      
                      {finding.description && (
                        <div className="mt-4">
                          <div className="text-sm text-gray-600 mb-1">Description</div>
                          <p className="text-sm line-clamp-3">{finding.description}</p>
                        </div>
                      )}
                      
                      {finding.affectedURLs && finding.affectedURLs.length > 0 && (
                        <div className="mt-4">
                          <div className="text-sm text-gray-600 mb-1">Affected URLs ({finding.affectedURLs.length})</div>
                          <div className="flex flex-wrap gap-1">
                            {finding.affectedURLs.slice(0, 3).map((url, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {url}
                              </Badge>
                            ))}
                            {finding.affectedURLs.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{finding.affectedURLs.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Report Details</h3>
              {!isEditing && canEditReport && (
                <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Report
                </Button>
              )}
              {isEditing && (
                <div className="flex gap-2">
                  <Button onClick={() => setIsEditing(false)} size="sm" variant="outline">
                    Cancel
                  </Button>
                  <Button onClick={form.handleSubmit(onSubmit)} size="sm">
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

            {isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="reportTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Report Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="executiveSummary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Executive Summary</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={5} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="overallRiskRating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overall Risk Rating</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Good">Good</SelectItem>
                              <SelectItem value="Not Good">Not Good</SelectItem>
                              <SelectItem value="Critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="currentStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Draft">Draft</SelectItem>
                              <SelectItem value="In Review">In Review</SelectItem>
                              {user?.role !== 'tester' && (
                                <SelectItem value="Final">Final</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="preparedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prepared By</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="reviewedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reviewed By</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Report Created</div>
                        <div className="font-semibold">
                          {format(new Date(report.createdAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Last Updated</div>
                        <div className="font-semibold">
                          {format(new Date(report.updatedAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                      {report.reportFinalizedDate && (
                        <div>
                          <div className="text-sm text-gray-600">Finalized Date</div>
                          <div className="font-semibold">
                            {format(new Date(report.reportFinalizedDate), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      )}
                      {report.nextScheduledTest && (
                        <div>
                          <div className="text-sm text-gray-600">Next Scheduled Test</div>
                          <div className="font-semibold">
                            {format(new Date(report.nextScheduledTest), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {report.distributionEmails && report.distributionEmails.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Distribution List</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {report.distributionEmails.map((email, index) => (
                          <Badge key={index} variant="outline">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <VulnerabilityFindingForm
          open={findingFormOpen}
          onOpenChange={setFindingFormOpen}
          reportId={report.id}
          finding={selectedFinding}
        />
      </DialogContent>
    </Dialog>
  );
}