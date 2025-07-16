import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Target, 
  ClipboardList, 
  TrendingUp,
  UserCheck,
  RefreshCw,
  Calendar,
  MessageSquare
} from "lucide-react";

interface TeamLeaderData {
  teamSize: number;
  activeTeamMembers: number;
  teamMembers: Array<{
    id: number;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
    firstName?: string;
    lastName?: string;
  }>;
}

export default function TeamLeaderDashboard() {
  const { data, isLoading, refetch } = useQuery<TeamLeaderData>({
    queryKey: ["/api/dashboard/team-leader"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Team Leader Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Leader Dashboard</h1>
          <p className="text-gray-600">Manage your team and track progress</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Size</p>
                <p className="text-3xl font-bold text-gray-900">{data?.teamSize || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>Total Members</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <p className="text-3xl font-bold text-gray-900">{data?.activeTeamMembers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="text-green-600 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-1" />
                <span>Online Now</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Performance</p>
                <p className="text-3xl font-bold text-gray-900">92%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="text-purple-600 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+5% this week</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Team Members
            </CardTitle>
            <CardDescription>Your team members and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.teamMembers?.map((member) => {
                const initials = member.firstName && member.lastName 
                  ? `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                  : member.username.slice(0, 2).toUpperCase();
                
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-600 text-white text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.firstName && member.lastName 
                            ? `${member.firstName} ${member.lastName}`
                            : member.username
                          }
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <Badge variant="outline" className="capitalize">
                        {member.role.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClipboardList className="w-5 h-5 mr-2" />
              Recent Tasks
            </CardTitle>
            <CardDescription>Team tasks and project updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium">API Testing Complete</p>
                    <p className="text-sm text-gray-500">User authentication module</p>
                  </div>
                </div>
                <Badge variant="default">Completed</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div>
                    <p className="font-medium">Database Migration</p>
                    <p className="text-sm text-gray-500">Role-based permissions</p>
                  </div>
                </div>
                <Badge variant="secondary">In Progress</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="font-medium">UI Component Review</p>
                    <p className="text-sm text-gray-500">Dashboard redesign</p>
                  </div>
                </div>
                <Badge variant="outline">Pending</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Team Management
          </CardTitle>
          <CardDescription>Quick actions for team leadership</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button className="h-20 flex-col space-y-2">
              <ClipboardList className="w-6 h-6" />
              <span>Assign Tasks</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Calendar className="w-6 h-6" />
              <span>Schedule Meeting</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <MessageSquare className="w-6 h-6" />
              <span>Team Chat</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2">
              <Target className="w-6 h-6" />
              <span>Set Goals</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}