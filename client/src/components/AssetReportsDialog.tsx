import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Eye,
  Plus,
  Building,
  Globe,
  Server,
  Smartphone,
  Cpu
} from "lucide-react";
import { format } from "date-fns";
import ReportDetailsDialog from "./ReportDetailsDialog";

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
}

interface AssetReportsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: any;
}

const assetTypeIcons = {
  "web-app": Globe,
  "api": Server,
  "mobile": Smartphone,
  "iot": Cpu,
};

export default function AssetReportsDialog({
  open,
  onOpenChange,
  asset,
}: AssetReportsDialogProps) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportDetailsOpen, setReportDetailsOpen] = useState(false);

  // Fetch reports for this asset
  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ['/api/assets', asset?.id, 'reports'],
    enabled: !!asset?.id && open,
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

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setReportDetailsOpen(true);
  };

  if (!asset) return null;

  const AssetIcon = assetTypeIcons[asset.assetType as keyof typeof assetTypeIcons] || Globe;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AssetIcon className="w-5 h-5" />
            Reports for {asset.assetName}
          </DialogTitle>
          <DialogDescription>
            All penetration testing reports for this asset
          </DialogDescription>
        </DialogHeader>

        {/* Asset Information */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Asset Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Project</div>
                <div className="font-semibold">{asset.projectName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Asset Type</div>
                <div className="font-semibold">{asset.assetType}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Environment</div>
                <div className="font-semibold">{asset.environment}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Reports</div>
                <div className="font-semibold">{reports.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Reports ({reports.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No reports found</h3>
                <p className="text-gray-600">
                  No penetration testing reports have been created for this asset yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
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
                          <Badge className={getStatusColor(report.currentStatus)}>
                            {report.currentStatus}
                          </Badge>
                          <Badge className={getRiskRatingColor(report.overallRiskRating || 'Good')}>
                            {report.overallRiskRating || 'Good'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-2">Tester</div>
                          <p className="font-medium">{report.testerName}</p>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Report Details Dialog */}
        <ReportDetailsDialog
          open={reportDetailsOpen}
          onOpenChange={setReportDetailsOpen}
          report={selectedReport}
        />
      </DialogContent>
    </Dialog>
  );
}