import { MaintenanceScheduler } from '@/components/maintenance/MaintenanceScheduler';
import { WarrantyManager } from '@/components/warranty/WarrantyManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function MaintenanceTab() {
  return (
    <div className="p-6">
      <Tabs defaultValue="scheduler" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scheduler">Maintenance Scheduling</TabsTrigger>
          <TabsTrigger value="warranty">Warranty Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="scheduler" className="mt-6">
          <MaintenanceScheduler />
        </TabsContent>
        
        <TabsContent value="warranty" className="mt-6">
          <WarrantyManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}