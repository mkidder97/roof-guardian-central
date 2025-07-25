import React from "react";

// Temporarily disabled

const TestComponent: React.FC = () => {
  const [count, setCount] = React.useState(0);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-2xl font-bold text-primary">Test Component</div>
        <div className="text-muted-foreground">Count: {count}</div>
        <button 
          onClick={() => setCount(c => c + 1)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Increment
        </button>
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
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
      <Route path="/test" element={<TestComponent />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-2xl font-bold">RoofMind Dashboard</div>
        <div className="text-muted-foreground">System temporarily in maintenance mode</div>
        <div className="text-sm text-gray-500">App will be restored shortly</div>
      </div>
    </div>
  );
};

export default App;