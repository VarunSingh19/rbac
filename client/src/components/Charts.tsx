import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  label?: string;
  color?: string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
}

interface ChartProps {
  title: string;
  description?: string;
  data: ChartData[];
  type: 'area' | 'bar' | 'pie' | 'line';
  height?: number;
  className?: string;
  showTrend?: boolean;
  colors?: string[];
}

const defaultColors = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

export function Chart({ title, description, data, type, height = 300, className, showTrend = false, colors = defaultColors }: ChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (type) {
      case 'area': {
        // Force a vivid cyan color for the area chart, regardless of props
        const areaStroke = "#06b6d4"; // Vivid cyan
        const areaFillGradientId = "areaGradientCyan";
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={areaFillGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={areaStroke} stopOpacity={0.7}/>
                  <stop offset="80%" stopColor={areaStroke} stopOpacity={0.18}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={areaStroke}
                fillOpacity={1}
                fill={`url(#${areaFillGradientId})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      }

      
      case 'bar': {
        // Force vivid cyan for bars
        const barFill = "#06b6d4";
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill={barFill} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      
      case 'pie': {
        // Force vivid cyan for all pie slices (customize palette if you want)
        const pieFill = "#06b6d4";
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name }) => name}
                outerRadius={80}
                fill={pieFill}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieFill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        );
      }
      
      case 'line': {
        // Force vivid cyan for line and dots
        const lineStroke = "#06b6d4";
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineStroke}
                strokeWidth={2}
                dot={{ fill: lineStroke, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: lineStroke, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      }
      
      default:
        return null;
    }
  };

  return (
    <Card className={cn("card-hover", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {showTrend && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}

// Specialized chart components for specific use cases
export function ActivityChart({ data, className }: { data: ChartData[]; className?: string }) {
  return (
    <Chart
      title="Activity Overview"
      description="System activity over time"
      data={data}
      type="area"
      height={250}
      className={className}
      showTrend
    />
  );
}

export function UserDistributionChart({ data, className }: { data: ChartData[]; className?: string }) {
  return (
    <Chart
      title="User Distribution"
      description="Users by role"
      data={data}
      type="pie"
      height={250}
      className={className}
    />
  );
}

export function TaskProgressChart({ data, className }: { data: ChartData[]; className?: string }) {
  return (
    <Chart
      title="Task Progress"
      description="Weekly task completion"
      data={data}
      type="bar"
      height={250}
      className={className}
      showTrend
    />
  );
}

export function SystemHealthChart({ data, className }: { data: ChartData[]; className?: string }) {
  return (
    <Chart
      title="System Health"
      description="Performance metrics"
      data={data}
      type="line"
      height={250}
      className={className}
      showTrend
    />
  );
}

// Real data transformers for charts
export const transformActivityData = (recentActivity: any[]) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const activityByDay = days.map(day => ({
    name: day,
    value: 0,
    label: day,
    color: 'hsl(var(--primary))'
  }));

  // Group activities by day of week
  recentActivity.forEach(activity => {
    const date = new Date(activity.timestamp);
    const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert to Mon=0, Sun=6
    activityByDay[mappedIndex].value += 1;
  });

  return activityByDay;
};

export const transformUserDistributionData = (usersByRole: Record<string, number>) => {
  return Object.entries(usersByRole).map(([role, count], index) => ({
    name: role.replace('-', ' '),
    value: count,
    label: role.replace('-', ' '),
    color: `hsl(var(--chart-${(index % 5) + 1}))`
  }));
};

export const transformTaskProgressData = (stats: any) => {
  const data = [];
  
  // Handle undefined stats
  if (!stats) {
    return [];
  }
  
  if (stats.completedTasks !== undefined) {
    data.push({
      name: 'Completed',
      value: stats.completedTasks,
      label: 'Completed',
      color: 'hsl(var(--chart-1))'
    });
  }
  
  if (stats.pendingTasks !== undefined) {
    data.push({
      name: 'Pending',
      value: stats.pendingTasks,
      label: 'Pending',
      color: 'hsl(var(--chart-2))'
    });
  }
  
  if (stats.assignedTasks !== undefined) {
    data.push({
      name: 'In Progress',
      value: stats.assignedTasks - (stats.completedTasks || 0),
      label: 'In Progress',
      color: 'hsl(var(--chart-3))'
    });
  }

  return data.filter(item => item.value > 0);
};

export const transformSystemHealthData = (systemHealth: any[]) => {
  return systemHealth.map((component, index) => ({
    name: component.component,
    value: component.status === 'healthy' ? 100 : component.status === 'degraded' ? 75 : 25,
    label: component.component,
    color: component.status === 'healthy' ? 'hsl(var(--chart-1))' : 
           component.status === 'degraded' ? 'hsl(var(--chart-3))' : 'hsl(var(--destructive))'
  }));
};