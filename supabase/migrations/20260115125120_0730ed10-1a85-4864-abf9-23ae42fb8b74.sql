-- Create triggers to automatically record vehicle driver history
-- These functions already exist, but the triggers were never attached

-- Trigger for new vehicle assignments on INSERT
DROP TRIGGER IF EXISTS trigger_record_initial_vehicle_driver ON vehicles;
CREATE TRIGGER trigger_record_initial_vehicle_driver
AFTER INSERT ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.record_initial_vehicle_driver();

-- Trigger for driver changes on UPDATE
DROP TRIGGER IF EXISTS trigger_record_vehicle_driver_change ON vehicles;
CREATE TRIGGER trigger_record_vehicle_driver_change
AFTER UPDATE OF assigned_driver_id ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.record_vehicle_driver_change();

-- Backfill existing vehicle assignments into vehicle_driver_history
INSERT INTO public.vehicle_driver_history (vehicle_id, driver_id, company_id, assigned_at)
SELECT 
  v.id,
  v.assigned_driver_id,
  v.company_id,
  COALESCE(v.updated_at, v.created_at, now())
FROM vehicles v
WHERE v.assigned_driver_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vehicle_driver_history vdh 
    WHERE vdh.vehicle_id = v.id 
      AND vdh.driver_id = v.assigned_driver_id
      AND vdh.unassigned_at IS NULL
  );