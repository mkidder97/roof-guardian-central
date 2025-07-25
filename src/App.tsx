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
      <Route path="/" element={<UnifiedDashboard />} />
      <Route path="/dashboard" element={<UnifiedDashboard />} />
      <Route path="/legacy" element={<Dashboard />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/inspector" element={<InspectorInterface />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-2xl font-bold text-primary">RoofMind</div>
            <div className="text-muted-foreground">Testing without AuthProvider and Toasters...</div>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;