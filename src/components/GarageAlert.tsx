import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Wrench } from 'lucide-react';

interface MaintenanceItem {
  id: string;
  maintenance_type: string;
  description: string | null;
  is_urgent: boolean;
}

export function GarageAlert() {
  const { profile } = useAuth();
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMaintenance() {
      if (!profile) return;

      // First get the vehicle assigned to this driver
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('id')
        .eq('assigned_driver_id', profile.id)
        .maybeSingle();

      if (!vehicleData) {
        setLoading(false);
        return;
      }

      // Then get pending maintenance for that vehicle
      const { data: maintenanceData } = await supabase
        .from('vehicle_maintenance')
        .select('id, maintenance_type, description, is_urgent')
        .eq('vehicle_id', vehicleData.id)
        .eq('is_completed', false);

      setMaintenanceItems(maintenanceData || []);
      setLoading(false);
    }

    fetchMaintenance();
  }, [profile]);

  if (loading || maintenanceItems.length === 0) {
    return null;
  }

  const hasUrgent = maintenanceItems.some(m => m.is_urgent);

  return (
    <div className={`p-4 rounded-xl border-2 ${hasUrgent ? 'border-destructive bg-destructive/10' : 'border-warning bg-warning/10'}`}>
      <div className="flex items-center gap-3 mb-3">
        {hasUrgent ? (
          <AlertTriangle className="w-6 h-6 text-destructive" />
        ) : (
          <Wrench className="w-6 h-6 text-warning" />
        )}
        <h3 className={`font-bold ${hasUrgent ? 'text-destructive' : 'text-warning'}`}>
          {hasUrgent ? 'URGENT: Garage Work Required' : 'Garage Work Required'}
        </h3>
      </div>
      
      <div className="space-y-2">
        {maintenanceItems.map(item => (
          <div 
            key={item.id} 
            className={`p-2 rounded-lg ${item.is_urgent ? 'bg-destructive/20' : 'bg-background'}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">{item.maintenance_type}</span>
              {item.is_urgent && (
                <span className="text-xs font-bold text-destructive">URGENT</span>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
          </div>
        ))}
      </div>
      
      <p className="text-sm mt-3 text-muted-foreground">
        Please take your vehicle to the garage as soon as possible.
      </p>
    </div>
  );
}