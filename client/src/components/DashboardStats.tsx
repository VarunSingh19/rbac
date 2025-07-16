import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Activity, Users, Target, Shield, Clock, Database, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import CountUp from 'react-countup';

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  description?: string;
  trend?: Array<number>;
  color?: string;
  prefix?: string;
  suffix?: string;
  progress?: number;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon, 
  description, 
  trend,
  color = 'primary',
  prefix = '',
  suffix = '',
  progress,
  className
}: StatCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getIconColor = () => {
    switch (color) {
      case 'success': return 'text-green-400 bg-green-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      case 'danger': return 'text-red-400 bg-red-500/20';
      case 'info': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-primary bg-primary/20';
    }
  };

  return (
    <Card className={cn("relative overflow-hidden card-hover", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg", getIconColor())}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <CountUp 
            start={0} 
            end={value} 
            duration={1.5} 
            prefix={prefix}
            suffix={suffix}
            separator=","
          />
        </div>
        
        {change !== undefined && (
          <div className="flex items-center space-x-2 text-sm mt-2">
            {changeType === 'positive' ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : changeType === 'negative' ? (
              <TrendingDown className="w-4 h-4 text-red-400" />
            ) : null}
            <span className={getChangeColor()}>
              {change > 0 ? '+' : ''}{change}%
            </span>
            <span className="text-muted-foreground">from last month</span>
          </div>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
        
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardStatsProps {
  role: string;
  stats: any;
}

export default function DashboardStats({ role, stats }: DashboardStatsProps) {
  const getStatsForRole = () => {
    switch (role) {
      case 'superadmin':
        return [
          {
            title: 'Total Users',
            value: stats?.totalUsers || 0,
            change: 12,
            changeType: 'positive' as const,
            icon: <Users className="w-4 h-4" />,
            description: 'Active system users',
            color: 'info'
          },
          {
            title: 'Active Sessions',
            value: stats?.activeUsers || 0,
            change: 8,
            changeType: 'positive' as const,
            icon: <Activity className="w-4 h-4" />,
            description: 'Currently online',
            color: 'success'
          },
          {
            title: 'Total Assets',
            value: stats?.totalAssets || 0,
            change: 15,
            changeType: 'positive' as const,
            icon: <Database className="w-4 h-4" />,
            description: 'Managed assets',
            color: 'primary'
          },
          {
            title: 'Security Alerts',
            value: stats?.securityAlerts || 0,
            change: -25,
            changeType: 'negative' as const,
            icon: <AlertTriangle className="w-4 h-4" />,
            description: 'Vulnerability reports',
            color: 'danger'
          },
          {
            title: 'System Health',
            value: stats?.systemHealthScore || 100,
            change: 5,
            changeType: 'positive' as const,
            icon: <CheckCircle className="w-4 h-4" />,
            description: 'Overall system status',
            color: 'success',
            suffix: '%'
          },
          {
            title: 'Total Reports',
            value: stats?.totalReports || 0,
            change: 20,
            changeType: 'positive' as const,
            icon: <Shield className="w-4 h-4" />,
            description: 'Security reports',
            color: 'info'
          }
        ];
      
      case 'admin':
        return [
          {
            title: 'Total Users',
            value: stats?.totalUsers || 0,
            change: 8,
            changeType: 'positive' as const,
            icon: <Users className="w-4 h-4" />,
            description: 'System users',
            color: 'info'
          },
          {
            title: 'Active Users',
            value: stats?.activeUsers || 0,
            change: 5,
            changeType: 'positive' as const,
            icon: <Activity className="w-4 h-4" />,
            description: 'Currently online',
            color: 'success'
          },
          {
            title: 'Total Assets',
            value: stats?.totalAssets || 0,
            change: 12,
            changeType: 'positive' as const,
            icon: <Database className="w-4 h-4" />,
            description: 'Managed assets',
            color: 'primary'
          },
          {
            title: 'Team Members',
            value: stats?.teamMembersCount || 0,
            change: 3,
            changeType: 'positive' as const,
            icon: <Users className="w-4 h-4" />,
            description: 'Active team members',
            color: 'info'
          },
          {
            title: 'Pending Tasks',
            value: stats?.pendingTasks || 0,
            change: -5,
            changeType: 'negative' as const,
            icon: <Target className="w-4 h-4" />,
            description: 'Awaiting assignment',
            color: 'warning'
          },
          {
            title: 'System Health',
            value: stats?.systemHealthScore || 100,
            change: 2,
            changeType: 'positive' as const,
            icon: <CheckCircle className="w-4 h-4" />,
            description: 'System status',
            color: 'success',
            suffix: '%'
          }
        ];
      
      case 'team-leader':
        return [
          {
            title: 'Team Size',
            value: stats?.teamSize || 0,
            change: 2,
            changeType: 'positive' as const,
            icon: <Users className="w-4 h-4" />,
            description: 'Team members',
            color: 'info'
          },
          {
            title: 'Active Members',
            value: stats?.activeTeamMembers || 0,
            change: 1,
            changeType: 'positive' as const,
            icon: <Activity className="w-4 h-4" />,
            description: 'Currently online',
            color: 'success'
          },
          {
            title: 'Assigned Tasks',
            value: stats?.assignedTasks || 0,
            change: 5,
            changeType: 'positive' as const,
            icon: <Target className="w-4 h-4" />,
            description: 'Current assignments',
            color: 'primary'
          },
          {
            title: 'Completed Tasks',
            value: stats?.completedTasks || 0,
            change: 8,
            changeType: 'positive' as const,
            icon: <CheckCircle className="w-4 h-4" />,
            description: 'Tasks completed',
            color: 'success'
          },
          {
            title: 'Pending Tasks',
            value: stats?.pendingTasks || 0,
            change: -3,
            changeType: 'negative' as const,
            icon: <Clock className="w-4 h-4" />,
            description: 'Awaiting completion',
            color: 'warning'
          },
          {
            title: 'Total Reports',
            value: stats?.totalReports || 0,
            change: 15,
            changeType: 'positive' as const,
            icon: <Shield className="w-4 h-4" />,
            description: 'Security reports',
            color: 'info'
          }
        ];
      
      case 'tester':
        return [
          {
            title: 'Assigned Tasks',
            value: stats?.assignedTasks || 0,
            change: 3,
            changeType: 'positive' as const,
            icon: <Target className="w-4 h-4" />,
            description: 'Current assignments',
            color: 'primary'
          },
          {
            title: 'Completed Tasks',
            value: stats?.completedTasks || 0,
            change: 7,
            changeType: 'positive' as const,
            icon: <CheckCircle className="w-4 h-4" />,
            description: 'Tasks completed',
            color: 'success'
          },
          {
            title: 'Pending Tasks',
            value: stats?.pendingTasks || 0,
            change: -2,
            changeType: 'negative' as const,
            icon: <Clock className="w-4 h-4" />,
            description: 'Awaiting completion',
            color: 'warning'
          },
          {
            title: 'Test Coverage',
            value: stats?.testCoverage || 0,
            change: 10,
            changeType: 'positive' as const,
            icon: <Activity className="w-4 h-4" />,
            description: 'Completion rate',
            color: 'info',
            suffix: '%'
          },
          {
            title: 'Bugs Found',
            value: stats?.bugsFound || 0,
            change: 4,
            changeType: 'positive' as const,
            icon: <AlertTriangle className="w-4 h-4" />,
            description: 'Vulnerabilities found',
            color: 'danger'
          },
          {
            title: 'Test Cases Run',
            value: stats?.testCasesRun || 0,
            change: 12,
            changeType: 'positive' as const,
            icon: <Zap className="w-4 h-4" />,
            description: 'Tests executed',
            color: 'success'
          }
        ];
      
      case 'client-admin':
        return [
          {
            title: 'Team Size',
            value: stats?.clientTeamSize || 0,
            change: 1,
            changeType: 'positive' as const,
            icon: <Users className="w-4 h-4" />,
            description: 'Team members',
            color: 'info'
          },
          {
            title: 'Active Team',
            value: stats?.activeClientTeam || 0,
            change: 1,
            changeType: 'positive' as const,
            icon: <Activity className="w-4 h-4" />,
            description: 'Currently online',
            color: 'success'
          },
          {
            title: 'Total Assets',
            value: stats?.totalAssets || 0,
            change: 5,
            changeType: 'positive' as const,
            icon: <Database className="w-4 h-4" />,
            description: 'Managed assets',
            color: 'primary'
          },
          {
            title: 'Active Projects',
            value: stats?.activeProjects || 0,
            change: 3,
            changeType: 'positive' as const,
            icon: <Target className="w-4 h-4" />,
            description: 'In progress',
            color: 'warning'
          },
          {
            title: 'Completed Projects',
            value: stats?.completedProjects || 0,
            change: 8,
            changeType: 'positive' as const,
            icon: <CheckCircle className="w-4 h-4" />,
            description: 'Successfully completed',
            color: 'success'
          },
          {
            title: 'Completion Rate',
            value: stats?.completionRate || 0,
            change: 5,
            changeType: 'positive' as const,
            icon: <Activity className="w-4 h-4" />,
            description: 'Project success rate',
            color: 'info',
            suffix: '%'
          }
        ];
      
      case 'client-user':
        return [
          {
            title: 'Assigned Assets',
            value: stats?.assignedAssets || 0,
            change: 2,
            changeType: 'positive' as const,
            icon: <Database className="w-4 h-4" />,
            description: 'Current assignments',
            color: 'primary'
          },
          {
            title: 'Completed Assets',
            value: stats?.completedAssets || 0,
            change: 3,
            changeType: 'positive' as const,
            icon: <CheckCircle className="w-4 h-4" />,
            description: 'Successfully completed',
            color: 'success'
          },
          {
            title: 'Pending Assets',
            value: stats?.pendingAssets || 0,
            change: -1,
            changeType: 'negative' as const,
            icon: <Clock className="w-4 h-4" />,
            description: 'Awaiting completion',
            color: 'warning'
          },
          {
            title: 'Completion Rate',
            value: stats?.completionRate || 0,
            change: 8,
            changeType: 'positive' as const,
            icon: <Activity className="w-4 h-4" />,
            description: 'Success rate',
            color: 'info',
            suffix: '%'
          },
          {
            title: 'Total Reports',
            value: stats?.totalReports || 0,
            change: 5,
            changeType: 'positive' as const,
            icon: <Shield className="w-4 h-4" />,
            description: 'Security reports',
            color: 'info'
          }
        ];
      
      default:
        return [
          {
            title: 'Dashboard',
            value: 0,
            change: 0,
            changeType: 'neutral' as const,
            icon: <Activity className="w-4 h-4" />,
            description: 'No data available',
            color: 'primary'
          }
        ];
    }
  };

  const roleStats = getStatsForRole();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {roleStats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}