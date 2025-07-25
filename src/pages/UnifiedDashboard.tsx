import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useAuth } from "@/contexts/AuthContext";

export function UnifiedDashboard() {
  const { user, userRole } = useAuth();

  return (
    <div className="min-h-screen bg-background flex">
      <UnifiedSidebar 
        activeTab="overview" 
        onTabChange={() => {}} 
        userRole={userRole || 'inspector'} 
      />
      <div className="flex-1 p-6">
        <Card>
          <CardHeader>
            <CardTitle>RoofMind Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Welcome back, {user?.email}!</p>
              <p className="text-muted-foreground">
                Testing with UnifiedSidebar added...
              </p>
              <div className="text-sm text-green-600">
                ✓ Basic dashboard structure working
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}