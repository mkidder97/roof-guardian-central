import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/monitoring/ErrorBoundary";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import { UnifiedDashboard } from "./pages/UnifiedDashboard";
import AuthPage from "./components/auth/AuthPage";
import NotFound from "./pages/NotFound";
import InspectorInterface from "./pages/InspectorInterface";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, loading, error, isRetrying, retryAuth } = useAuth();

  if (loading || isRetrying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="text-2xl font-bold text-primary">RoofMind</div>
          <div className="text-muted-foreground">
            {isRetrying ? 'Retrying connection...' : 'Loading...'}
          </div>
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-semibold mb-2">Connection Issue</div>
              <div className="text-red-700 text-sm mb-4">{error}</div>
              <button 
                onClick={retryAuth}
                disabled={isRetrying}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isRetrying ? 'Retrying...' : 'Retry Connection'}
              </button>
            </div>
          )}
          
          {!error && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          )}
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

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary 
        componentName="App"
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-2xl font-bold text-primary">RoofMind</div>
              <div className="text-muted-foreground">Loading...</div>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                Reload
              </button>
            </div>
          </div>
        }
        onError={() => {
          // Clear all caches on React error
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
              registrations.forEach(reg => reg.unregister());
            });
          }
          localStorage.clear();
          sessionStorage.clear();
        }}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;