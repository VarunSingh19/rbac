import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DashboardStats from './DashboardStats';
import { 
  ActivityChart, 
  UserDistributionChart, 
  TaskProgressChart, 
  SystemHealthChart,
  transformActivityData,
  transformUserDistributionData,
  transformTaskProgressData,
  transformSystemHealthData
} from './Charts';
import { 
  Activity, 
  Users, 
  Shield, 
  Target, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Eye,
  FileText,
  Database,
  Zap,
  Calendar,
  Bell,
  Settings,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { User } from '@shared/schema';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface RoleDashboardProps {
  user: User;
}

interface DashboardData {
  totalUsers?: number;
  activeUsers?: number;
  totalAssets?: number;
  pendingTasks?: number;
  recentActivity?: any[];
  systemHealth?: any;
}

export default function RoleDashboard({ user }: RoleDashboardProps) {
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard/${user.role}`],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const renderWelcomeSection = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">
            Welcome back, {user.firstName || user.username}!
          </h1>
          <p className="text-muted-foreground mt-2">
            {getRoleDescription(user.role)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'PPP')}
          </p>
          <Badge variant="outline" className="mt-2">
            {user.role.replace('-', ' ')}
          </Badge>
        </div>
      </div>
    </div>
  );

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'You have complete system access and oversight of all operations.';
      case 'admin':
        return 'Manage users, assets, and system operations with administrative privileges.';
      case 'team-leader':
        return 'Lead your team and manage assigned tasks and projects.';
      case 'tester':
        return 'Execute testing procedures and report findings on assigned tasks.';
      case 'client-admin':
        return 'Manage your organization\'s assets and team members.';
      case 'client-user':
        return 'Access and manage your assigned assets and reports.';
      default:
        return 'Welcome to your dashboard.';
    }
  };

  const renderQuickActions = () => {
    const actions = getQuickActionsForRole(user.role);
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Frequently used actions for your role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 btn-modern"
                onClick={() => window.location.href = action.href}
              >
                {action.icon}
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const getQuickActionsForRole = (role: string) => {
    const baseActions = [
      {
        label: 'View Reports',
        icon: <FileText className="w-4 h-4" />,
        href: '/reports'
      },
      {
        label: 'System Health',
        icon: <Activity className="w-4 h-4" />,
        href: '/system-health'
      }
    ];

    switch (role) {
      case 'superadmin':
      case 'admin':
        return [
          {
            label: 'Manage Users',
            icon: <Users className="w-4 h-4" />,
            href: '/user-management'
          },
          {
            label: 'View Assets',
            icon: <Database className="w-4 h-4" />,
            href: '/assets'
          },
          {
            label: 'Activity Logs',
            icon: <Activity className="w-4 h-4" />,
            href: '/activity-logs'
          },
          {
            label: 'Security',
            icon: <Shield className="w-4 h-4" />,
            href: '/security'
          }
        ];
      
      case 'team-leader':
        return [
          {
            label: 'My Tasks',
            icon: <Target className="w-4 h-4" />,
            href: '/tasks'
          },
          {
            label: 'Team Management',
            icon: <Users className="w-4 h-4" />,
            href: '/user-management'
          },
          ...baseActions
        ];
      
      case 'tester':
        return [
          {
            label: 'My Assignments',
            icon: <Target className="w-4 h-4" />,
            href: '/my-assigned-tasks'
          },
          {
            label: 'Test Cases',
            icon: <CheckCircle className="w-4 h-4" />,
            href: '/testing/cases'
          },
          ...baseActions
        ];
      
      case 'client-admin':
        return [
          {
            label: 'My Assets',
            icon: <Database className="w-4 h-4" />,
            href: '/assets'
          },
          {
            label: 'Team Management',
            icon: <Users className="w-4 h-4" />,
            href: '/user-management'
          },
          ...baseActions
        ];
      
      case 'client-user':
        return [
          {
            label: 'My Assets',
            icon: <Database className="w-4 h-4" />,
            href: '/my-client-assets'
          },
          ...baseActions
        ];
      
      default:
        return baseActions;
    }
  };

  const renderRecentActivity = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest system activities and updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dashboardData?.recentActivity?.length ? (
            dashboardData.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity to display</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderChartsSection = () => {
    const charts = getChartsForRole(user.role);
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {charts.map((ChartComponent, index) => (
          <ChartComponent key={index} />
        ))}
      </div>
    );
  };

  const getChartsForRole = (role: string) => {
    const recentActivity = dashboardData?.recentActivity || [];
    const usersByRole = dashboardData?.usersByRole || {};
    const systemHealth = dashboardData?.systemHealth || [];
    
    switch (role) {
      case 'superadmin':
      case 'admin':
        return [
          () => <ActivityChart data={transformActivityData(recentActivity)} />,
          () => <UserDistributionChart data={transformUserDistributionData(usersByRole)} />,
          () => <TaskProgressChart data={transformTaskProgressData(dashboardData)} />,
          () => <SystemHealthChart data={transformSystemHealthData(systemHealth)} />
        ];
      
      case 'team-leader':
        return [
          () => <TaskProgressChart data={transformTaskProgressData(dashboardData)} />,
          () => <ActivityChart data={transformActivityData(recentActivity)} />
        ];
      
      case 'tester':
        return [
          () => <TaskProgressChart data={transformTaskProgressData(dashboardData)} />,
          () => <ActivityChart data={transformActivityData(recentActivity)} />
        ];
      
      case 'client-admin':
        return [
          () => <ActivityChart data={transformActivityData(recentActivity)} />,
          () => <TaskProgressChart data={transformTaskProgressData(dashboardData)} />
        ];
      
      case 'client-user':
        return [
          () => <TaskProgressChart data={transformTaskProgressData(dashboardData)} />
        ];
      
      default:
        return [];
    }
  };

  const renderSystemAlerts = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          System Alerts
        </CardTitle>
        <CardDescription>
          Important notifications and alerts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              System maintenance scheduled for this weekend.
            </AlertDescription>
          </Alert>
          <Alert>
            <Bell className="w-4 h-4" />
            <AlertDescription>
              New security update available for installation.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderWelcomeSection()}
      
      <DashboardStats role={user.role} stats={dashboardData} />
      
      {renderQuickActions()}
      
      {renderChartsSection()}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRecentActivity()}
        {renderSystemAlerts()}
      </div>
    </div>
  );
}

// import { useQuery } from '@tanstack/react-query';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
// import { Separator } from '@/components/ui/separator';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import DashboardStats from './DashboardStats';
// import { 
//   ActivityChart, 
//   UserDistributionChart, 
//   TaskProgressChart, 
//   SystemHealthChart,
//   transformActivityData,
//   transformUserDistributionData,
//   transformTaskProgressData,
//   transformSystemHealthData
// } from './Charts';
// import { 
//   Activity, 
//   Users, 
//   Shield, 
//   Target, 
//   Clock, 
//   TrendingUp,
//   AlertTriangle,
//   CheckCircle,
//   Eye,
//   FileText,
//   Database,
//   Zap,
//   Calendar,
//   Bell,
//   Settings,
//   BarChart3,
//   PieChart,
//   LineChart,
//   ArrowUpRight,
//   Sparkles,
//   Star,
//   Crown,
//   Award,
//   ChevronRight
// } from 'lucide-react';
// import { User } from '@shared/schema';
// import { cn } from '@/lib/utils';
// import { format } from 'date-fns';

// interface RoleDashboardProps {
//   user: User;
// }

// interface DashboardData {
//   totalUsers?: number;
//   activeUsers?: number;
//   totalAssets?: number;
//   pendingTasks?: number;
//   recentActivity?: any[];
//   systemHealth?: any;
//   usersByRole?: Record<string, number>;
// }

// export default function RoleDashboard({ user }: RoleDashboardProps) {
//   const { data: dashboardData, isLoading } = useQuery<DashboardData>({
//     queryKey: [`/api/dashboard/${user.role}`],
//     refetchInterval: 30000, // Refresh every 30 seconds
//   });

//   const renderWelcomeSection = () => (
//     <div className="mb-8 relative">
//       <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-2xl blur-3xl"></div>
//       <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8">
//         <div className="flex items-center justify-between">
//           <div className="space-y-3">
//             <div className="flex items-center gap-3">
//               <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
//                 {getRoleIcon(user.role)}
//               </div>
//               <div>
//                 <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
//                   Welcome back, {user.firstName || user.username}!
//                 </h1>
//                 <p className="text-slate-400 mt-1 text-lg">
//                   {getRoleDescription(user.role)}
//                 </p>
//               </div>
//             </div>
//           </div>
//           <div className="text-right space-y-2">
//             <p className="text-sm text-slate-400">
//               {format(new Date(), 'PPP')}
//             </p>
//             <Badge 
//               variant="outline" 
//               className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50"
//             >
//               <Crown className="w-3 h-3 mr-1" />
//               {user.role.replace('-', ' ')}
//             </Badge>
//           </div>
//         </div>
//       </div>
//     </div>
//   );

//   const getRoleIcon = (role: string) => {
//     switch (role) {
//       case 'superadmin':
//         return <Crown className="w-6 h-6 text-white" />;
//       case 'admin':
//         return <Shield className="w-6 h-6 text-white" />;
//       case 'team-leader':
//         return <Users className="w-6 h-6 text-white" />;
//       case 'tester':
//         return <Target className="w-6 h-6 text-white" />;
//       case 'client-admin':
//         return <Award className="w-6 h-6 text-white" />;
//       case 'client-user':
//         return <Star className="w-6 h-6 text-white" />;
//       default:
//         return <Users className="w-6 h-6 text-white" />;
//     }
//   };

//   const getRoleDescription = (role: string) => {
//     switch (role) {
//       case 'superadmin':
//         return 'You have complete system access and oversight of all operations.';
//       case 'admin':
//         return 'Manage users, assets, and system operations with administrative privileges.';
//       case 'team-leader':
//         return 'Lead your team and manage assigned tasks and projects.';
//       case 'tester':
//         return 'Execute testing procedures and report findings on assigned tasks.';
//       case 'client-admin':
//         return 'Manage your organization\'s assets and team members.';
//       case 'client-user':
//         return 'Access and manage your assigned assets and reports.';
//       default:
//         return 'Welcome to your dashboard.';
//     }
//   };

//   const renderQuickActions = () => {
//     const actions = getQuickActionsForRole(user.role);
    
//     return (
//       <Card className="mb-8 bg-slate-900/50 border-slate-800 backdrop-blur-sm">
//         <CardHeader className="pb-4">
//           <CardTitle className="flex items-center gap-2 text-white">
//             <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
//               <Zap className="w-4 h-4 text-white" />
//             </div>
//             Quick Actions
//           </CardTitle>
//           <CardDescription className="text-slate-400">
//             Frequently used actions for your role
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//             {actions.map((action, index) => (
//               <Button
//                 key={index}
//                 variant="outline"
//                 className="h-auto p-6 flex flex-col items-center gap-3 bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white transition-all duration-200 group"
//                 onClick={() => window.location.href = action.href}
//               >
//                 <div className="w-10 h-10 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-200">
//                   {action.icon}
//                 </div>
//                 <span className="text-sm font-medium">{action.label}</span>
//                 <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
//               </Button>
//             ))}
//           </div>
//         </CardContent>
//       </Card>
//     );
//   };

//   const getQuickActionsForRole = (role: string) => {
//     const baseActions = [
//       {
//         label: 'View Reports',
//         icon: <FileText className="w-5 h-5 text-blue-400" />,
//         href: '/reports'
//       },
//       {
//         label: 'System Health',
//         icon: <Activity className="w-5 h-5 text-green-400" />,
//         href: '/system-health'
//       }
//     ];

//     switch (role) {
//       case 'superadmin':
//       case 'admin':
//         return [
//           {
//             label: 'Manage Users',
//             icon: <Users className="w-5 h-5 text-purple-400" />,
//             href: '/user-management'
//           },
//           {
//             label: 'View Assets',
//             icon: <Database className="w-5 h-5 text-orange-400" />,
//             href: '/assets'
//           },
//           {
//             label: 'Activity Logs',
//             icon: <Activity className="w-5 h-5 text-green-400" />,
//             href: '/activity-logs'
//           },
//           {
//             label: 'Security',
//             icon: <Shield className="w-5 h-5 text-red-400" />,
//             href: '/security'
//           }
//         ];
      
//       case 'team-leader':
//         return [
//           {
//             label: 'My Tasks',
//             icon: <Target className="w-5 h-5 text-cyan-400" />,
//             href: '/tasks'
//           },
//           {
//             label: 'Team Management',
//             icon: <Users className="w-5 h-5 text-purple-400" />,
//             href: '/user-management'
//           },
//           ...baseActions
//         ];
      
//       case 'tester':
//         return [
//           {
//             label: 'My Assignments',
//             icon: <Target className="w-5 h-5 text-cyan-400" />,
//             href: '/my-assigned-tasks'
//           },
//           {
//             label: 'Test Cases',
//             icon: <CheckCircle className="w-5 h-5 text-green-400" />,
//             href: '/testing/cases'
//           },
//           ...baseActions
//         ];
      
//       case 'client-admin':
//         return [
//           {
//             label: 'My Assets',
//             icon: <Database className="w-5 h-5 text-orange-400" />,
//             href: '/assets'
//           },
//           {
//             label: 'Team Management',
//             icon: <Users className="w-5 h-5 text-purple-400" />,
//             href: '/user-management'
//           },
//           ...baseActions
//         ];
      
//       case 'client-user':
//         return [
//           {
//             label: 'My Assets',
//             icon: <Database className="w-5 h-5 text-orange-400" />,
//             href: '/my-client-assets'
//           },
//           ...baseActions
//         ];
      
//       default:
//         return baseActions;
//     }
//   };

//   const renderRecentActivity = () => (
//     <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
//       <CardHeader className="pb-4">
//         <CardTitle className="flex items-center gap-2 text-white">
//           <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
//             <Clock className="w-4 h-4 text-white" />
//           </div>
//           Recent Activity
//         </CardTitle>
//         <CardDescription className="text-slate-400">
//           Latest system activities and updates
//         </CardDescription>
//       </CardHeader>
//       <CardContent>
//         <div className="space-y-3">
//           {dashboardData?.recentActivity?.length ? (
//             dashboardData.recentActivity.map((activity, index) => (
//               <div key={index} className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50 hover:border-slate-600 transition-all duration-200">
//                 <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/50" />
//                 <div className="flex-1 space-y-1">
//                   <p className="text-sm font-medium text-white">{activity.description}</p>
//                   <p className="text-xs text-slate-400 flex items-center gap-1">
//                     <Clock className="w-3 h-3" />
//                     {activity.timestamp}
//                   </p>
//                 </div>
//                 <ChevronRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
//               </div>
//             ))
//           ) : (
//             <div className="text-center py-12 text-slate-400">
//               <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
//                 <Activity className="w-8 h-8 text-slate-500" />
//               </div>
//               <p className="text-lg font-medium">No recent activity</p>
//               <p className="text-sm mt-1">Activity will appear here as it happens</p>
//             </div>
//           )}
//         </div>
//       </CardContent>
//     </Card>
//   );

//   const renderChartsSection = () => {
//     const charts = getChartsForRole(user.role);
    
//     return (
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
//         {charts.map((ChartComponent, index) => (
//           <div key={index} className="bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-sm">
//             <ChartComponent />
//           </div>
//         ))}
//       </div>
//     );
//   };

//   const getChartsForRole = (role: string) => {
//     const recentActivity = dashboardData?.recentActivity || [];
//     const usersByRole = dashboardData?.usersByRole || {};
//     const systemHealth = dashboardData?.systemHealth || [];
    
//     switch (role) {
//       case 'superadmin':
//       case 'admin':
//         return [
//           () => <ActivityChart data={transformActivityData(recentActivity)} />,
//           () => <UserDistributionChart data={transformUserDistributionData(usersByRole)} />,
//           () => <TaskProgressChart data={transformTaskProgressData(dashboardData)} />,
//           () => <SystemHealthChart data={transformSystemHealthData(systemHealth)} />
//         ];
      
//       case 'team-leader':
//         return [
//           () => <TaskProgressChart data={transformTaskProgressData(dashboardData)} />,
//           () => <ActivityChart data={transformActivityData(recentActivity)} />
//         ];
      
//       case 'tester':
//         return [
//           () => <TaskProgressChart data={transformTaskProgressData(dashboardData)} />,
//           () => <ActivityChart data={transformActivityData(recentActivity)} />
//         ];
      
//       case 'client-admin':
//         return [
//           () => <ActivityChart data={transformActivityData(recentActivity)} />,
//           () => <TaskProgressChart data={transformTaskProgressData(dashboardData)} />
//         ];
      
//       case 'client-user':
//         return [
//           () => <TaskProgressChart data={transformTaskProgressData(dashboardData)} />
//         ];
      
//       default:
//         return [];
//     }
//   };

//   const renderSystemAlerts = () => (
//     <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
//       <CardHeader className="pb-4">
//         <CardTitle className="flex items-center gap-2 text-white">
//           <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
//             <AlertTriangle className="w-4 h-4 text-white" />
//           </div>
//           System Alerts
//         </CardTitle>
//         <CardDescription className="text-slate-400">
//           Important notifications and alerts
//         </CardDescription>
//       </CardHeader>
//       <CardContent>
//         <div className="space-y-4">
//           <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-100">
//             <AlertTriangle className="w-4 h-4 text-amber-400" />
//             <AlertDescription className="text-amber-100">
//               System maintenance scheduled for this weekend.
//             </AlertDescription>
//           </Alert>
//           <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-100">
//             <Bell className="w-4 h-4 text-blue-400" />
//             <AlertDescription className="text-blue-100">
//               New security update available for installation.
//             </AlertDescription>
//           </Alert>
//           <Alert className="bg-green-500/10 border-green-500/20 text-green-100">
//             <Sparkles className="w-4 h-4 text-green-400" />
//             <AlertDescription className="text-green-100">
//               New features have been deployed successfully.
//             </AlertDescription>
//           </Alert>
//         </div>
//       </CardContent>
//     </Card>
//   );

//   if (isLoading) {
//     return (
//       <div className="min-h-screen bg-slate-950 flex items-center justify-center">
//         <div className="text-center space-y-4">
//           <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
//             <Sparkles className="w-8 h-8 text-white" />
//           </div>
//           <p className="text-slate-400">Loading your dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-slate-950 text-white">
//       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950"></div>
//       <div className="relative p-6 space-y-6">
//         {renderWelcomeSection()}
        
//         <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
//           <DashboardStats role={user.role} stats={dashboardData} />
//         </div>
        
//         {renderQuickActions()}
        
//         {renderChartsSection()}
        
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {renderRecentActivity()}
//           {renderSystemAlerts()}
//         </div>
//       </div>
//     </div>
//   );
// }