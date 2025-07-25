import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export function UnifiedDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>RoofMind Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Welcome back, {user?.email}!</p>
              <p className="text-muted-foreground">
                Unified Dashboard is loading step by step...
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