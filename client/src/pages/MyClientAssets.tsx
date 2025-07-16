import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Eye, MessageSquare, Plus, Calendar, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AssignedAsset {
  id: number;
  projectName: string;
  assetName: string;
  assetType: string;
  environment: string;
  projectOwner: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  assignedBy: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  assignment: {
    id: number;
    assignedAt: string;
    status: string;
    notes: string;
  };
}

interface Report {
  id: number;
  reportTitle: string;
  associatedAssetId: number;
  currentStatus: string;
  overallRiskRating: string;
  createdAt: string;
  testerName: string;
  executiveSummary: string;
}

interface ReportNote {
  id: number;
  reportId: number;
  assetId: number;
  authorId: number;
  noteContent: string;
  noteType: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export default function MyClientAssets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState<AssignedAsset | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState('Review');
  const [newNotePriority, setNewNotePriority] = useState('Medium');

  // Fetch assigned assets
  const { data: assignedAssets = [], isLoading: assetsLoading } = useQuery<AssignedAsset[]>({
    queryKey: ['/api/my-client-team-assets'],
    enabled: user?.role === 'client-user'
  });

  // Fetch reports for selected asset
  const { data: reports = [], isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ['/api/assets', selectedAsset?.id, 'reports'],
    enabled: !!selectedAsset
  });

  // Fetch notes for selected report
  const { data: reportNotes = [], isLoading: notesLoading } = useQuery<ReportNote[]>({
    queryKey: ['/api/reports', selectedReport?.id, 'notes'],
    enabled: !!selectedReport
  });

  // Create a new note
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: { reportId: number; assetId: number; noteContent: string; noteType: string; priority: string }) => {
      return apiRequest('POST', `/api/reports/${noteData.reportId}/notes`, noteData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Note added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports', selectedReport?.id, 'notes'] });
      setNoteDialogOpen(false);
      setNewNoteContent('');
      setNewNoteType('Review');
      setNewNotePriority('Medium');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    }
  });

  const handleCreateNote = () => {
    if (!selectedReport || !selectedAsset || !newNoteContent.trim()) return;
    
    createNoteMutation.mutate({
      reportId: selectedReport.id,
      assetId: selectedAsset.id,
      noteContent: newNoteContent,
      noteType: newNoteType,
      priority: newNotePriority
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string | undefined | null) => {
    switch ((status || '').toLowerCase()) {
      case 'draft': return 'bg-gray-500';
      case 'in review': return 'bg-yellow-500';
      case 'final': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRiskRatingColor = (rating: string | undefined | null) => {
    switch ((rating || '').toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'not good': return 'bg-orange-500';
      case 'good': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (user?.role !== 'client-user') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Assigned Assets</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Assigned Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assetsLoading ? (
              <div className="text-center py-8">Loading assets...</div>
            ) : assignedAssets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No assets assigned to you
              </div>
            ) : (
              <div className="space-y-3">
                {assignedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedAsset?.id === asset.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{asset.project_name}</h3>
                      <p className="text-sm text-gray-600">{asset.asset_name}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{asset.asset_type}</Badge>
                        <Badge variant="outline">{asset.environment}</Badge>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Owner: {asset.projectOwner.username}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>Assigned: {new Date(asset.assignment.assignedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Reports
              {selectedAsset && (
                <span className="text-sm font-normal text-gray-500">
                  for {selectedAsset.project_name}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedAsset ? (
              <div className="text-center py-8 text-gray-500">
                Select an asset to view reports
              </div>
            ) : reportsLoading ? (
              <div className="text-center py-8">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No reports found for this asset
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedReport?.id === report.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{report.report_title}</h3>
                      <p className="text-sm text-gray-600">By: {report.tester_name}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge className={getStatusColor(report.current_status)}>
                          {report.current_status}
                        </Badge>
                        <Badge className={getRiskRatingColor(report.overall_risk_rating)}>
                          {report.overall_risk_rating}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Notes
              {selectedReport && (
                <span className="text-sm font-normal text-gray-500">
                  for {selectedReport.reportTitle}
                </span>
              )}
            </CardTitle>
            {selectedReport && (
              <Button
                onClick={() => setNoteDialogOpen(true)}
                className="flex items-center gap-2"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                Add Note
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedReport ? (
              <div className="text-center py-8 text-gray-500">
                Select a report to view notes
              </div>
            ) : notesLoading ? (
              <div className="text-center py-8">Loading notes...</div>
            ) : reportNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No notes found for this report
              </div>
            ) : (
              <div className="space-y-3">
                {reportNotes.map((note) => (
                  <div key={note.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-2">
                        <Badge variant="outline">{note.noteType}</Badge>
                        <Badge className={getPriorityColor(note.priority)}>
                          {note.priority}
                        </Badge>
                      </div>
                      <Badge variant={note.status === 'Open' ? 'default' : 'secondary'}>
                        {note.status}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{note.noteContent}</p>
                    <div className="text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>By: {note.author.first_name} {note.author.last_name}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(note.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note to Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReport && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold">{selectedReport.reportTitle}</h3>
                <p className="text-sm text-gray-600">By: {selectedReport.testerName}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Note Content:</label>
              <Textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Enter your note here..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Note Type:</label>
                <Select value={newNoteType} onValueChange={setNewNoteType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Review">Review</SelectItem>
                    <SelectItem value="Feedback">Feedback</SelectItem>
                    <SelectItem value="Question">Question</SelectItem>
                    <SelectItem value="Concern">Concern</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority:</label>
                <Select value={newNotePriority} onValueChange={setNewNotePriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setNoteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNote}
                disabled={!newNoteContent.trim() || createNoteMutation.isPending}
              >
                {createNoteMutation.isPending ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}