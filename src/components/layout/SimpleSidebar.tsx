import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Home, 
  Building, 
  FileText, 
  ClipboardList, 
  Wrench,
  Settings,
  LogOut
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SimpleSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: string;
}

export function SimpleSidebar({ activeTab, onTabChange, userRole }: SimpleSidebarProps) {
  const { signOut } = useAuth();

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'roofs', label: 'Properties', icon: Building },
    { id: 'inspections', label: 'Inspections', icon: FileText },
    { id: 'campaigns', label: 'Campaigns', icon: ClipboardList },
    { id: 'workorders', label: 'Work Orders', icon: Wrench },
  ];

  return (
    <Card className="w-64 min-h-screen rounded-none border-r">
      <div className="p-4">
        <h2 className="text-xl font-bold text-primary mb-6">RoofMind</h2>
        
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => onTabChange(item.id)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="mt-auto pt-8">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </Card>
  );
}