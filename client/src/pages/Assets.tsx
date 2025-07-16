import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  insertAssetSchema,
  type Asset,
  type InsertAsset,
  type User,
} from "@shared/schema";
import {
  FolderOpen,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Globe,
  Server,
  Smartphone,
  Cpu,
  Tag,
  Calendar,
  Mail,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
} from "lucide-react";
import { z } from "zod";

// Form schema for asset creation
const assetFormSchema = insertAssetSchema.extend({
  technologyStack: z.array(z.string()).optional(),
  notifyOn: z.array(z.string()).optional(),
  notificationEmails: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  supportingDocs: z.array(z.string()).optional(),
});

type AssetFormData = z.infer<typeof assetFormSchema>;

const assetTypeOptions = [
  { value: "web-app", label: "Web App", icon: Globe },
  { value: "api", label: "API", icon: Server },
  { value: "mobile", label: "Mobile", icon: Smartphone },
  { value: "iot", label: "IoT", icon: Cpu },
];

const technologyOptions = [
  "Node.js",
  "Django",
  "Angular",
  "React",
  "Vue.js",
  "Spring Boot",
  "Express.js",
  "Flask",
  "Laravel",
  "Ruby on Rails",
  "ASP.NET",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Docker",
  "Kubernetes",
];

const environmentOptions = [
  { value: "dev", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "prod", label: "Production" },
  { value: "other", label: "Other" },
];

const scanFrequencyOptions = [
  { value: "one-time", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const planTierOptions = [
  { value: "free", label: "Free" },
  { value: "basic", label: "Basic" },
  { value: "advanced", label: "Advanced" },
  { value: "custom", label: "Custom" },
];

const notificationOptions = [
  "new-vulnerability",
  "critical-only",
  "all-reports",
];

export default function Assets() {
  return (
    <ProtectedRoute 
      allowedRoles={["superadmin", "admin", "client-admin"]} 
      fallbackMessage="Only administrators can manage assets"
    >
      <AssetsContent />
    </ProtectedRoute>
  );
}

function AssetsContent() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>(
    [],
  );
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    [],
  );
  const [notificationEmails, setNotificationEmails] = useState<string[]>([""]);
  const [tags, setTags] = useState<string[]>([""]);

  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "superadmin";
  const canCreateAssets = isAdmin || currentUser?.role === "client-admin";

  // Fetch assets with details
  const {
    data: assets,
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: ["/api/assets-detailed"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/assets-detailed");
      const data = await response.json();
      console.log('[ASSETS DEBUG] Raw API response:', data);

      // Convert snake_case to camelCase for frontend compatibility
      const convertedAssets = data.map((asset: any) => ({
        ...asset,
        projectName: asset.project_name || asset.projectName,
        projectDescription: asset.project_description || asset.projectDescription,
        assetName: asset.asset_name || asset.assetName,
        assetURL: asset.asset_url || asset.assetURL,
        assetType: asset.asset_type || asset.assetType,
        technologyStack: asset.technology_stack || asset.technologyStack,
        authMethod: asset.auth_method || asset.authMethod,
        privateNetwork: asset.private_network || asset.privateNetwork,
        scanFrequency: asset.scan_frequency || asset.scanFrequency,
        preferredTestWindow: asset.preferred_test_window || asset.preferredTestWindow,
        scopeInclusions: asset.scope_inclusions || asset.scopeInclusions,
        scopeExclusions: asset.scope_exclusions || asset.scopeExclusions,
        notifyOn: asset.notify_on || asset.notifyOn,
        notificationEmails: asset.notification_emails || asset.notificationEmails,
        planTier: asset.plan_tier || asset.planTier,
        testsPerMonth: asset.tests_per_month || asset.testsPerMonth,
        contractExpiryDate: asset.contract_expiry_date || asset.contractExpiryDate,
        supportingDocs: asset.supporting_docs || asset.supportingDocs,
        assignedTo: asset.assigned_to || asset.assignedTo,
        assignedAt: asset.assigned_at || asset.assignedAt,
        assignedBy: asset.assigned_by || asset.assignedBy,
        assignedTester: asset.assigned_tester || asset.assignedTester,
        assignedTesterAt: asset.assigned_tester_at || asset.assignedTesterAt,
        assignedTesterBy: asset.assigned_tester_by || asset.assignedTesterBy,
        createdBy: asset.created_by || asset.createdBy,
        createdAt: asset.created_at || asset.createdAt,
        updatedAt: asset.updated_at || asset.updatedAt,
      }));

      console.log('[ASSETS DEBUG] Converted assets:', convertedAssets);
      return convertedAssets;
    },
    enabled: canCreateAssets,
  });

  // Fetch client admins (for admin users)
  const { data: clientAdmins } = useQuery<User[]>({
    queryKey: ["/api/client-admins"],
    enabled: isAdmin,
  });

  // Fetch team leaders (for admin users)
  const { data: teamLeaders } = useQuery<User[]>({
    queryKey: ["/api/team-leaders"],
    enabled: isAdmin,
  });

  // Fetch client team members (for client-admin users)
  const { data: clientTeamMembers } = useQuery<User[]>({
    queryKey: ["/api/client-team-members"],
    enabled: currentUser?.role === "client-admin",
  });

  // Fetch client team assignments for each asset (for client-admin users)
  const getClientTeamAssignments = (assetId: number) => 
    useQuery<any[]>({
      queryKey: ["/api/assets", assetId, "client-team-assignments"],
      enabled: currentUser?.role === "client-admin",
    });

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      projectName: "",
      projectDescription: "",
      assetName: "",
      assetURL: "",
      assetType: "web-app",
      environment: "dev",
      authMethod: "",
      privateNetwork: false,
      scanFrequency: "weekly",
      preferredTestWindow: "",
      scopeInclusions: "",
      scopeExclusions: "",
      planTier: "free",
      testsPerMonth: 10,
      contractExpiryDate: undefined,
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: AssetFormData) => {
      console.log('[CREATE ASSET DEBUG] Frontend form data:', data);

      // Convert camelCase to snake_case for Django backend
      const assetData = {
        // Basic Project Info
        project_name: data.projectName,
        project_description: data.projectDescription,
        project_owner_id: data.projectOwnerId, // Include project owner ID

        // Application Details
        asset_name: data.assetName,
        asset_url: data.assetURL,
        asset_type: data.assetType,
        technology_stack: selectedTechnologies,

        // Environment
        environment: data.environment,
        auth_method: data.authMethod,
        private_network: data.privateNetwork,

        // Testing Configuration
        scan_frequency: data.scanFrequency,
        preferred_test_window: data.preferredTestWindow,
        scope_inclusions: data.scopeInclusions,
        scope_exclusions: data.scopeExclusions,

        // Plan and Billing
        plan_tier: data.planTier,
        tests_per_month: data.testsPerMonth,
        contract_expiry_date: data.contractExpiryDate,

        // Notifications
        notify_on: selectedNotifications,
        notification_emails: notificationEmails.filter(
          (email) => email.trim() !== "",
        ),

        // Tags
        tags: tags.filter((tag) => tag.trim() !== ""),
      };

      console.log('[CREATE ASSET DEBUG] Converted data for backend:', assetData);

      const response = await apiRequest("POST", "/api/assets", assetData);
      console.log('[CREATE ASSET DEBUG] Backend response:', response);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Asset Created",
        description: "Asset has been created successfully.",
      });
      setShowCreateDialog(false);
      form.reset();
      resetFormArrays();
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Asset",
        description:
          error.message || "An error occurred while creating the asset.",
        variant: "destructive",
      });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: number) => {
      const response = await apiRequest("DELETE", `/api/assets/${assetId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Asset Deleted",
        description: "Asset has been deleted successfully.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Asset",
        description:
          error.message || "An error occurred while deleting the asset.",
        variant: "destructive",
      });
    },
  });

  const assignAssetMutation = useMutation({
    mutationFn: async ({
      assetId,
      teamLeaderId,
    }: {
      assetId: number;
      teamLeaderId: number;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/assets/${assetId}/assign`,
        { teamLeaderId },
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Asset Assigned",
        description: "Asset has been assigned to team leader successfully.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Assign Asset",
        description:
          error.message || "An error occurred while assigning the asset.",
        variant: "destructive",
      });
    },
  });

  const unassignAssetMutation = useMutation({
    mutationFn: async (assetId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/assets/${assetId}/assign`,
        {},
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Asset Unassigned",
        description: "Asset has been unassigned successfully.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Unassign Asset",
        description:
          error.message || "An error occurred while unassigning the asset.",
        variant: "destructive",
      });
    },
  });

  // Client team assignment mutations
  const assignClientTeamMutation = useMutation({
    mutationFn: async ({
      assetId,
      clientTeamMemberId,
    }: {
      assetId: number;
      clientTeamMemberId: number;
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/assets/${assetId}/assign-client-team`,
        { clientTeamMemberId },
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Asset Assigned",
        description: "Asset has been assigned to client team member successfully.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Assign Asset",
        description:
          error.message || "An error occurred while assigning the asset.",
        variant: "destructive",
      });
    },
  });

  const unassignClientTeamMutation = useMutation({
    mutationFn: async ({
      assetId,
      clientTeamMemberId,
    }: {
      assetId: number;
      clientTeamMemberId: number;
    }) => {
      const response = await apiRequest(
        "DELETE",
        `/api/assets/${assetId}/assign-client-team`,
        { clientTeamMemberId },
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Asset Unassigned",
        description: "Asset has been unassigned from client team member successfully.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Unassign Asset",
        description:
          error.message || "An error occurred while unassigning the asset.",
        variant: "destructive",
      });
    },
  });

  const resetFormArrays = () => {
    setSelectedTechnologies([]);
    setSelectedNotifications([]);
    setNotificationEmails([""]);
    setTags([""]);
  };

  const onSubmit = (data: AssetFormData) => {
    // Clean up the data before submission
    const cleanedData = {
      ...data,
      contractExpiryDate: data.contractExpiryDate || undefined, // Convert empty string to undefined
    };
    createAssetMutation.mutate(cleanedData);
  };

  const addEmailField = () => {
    setNotificationEmails([...notificationEmails, ""]);
  };

  const updateEmail = (index: number, value: string) => {
    const updated = [...notificationEmails];
    updated[index] = value;
    setNotificationEmails(updated);
  };

  const removeEmail = (index: number) => {
    if (notificationEmails.length > 1) {
      setNotificationEmails(notificationEmails.filter((_, i) => i !== index));
    }
  };

  const addTagField = () => {
    setTags([...tags, ""]);
  };

  const updateTag = (index: number, value: string) => {
    const updated = [...tags];
    updated[index] = value;
    setTags(updated);
  };

  const removeTag = (index: number) => {
    if (tags.length > 1) {
      setTags(tags.filter((_, i) => i !== index));
    }
  };

  const getAssetTypeIcon = (type: string) => {
    const option = assetTypeOptions.find((opt) => opt.value === type);
    return option ? option.icon : Globe;
  };

  if (!canCreateAssets) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>You don't have permission to view or manage assets.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Asset Management</h1>
          <p className="text-gray-600">
            {isAdmin
              ? "Manage all assets and assign project owners"
              : "Create and manage your security testing assets"}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Asset</DialogTitle>
                <DialogDescription>
                  Add a new application or system for security testing and
                  monitoring.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Basic Project Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Project Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectName">Project Name *</Label>
                      <Input
                        id="projectName"
                        placeholder="e.g. Demo Application"
                        {...form.register("projectName")}
                      />
                      {form.formState.errors.projectName && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.projectName.message}
                        </p>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="space-y-2">
                        <Label htmlFor="projectOwnerId">Project Owner</Label>
                        <Select
                          value={form.watch("projectOwnerId")?.toString()}
                          onValueChange={(value) =>
                            form.setValue("projectOwnerId", parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select project owner" />
                          </SelectTrigger>
                          <SelectContent>
                            {clientAdmins?.map((admin) => (
                              <SelectItem
                                key={admin.id}
                                value={admin.id.toString()}
                              >
                                {admin.username} ({admin.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectDescription">
                      Project Description
                    </Label>
                    <Textarea
                      id="projectDescription"
                      placeholder="Describe the project and its purpose"
                      {...form.register("projectDescription")}
                    />
                  </div>
                </div>

                {/* Application Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Application Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assetName">Asset Name *</Label>
                      <Input
                        id="assetName"
                        placeholder="e.g. Main Web Application"
                        {...form.register("assetName")}
                      />
                      {form.formState.errors.assetName && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.assetName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assetURL">Asset URL</Label>
                      <Input
                        id="assetURL"
                        type="url"
                        placeholder="https://example.com"
                        {...form.register("assetURL")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assetType">Asset Type *</Label>
                      <Select
                        value={form.watch("assetType")}
                        onValueChange={(value) =>
                          form.setValue("assetType", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select asset type" />
                        </SelectTrigger>
                        <SelectContent>
                          {assetTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center">
                                <option.icon className="w-4 h-4 mr-2" />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Technology Stack</Label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {technologyOptions.map((tech) => (
                          <Badge
                            key={tech}
                            variant={
                              selectedTechnologies.includes(tech)
                                ? "default"
                                : "outline"
                            }
                            className="cursor-pointer"
                            onClick={() => {
                              if (selectedTechnologies.includes(tech)) {
                                setSelectedTechnologies(
                                  selectedTechnologies.filter(
                                    (t) => t !== tech,
                                  ),
                                );
                              } else {
                                setSelectedTechnologies([
                                  ...selectedTechnologies,
                                  tech,
                                ]);
                              }
                            }}
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Environment */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Environment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="environment">Environment *</Label>
                      <Select
                        value={form.watch("environment")}
                        onValueChange={(value) =>
                          form.setValue("environment", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          {environmentOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="authMethod">Authentication Method</Label>
                      <Input
                        id="authMethod"
                        placeholder="e.g. OAuth2, API Key, Username/Password"
                        {...form.register("authMethod")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center space-x-2">
                        <Checkbox
                          checked={form.watch("privateNetwork")}
                          onCheckedChange={(checked) =>
                            form.setValue("privateNetwork", !!checked)
                          }
                        />
                        <span>Private Network (VPN/IP allowlist required)</span>
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Testing Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Testing Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scanFrequency">Scan Frequency *</Label>
                      <Select
                        value={form.watch("scanFrequency")}
                        onValueChange={(value) =>
                          form.setValue("scanFrequency", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          {scanFrequencyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="preferredTestWindow">
                        Preferred Test Window
                      </Label>
                      <Input
                        id="preferredTestWindow"
                        placeholder="e.g. Weekends 2-6 AM UTC"
                        {...form.register("preferredTestWindow")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scopeInclusions">Scope Inclusions</Label>
                      <Textarea
                        id="scopeInclusions"
                        placeholder="URLs, endpoints, or features to include in testing"
                        {...form.register("scopeInclusions")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scopeExclusions">Scope Exclusions</Label>
                      <Textarea
                        id="scopeExclusions"
                        placeholder="URLs, endpoints, or features to exclude from testing"
                        {...form.register("scopeExclusions")}
                      />
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Notifications</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Notify On</Label>
                      <div className="flex flex-wrap gap-2">
                        {notificationOptions.map((option) => (
                          <Badge
                            key={option}
                            variant={
                              selectedNotifications.includes(option)
                                ? "default"
                                : "outline"
                            }
                            className="cursor-pointer"
                            onClick={() => {
                              if (selectedNotifications.includes(option)) {
                                setSelectedNotifications(
                                  selectedNotifications.filter(
                                    (n) => n !== option,
                                  ),
                                );
                              } else {
                                setSelectedNotifications([
                                  ...selectedNotifications,
                                  option,
                                ]);
                              }
                            }}
                          >
                            {option
                              .replace("-", " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Notification Emails</Label>
                      {notificationEmails.map((email, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => updateEmail(index, e.target.value)}
                            placeholder="email@example.com"
                          />
                          {notificationEmails.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeEmail(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addEmailField}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Email
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Billing & SLA */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Billing & SLA</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="planTier">Plan Tier *</Label>
                      <Select
                        value={form.watch("planTier")}
                        onValueChange={(value) =>
                          form.setValue("planTier", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {planTierOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="testsPerMonth">Tests Per Month</Label>
                      <Input
                        id="testsPerMonth"
                        type="number"
                        min="1"
                        {...form.register("testsPerMonth", {
                          valueAsNumber: true,
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contractExpiryDate">
                        Contract Expiry Date
                      </Label>
                      <Input
                        id="contractExpiryDate"
                        type="date"
                        {...form.register("contractExpiryDate")}
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Metadata */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Optional Metadata</h3>
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    {tags.map((tag, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={tag}
                          onChange={(e) => updateTag(index, e.target.value)}
                          placeholder="e.g. production, critical, api"
                        />
                        {tags.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeTag(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTagField}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tag
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false);
                      form.reset();
                      resetFormArrays();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createAssetMutation.isPending}
                  >
                    {createAssetMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Plus className="w-4 h-4" />
                        <span>Create Asset</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FolderOpen className="w-5 h-5 mr-2" />
            {isAdmin ? "All Assets" : "My Assets"}
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "View and manage all system assets"
              : "Assets you own or have created"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse bg-gray-100 h-24 rounded-lg"
                />
              ))}
            </div>
          ) : assets && assets.length > 0 ? (
            <div className="space-y-4">
              {assets.map((asset) => {
                const AssetTypeIcon = getAssetTypeIcon(asset.assetType);
                return (
                  <div
                    key={asset.id}
                    className="border rounded-lg p-6 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <AssetTypeIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">
                            {asset.projectName}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {asset.assetName}
                          </p>
                          {asset.projectDescription && (
                            <p className="text-sm text-gray-500">
                              {asset.projectDescription}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingAsset(asset)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAssetMutation.mutate(asset.id)}
                          disabled={deleteAssetMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Client and Team Leader Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Client
                        </label>
                        <div className="mt-1 text-sm text-gray-900">
                          {asset.projectOwner
                            ? `${asset.projectOwner.firstName || ""} ${asset.projectOwner.lastName || ""}`.trim() ||
                              asset.projectOwner.username
                            : currentUser?.role === "client-admin" 
                              ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || currentUser.username
                              : "No client assigned"}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Team Leader Assignment
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                          {asset.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="text-xs">
                                {asset.assignedTo.firstName ||
                                  asset.assignedTo.username}
                              </Badge>
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    unassignAssetMutation.mutate(asset.id)
                                  }
                                  disabled={unassignAssetMutation.isPending}
                                  className="text-xs px-2 py-1 h-6"
                                >
                                  Unassign
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                Not assigned yet to any team-leader
                              </span>
                              {isAdmin &&
                                teamLeaders &&
                                teamLeaders.length > 0 && (
                                  <Select
                                    onValueChange={(value) =>
                                      assignAssetMutation.mutate({
                                        assetId: asset.id,
                                        teamLeaderId: parseInt(value),
                                      })
                                    }
                                  >
                                    <SelectTrigger className="w-32 h-6 text-xs">
                                      <SelectValue placeholder="Assign" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {teamLeaders.map((leader) => (
                                        <SelectItem
                                          key={leader.id}
                                          value={leader.id.toString()}
                                        >
                                          {leader.firstName || leader.username}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Client Team Assignment - Only for Client Admins */}
                    {currentUser?.role === "client-admin" && (
                      <div className="pt-4 border-t">
                        <label className="text-sm font-medium text-gray-600">
                          Client Team Assignment
                        </label>
                        <div className="mt-2 space-y-2">
                          {clientTeamMembers && clientTeamMembers.length > 0 ? (
                            <div className="flex items-center gap-2">
                              <Select
                                onValueChange={(value) =>
                                  assignClientTeamMutation.mutate({
                                    assetId: asset.id,
                                    clientTeamMemberId: parseInt(value),
                                  })
                                }
                              >
                                <SelectTrigger className="w-48 h-8 text-xs">
                                  <SelectValue placeholder="Assign to client team member" />
                                </SelectTrigger>
                                <SelectContent>
                                  {clientTeamMembers.map((member) => (
                                    <SelectItem
                                      key={member.id}
                                      value={member.id.toString()}
                                    >
                                      {member.firstName || member.username}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              No client team members available
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Environment
                        </label>
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
                        <label className="text-sm font-medium text-gray-600">
                          Scan Frequency
                        </label>
                        <div className="mt-1">
                          <Badge variant="secondary">
                            {asset.scanFrequency ?
                              asset.scanFrequency
                                .replace("-", " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())
                              : 'Not specified'
                            }
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Plan Tier
                        </label>
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
                        <label className="text-sm font-medium text-gray-600">
                          Tests/Month
                        </label>
                        <div className="mt-1 text-sm text-gray-900">
                          {asset.testsPerMonth || "N/A"}
                        </div>
                      </div>
                    </div>

                    {asset.assetURL && (
                      <div className="pt-2 border-t">
                        <label className="text-sm font-medium text-gray-600">
                          URL
                        </label>
                        <div className="mt-1">
                          <a
                            href={asset.assetURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            {asset.assetURL}
                          </a>
                        </div>
                      </div>
                    )}

                    {asset.technologyStack &&
                      Array.isArray(asset.technologyStack) &&
                      asset.technologyStack.length > 0 && (
                        <div className="pt-2 border-t">
                          <label className="text-sm font-medium text-gray-600">
                            Technology Stack
                          </label>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {asset.technologyStack.map((tech, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {asset.tags &&
                      Array.isArray(asset.tags) &&
                      asset.tags.length > 0 && (
                        <div className="pt-2 border-t">
                          <label className="text-sm font-medium text-gray-600">
                            Tags
                          </label>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {asset.tags.map((tag, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    <div className="pt-2 border-t text-xs text-gray-500">
                      Created {new Date(asset.createdAt).toLocaleDateString()}
                      {asset.contractExpiryDate && (
                        <span className="ml-4">
                          Contract expires{" "}
                          {new Date(
                            asset.contractExpiryDate,
                          ).toLocaleDateString()}
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
              <p>No assets found</p>
              <p className="text-sm">
                Create your first asset to get started with security testing
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
