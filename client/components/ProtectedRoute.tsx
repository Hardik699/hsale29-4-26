import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check authentication status synchronously
    const auth = localStorage.getItem("isAuthenticated");
    if (!auth) {
      // Redirect to login if not authenticated
      navigate("/", { replace: true });
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  // Show minimal loader while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
