import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const reportSchema = z.object({
  reportTitle: z.string().min(1, "Report title is required"),
  associatedAssetId: z.number().min(1, "Please select an asset"),
  testerName: z.string().min(1, "Tester name is required"),
  testStartDate: z.date({ required_error: "Test start date is required" }),
  testEndDate: z.date({ required_error: "Test end date is required" }),
  totalTestDuration: z.string().optional(),
  executiveSummary: z.string().optional(),
  overallRiskRating: z.enum(["Good", "Not Good", "Critical"]).optional(),
  currentStatus: z.enum(["Draft", "In Review", "Final"]).default("Draft"),
  preparedBy: z.string().optional(),
  reviewedBy: z.string().optional(),
  reportFinalizedDate: z.date().optional(),
  nextScheduledTest: z.date().optional(),
  distributionEmails: z.array(z.string().email()).optional(),
}).refine((data) => data.testEndDate >= data.testStartDate, {
  message: "Test end date must be after start date",
  path: ["testEndDate"],
});

type ReportFormData = z.infer<typeof reportSchema>;

interface AssignedTask {
  id: number;
  projectName: string;
  assetName: string;
  assetType: string;
  environment: string;
  projectOwner: {
    username: string;
    firstName: string;
    lastName: string;
  };
}

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignedTasks: AssignedTask[];
}

export default function CreateReportDialog({
  open,
  onOpenChange,
  assignedTasks,
}: CreateReportDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportTitle: "",
      testerName: "",
      preparedBy: "",
      currentStatus: "Draft",
      distributionEmails: [],
    },
  });

  // Auto-populate tester name and prepared by when user is available
  useEffect(() => {
    if (user && open) {
      const fullName = `${user.firstName} ${user.lastName}`;
      form.setValue("testerName", fullName);
      form.setValue("preparedBy", fullName);
    }
  }, [user, open, form]);

  const createReportMutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      const payload = {
        ...data,
        testStartDate: format(data.testStartDate, 'yyyy-MM-dd'),
        testEndDate: format(data.testEndDate, 'yyyy-MM-dd'),
        reportFinalizedDate: data.reportFinalizedDate ? format(data.reportFinalizedDate, 'yyyy-MM-dd') : undefined,
        nextScheduledTest: data.nextScheduledTest ? format(data.nextScheduledTest, 'yyyy-MM-dd') : undefined,
        distributionEmails: emails,
      };
      
      const response = await apiRequest("POST", "/api/reports", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      onOpenChange(false);
      form.reset();
      setEmails([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create report",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReportFormData) => {
    createReportMutation.mutate(data);
  };

  const addEmail = () => {
    if (newEmail && !emails.includes(newEmail)) {
      setEmails([...emails, newEmail]);
      setNewEmail("");
    }
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  const selectedAsset = assignedTasks.find(
    task => task.id === form.watch("associatedAssetId")
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Report</DialogTitle>
          <DialogDescription>
            Create a comprehensive penetration testing report for your assigned assets
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Report Title */}
              <FormField
                control={form.control}
                name="reportTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Demo App Pentest Report – 13‑Jan‑2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Associated Asset */}
              <FormField
                control={form.control}
                name="associatedAssetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associated Project/Asset</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an asset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignedTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id.toString()}>
                            {task.assetName} - {task.projectName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tester Name */}
              <FormField
                control={form.control}
                name="testerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tester Name(s)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Name(s) of the tester(s)" 
                        {...field} 
                        readOnly
                        className="bg-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Test Start Date */}
              <FormField
                control={form.control}
                name="testStartDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Test Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Test End Date */}
              <FormField
                control={form.control}
                name="testEndDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Test End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Total Test Duration */}
              <FormField
                control={form.control}
                name="totalTestDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Test Duration</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 7 hrs 57 mins" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Overall Risk Rating */}
              <FormField
                control={form.control}
                name="overallRiskRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall Risk Rating</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select risk rating" />
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

              {/* Current Status */}
              <FormField
                control={form.control}
                name="currentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
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

              {/* Prepared By */}
              <FormField
                control={form.control}
                name="preparedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prepared By</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Name of report preparer" 
                        {...field} 
                        readOnly
                        className="bg-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reviewed By */}
              <FormField
                control={form.control}
                name="reviewedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reviewed By</FormLabel>
                    <FormControl>
                      <Input placeholder="Name of report reviewer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Report Finalized Date */}
              <FormField
                control={form.control}
                name="reportFinalizedDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Report Finalized Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Next Scheduled Test */}
              <FormField
                control={form.control}
                name="nextScheduledTest"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Next Scheduled Test</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Executive Summary */}
            <FormField
              control={form.control}
              name="executiveSummary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Executive Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief summary of the scan results..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Distribution Emails */}
            <div className="space-y-2">
              <Label>Distribution Emails</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                />
                <Button type="button" onClick={addEmail} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {emails.map((email) => (
                  <div key={email} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                    <span className="text-sm">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Asset Information Display */}
            {selectedAsset && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Selected Asset Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Asset Name:</div>
                    <div>{selectedAsset.assetName}</div>
                  </div>
                  <div>
                    <div className="font-medium">Project:</div>
                    <div>{selectedAsset.projectName}</div>
                  </div>
                  <div>
                    <div className="font-medium">Type:</div>
                    <div>{selectedAsset.assetType}</div>
                  </div>
                  <div>
                    <div className="font-medium">Environment:</div>
                    <div>{selectedAsset.environment}</div>
                  </div>
                  <div>
                    <div className="font-medium">Project Owner:</div>
                    <div>{selectedAsset.projectOwner.firstName} {selectedAsset.projectOwner.lastName}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createReportMutation.isPending}>
                {createReportMutation.isPending ? "Creating..." : "Create Report"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}