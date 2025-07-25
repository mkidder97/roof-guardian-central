import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import { UnifiedDashboard } from "./pages/UnifiedDashboard";
import AuthPage from "./components/auth/AuthPage";
import NotFound from "./pages/NotFound";
import InspectorInterface from "./pages/InspectorInterface";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-2xl font-bold text-primary">RoofMind</div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-2xl font-bold text-primary">RoofMind Dashboard</div>
            <div className="text-muted-foreground">App is working! Now testing individual routes...</div>
          </div>
        </div>
      } />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;