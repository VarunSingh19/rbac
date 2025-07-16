import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Users, Eye, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ClientTeamMember {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Asset {
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
}

interface ClientTeamAssignment {
  id: number;
  assetId: number;
  clientTeamMemberId: number;
  assignedAt: string;
  status: string;
  notes: string;
  clientTeamMember: {
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
}

export default function ClientTeamAssets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Fetch assets owned by the client-admin
  const { data: assets = [], isLoading: assetsLoading } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
    enabled: user?.role === 'client-admin'
  });

  // Fetch client team members
  const { data: clientTeamMembers = [], isLoading: membersLoading } = useQuery<ClientTeamMember[]>({
    queryKey: ['/api/client-team-members'],
    enabled: user?.role === 'client-admin'
  });

  // Fetch assignments for selected asset
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<ClientTeamAssignment[]>({
    queryKey: ['/api/assets', selectedAsset?.id, 'client-team-assignments'],
    enabled: !!selectedAsset
  });

  // Assign asset to client team member
  const assignAssetMutation = useMutation({
    mutationFn: async ({ assetId, clientTeamMemberId }: { assetId: number; clientTeamMemberId: number }) => {
      return apiRequest('POST', `/api/assets/${assetId}/assign-client-team`, { clientTeamMemberId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Asset assigned to client team member successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      if (selectedAsset) {
        queryClient.invalidateQueries({ queryKey: ['/api/assets', selectedAsset.id, 'client-team-assignments'] });
      }
      setAssignDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign asset",
        variant: "destructive",
      });
    }
  });

  // Unassign asset from client team member
  const unassignAssetMutation = useMutation({
    mutationFn: async ({ assetId, clientTeamMemberId }: { assetId: number; clientTeamMemberId: number }) => {
      return apiRequest('DELETE', `/api/assets/${assetId}/assign-client-team`, { clientTeamMemberId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Asset unassigned from client team member successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      if (selectedAsset) {
        queryClient.invalidateQueries({ queryKey: ['/api/assets', selectedAsset.id, 'client-team-assignments'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unassign asset",
        variant: "destructive",
      });
    }
  });

  const handleAssignAsset = (clientTeamMemberId: number) => {
    if (!selectedAsset) return;
    assignAssetMutation.mutate({
      assetId: selectedAsset.id,
      clientTeamMemberId
    });
  };

  const handleUnassignAsset = (clientTeamMemberId: number) => {
    if (!selectedAsset) return;
    unassignAssetMutation.mutate({
      assetId: selectedAsset.id,
      clientTeamMemberId
    });
  };

  if (user?.role !== 'client-admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access client team assets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Client Team Asset Assignments</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assets List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              My Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assetsLoading ? (
              <div className="text-center py-8">Loading assets...</div>
            ) : assets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No assets found
              </div>
            ) : (
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedAsset?.id === asset.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{asset.projectName}</h3>
                        <p className="text-sm text-gray-600">{asset.assetName}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{asset.assetType}</Badge>
                          <Badge variant="outline">{asset.environment}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(asset);
                          setAssignDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Client Team Assignments
              {selectedAsset && (
                <span className="text-sm font-normal text-gray-500">
                  for {selectedAsset.projectName}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedAsset ? (
              <div className="text-center py-8 text-gray-500">
                Select an asset to view assignments
              </div>
            ) : assignmentsLoading ? (
              <div className="text-center py-8">Loading assignments...</div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No client team members assigned to this asset
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {assignment.clientTeamMember.firstName} {assignment.clientTeamMember.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">@{assignment.clientTeamMember.username}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                        </p>
                        <Badge className="mt-2" variant={assignment.status === 'Active' ? 'default' : 'secondary'}>
                          {assignment.status}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnassignAsset(assignment.clientTeamMemberId)}
                        disabled={unassignAssetMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign Asset Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Asset to Client Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAsset && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold">{selectedAsset.projectName}</h3>
                <p className="text-sm text-gray-600">{selectedAsset.assetName}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Client Team Member:</label>
              {membersLoading ? (
                <div className="text-center py-4">Loading team members...</div>
              ) : clientTeamMembers.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No client team members available
                </div>
              ) : (
                <Select onValueChange={(value) => handleAssignAsset(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientTeamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.firstName} {member.lastName} (@{member.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}