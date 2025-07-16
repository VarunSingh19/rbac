import { useAuth } from "@/hooks/useAuth";
import RoleDashboard from "@/components/RoleDashboard";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return <RoleDashboard user={user} />;
}