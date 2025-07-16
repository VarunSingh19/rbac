import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  Settings,
  Shield,
  Activity,
  FileText,
  Target,
  UserCheck,
  ChevronDown,
  ChevronRight,
  LogOut,
  BarChart3,
  Clock,
  Database,
  Briefcase,
  TestTube,
  FolderOpen,
  Bell,
  Search,
  Command,
  Home,
  UserPlus,
  Calendar,
  ChartLine,
  TrendingUp,
  PieChart,
  Zap,
  Globe,
  Lock,
  Eye,
  UserCog,
} from "lucide-react";
import { User } from "@shared/schema";

interface RoleSidebarProps {
  user: User;
  onLogout: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string;
  children?: MenuItem[];
  roles: string[];
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    href: "/",
    roles: [
      "superadmin",
      "admin",
      "team-leader",
      "tester",
      "client-admin",
      "client-user",
    ],
  },
  {
    id: "consultation-requests",
    label: "Consultation Requests",
    icon: <Bell className="w-5 h-5" />,
    href: "/consultation-requests",
    roles: ["superadmin", "admin"],
  },

  {
    id: "user-management",
    label: "User Management",
    icon: <Users className="w-5 h-5" />,
    href: "/user-management",
    roles: ["superadmin", "admin", "team-leader", "client-admin"],
  },
  {
    id: "assets",
    label: "Assets",
    icon: <Database className="w-5 h-5" />,
    href: "/assets",
    roles: ["superadmin", "admin", "client-admin"],
  },
  {
    id: "tasks",
    label: "My Tasks",
    icon: <Target className="w-5 h-5" />,
    href: "/tasks",
    roles: ["team-leader"],
  },
  {
    id: "assigned-tasks",
    label: "My Assigned Tasks",
    icon: <UserCheck className="w-5 h-5" />,
    href: "/my-assigned-tasks",
    roles: ["tester"],
  },
  {
    id: "client-assets",
    label: "My Assets",
    icon: <Briefcase className="w-5 h-5" />,
    href: "/my-client-assets",
    roles: ["client-user"],
  },

  {
    id: "reports",
    label: "Reports",
    icon: <FileText className="w-5 h-5" />,
    href: "/reports",
    roles: ["superadmin", "admin", "team-leader", "tester", "client-admin"],
  },
  {
    id: "monitoring",
    label: "System Monitoring",
    icon: <Activity className="w-5 h-5" />,
    roles: ["superadmin", "admin"],
    children: [
      {
        id: "activity-logs",
        label: "Activity Logs",
        icon: <Clock className="w-4 h-4" />,
        href: "/activity-logs",
        roles: ["superadmin", "admin"],
      },
      {
        id: "user-sessions",
        label: "User Sessions",
        icon: <UserCog className="w-4 h-4" />,
        href: "/user-sessions",
        roles: ["superadmin", "admin"],
      },
      {
        id: "system-health",
        label: "System Health",
        icon: <Zap className="w-4 h-4" />,
        href: "/system-health",
        roles: ["superadmin", "admin"],
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: <Shield className="w-5 h-5" />,
    roles: ["superadmin", "admin"],
    children: [
      {
        id: "access-control",
        label: "Access Control",
        icon: <Lock className="w-4 h-4" />,
        href: "/access-control",
        roles: ["superadmin", "admin"],
      },
      // {
      //   id: "audit-trail",
      //   label: "Audit Trail",
      //   icon: <Eye className="w-4 h-4" />,
      //   href: "/security/audit-trail",
      //   roles: ["superadmin", "admin"],
      // },
    ],
  },
  {
    id: "profile",
    label: "Profile",
    icon: <UserCog className="w-5 h-5" />,
    href: "/profile",
    roles: [
      "superadmin",
      "admin",
      "team-leader",
      "tester",
      "client-admin",
      "client-user",
    ],
  },
];

export default function RoleSidebar({ user, onLogout }: RoleSidebarProps) {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["dashboard"]);
  const [collapsed, setCollapsed] = useState(false);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const filterItemsByRole = (items: MenuItem[]): MenuItem[] => {
    return items.filter((item) => {
      if (!item.roles.includes(user.role)) return false;
      if (item.children) {
        item.children = filterItemsByRole(item.children);
      }
      return true;
    });
  };

  const filteredMenuItems = filterItemsByRole(menuItems);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "admin":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "team-leader":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "tester":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "client-admin":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "client-user":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const isActive = location === item.href;
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="mb-1">
        {item.href ? (
          <Link href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-10 text-sm font-medium transition-all duration-200",
                "hover:bg-accent/50 hover:text-accent-foreground",
                level > 0 && "ml-4 h-8",
                isActive &&
                  "bg-primary/10 text-primary border-r-2 border-primary",
                collapsed && "justify-center px-2",
              )}
            >
              <span
                className={cn("flex items-center gap-3", collapsed && "gap-0")}
              >
                {item.icon}
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className="ml-auto h-5 text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </span>
            </Button>
          </Link>
        ) : (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-10 text-sm font-medium transition-all duration-200",
              "hover:bg-accent/50 hover:text-accent-foreground",
              level > 0 && "ml-4 h-8",
              collapsed && "justify-center px-2",
            )}
            onClick={() => toggleExpanded(item.id)}
          >
            <span
              className={cn("flex items-center gap-3", collapsed && "gap-0")}
            >
              {item.icon}
              {!collapsed && (
                <>
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto h-5 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {hasChildren && (
                    <span className="ml-auto">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  )}
                </>
              )}
            </span>
          </Button>
        )}

        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg gradient-text">SecureHub</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 p-0"
          >
            <Command className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary-foreground">
              {user.firstName?.[0] || user.username[0].toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.username}
              </p>
              <Badge
                variant="outline"
                className={cn("text-xs mt-1", getRoleColor(user.role))}
              >
                {user.role.replace("-", " ")}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-2">
          {filteredMenuItems.map((item) => renderMenuItem(item))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-10 text-sm font-medium",
            "hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center px-2",
          )}
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </div>
  );
}
