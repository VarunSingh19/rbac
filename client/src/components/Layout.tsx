import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import RoleSidebar from "./RoleSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  if (!user) {
    setLocation("/login");
    return null;
  }

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        toast({
          title: "Logged Out",
          description: "You have been successfully logged out.",
        });
        setLocation("/login");
      },
    });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <RoleSidebar user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}