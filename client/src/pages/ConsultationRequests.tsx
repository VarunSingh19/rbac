import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import ProtectedRoute from "@/components/ProtectedRoute";
import { type ConsultationRequest } from "@shared/schema";
import { 
  FileText, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Filter
} from "lucide-react";
import { format } from "date-fns";

interface ConsultationRequestWithUser extends ConsultationRequest {
  statusUpdatedByUser?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
}

export default function ConsultationRequests() {
  return (
    <ProtectedRoute 
      allowedRoles={["superadmin", "admin"]} 
      fallbackMessage="Only administrators can view consultation requests"
    >
      <ConsultationRequestsContent />
    </ProtectedRoute>
  );
}

function ConsultationRequestsContent() {
  const [selectedRequest, setSelectedRequest] = useState<ConsultationRequestWithUser | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusNotes, setStatusNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, error } = useQuery<ConsultationRequestWithUser[]>({
    queryKey: ["/api/consultation-requests"],
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      return apiRequest("PATCH", `/api/consultation-requests/${id}/status`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultation-requests"] });
      toast({
        title: "Success",
        description: "Request status updated successfully",
      });
      setShowStatusDialog(false);
      setStatusNotes("");
      setNewStatus("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/consultation-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultation-requests"] });
      toast({
        title: "Success",
        description: "Request deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete request",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case "under-review":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "under-review":
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case "rejected":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesSearch = searchQuery === "" || 
      request.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.service.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const handleUpdateStatus = (request: ConsultationRequestWithUser, status: string) => {
    setSelectedRequest(request);
    setNewStatus(status);
    setStatusNotes(request.notes || "");
    setShowStatusDialog(true);
  };

  const handleDeleteRequest = (id: number) => {
    if (window.confirm("Are you sure you want to delete this consultation request?")) {
      deleteRequestMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-4">Error loading consultation requests</div>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Consultation Requests</h1>
          <p className="text-gray-200 mt-1">Manage and review consultation requests from potential clients</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under-review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-100 ">Total Requests</p>
                <p className="text-2xl font-bold text-gray-100">{requests.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-200">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {requests.filter(r => r.status === "pending").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-200">Under Review</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {requests.filter(r => r.status === "under-review").length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-200">Approved</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {requests.filter(r => r.status === "approved").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 dark:text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No consultation requests found</p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 dark:bg-blue-200 rounded-full p-2">
                      {getStatusIcon(request.status)}
                    </div>
                    <div>
                      <CardTitle className="text-lg dark:text-gray-100">{request.full_name}</CardTitle>
                      {/* <CardDescription>
                        Submitted on {safeFormatDate(request.created_at)}
                      </CardDescription> */}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(request.status)}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Consultation Request Details</DialogTitle>
                          <DialogDescription>
                            Request ID: {request.id} | Status: {request.status}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-100">Full Name</Label>
                              <p className="text-gray-100">{request.full_name}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-100">Email</Label>
                              <p className="text-gray-100">{request.email}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-100">Phone</Label>
                              <p className="text-gray-100">{request.phone || "Not provided"}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-100">Company</Label>
                              <p className="text-gray-100">{request.company || "Not provided"}</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-100">Address</Label>
                            <p className="text-gray-100">{request.address || "Not provided"}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-100">Service Required</Label>
                            <p className="text-gray-100">{request.service}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-100">Description</Label>
                            <p className="text-gray-100 bg-gray-600 p-3 rounded-md">{request.description}</p>
                          </div>
                          {request.notes && (
                            <div>
                              <Label className="text-sm font-medium text-gray-100">Admin Notes</Label>
                              <p className="text-gray-100 bg-blue-600 p-3 rounded-md">{request.notes}</p>
                            </div>
                          )}
                          {request.statusUpdatedBy && (
                            <div>
                              <Label className="text-sm font-medium text-gray-100">Last Updated By</Label>
                              <p className="text-gray-100">
                                {request.statusUpdatedByUser?.first_name || "Unknown"} {request.statusUpdatedByUser?.last_name || ""}
                                {request.statusUpdatedAt && (
                                  <span className="text-gray-500 ml-2">
                                    on {format(new Date(request.statusUpdatedAt), "MMM dd, yyyy 'at' h:mm a")}
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-100" />
                    <span className="text-sm text-gray-100">{request.email}</span>
                  </div>
                  {request.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-100" />
                      <span className="text-sm text-gray-100">{request.phone}</span>
                    </div>
                  )}
                  {request.company && (
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-gray-100" />
                      <span className="text-sm text-gray-100">{request.company}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-100" />
                    <span className="text-sm text-gray-100">{request.service}</span>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-100 line-clamp-2">{request.description}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {/* <Calendar className="h-4 w-4 text-gray-100" /> */}
                    {/* <span className="text-sm text-gray-600">
                      {format(new Date(request.createdAt), "MMM dd, yyyy")}
                    </span> */}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={request.status} 
                      onValueChange={(value) => handleUpdateStatus(request, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="under-review">Under Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRequest(request.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
            <DialogDescription>
              Update the status for {selectedRequest?.fullName}'s consultation request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add any notes about this status change..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedRequest) {
                    updateStatusMutation.mutate({
                      id: selectedRequest.id,
                      status: newStatus,
                      notes: statusNotes || undefined,
                    });
                  }
                }}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  "Update Status"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}