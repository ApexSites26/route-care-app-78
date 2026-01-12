-- 1. Vehicle Driver History - Track when drivers start/stop driving vehicles
CREATE TABLE public.vehicle_driver_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Garage Visits - Driver-submitted garage visit logs (immutable)
CREATE TABLE public.garage_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason_type TEXT NOT NULL CHECK (reason_type IN ('bulb_replacement', 'fluid_topup', 'tyre_check', 'other')),
  notes TEXT,
  mileage INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_by UUID NOT NULL REFERENCES auth.users(id)
);

-- 3. Workshop Records - Manager-only workshop bookings (immutable)
CREATE TABLE public.workshop_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  date_left TIMESTAMPTZ NOT NULL,
  date_returned TIMESTAMPTZ,
  work_carried_out TEXT NOT NULL,
  garage_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_by UUID NOT NULL REFERENCES auth.users(id)
);

-- 4. Vehicle Defects - Defect reports with resolution tracking
CREATE TABLE public.vehicle_defects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_entry_id UUID REFERENCES public.driver_entries(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  defect_description TEXT NOT NULL,
  date_identified DATE NOT NULL DEFAULT CURRENT_DATE,
  reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  date_corrected DATE,
  action_taken TEXT,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.vehicle_driver_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garage_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_defects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicle_driver_history
CREATE POLICY "Users can view vehicle driver history for their company"
ON public.vehicle_driver_history FOR SELECT
USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Managers can insert vehicle driver history"
ON public.vehicle_driver_history FOR INSERT
WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() AND role = 'manager' LIMIT 1));

CREATE POLICY "Managers can update vehicle driver history"
ON public.vehicle_driver_history FOR UPDATE
USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() AND role = 'manager' LIMIT 1));

-- RLS Policies for garage_visits
CREATE POLICY "Users can view garage visits for their company"
ON public.garage_visits FOR SELECT
USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Drivers and escorts can create garage visits"
ON public.garage_visits FOR INSERT
WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

-- RLS Policies for workshop_records
CREATE POLICY "Users can view workshop records for their company"
ON public.workshop_records FOR SELECT
USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Managers can create workshop records"
ON public.workshop_records FOR INSERT
WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() AND role = 'manager' LIMIT 1));

-- RLS Policies for vehicle_defects
CREATE POLICY "Users can view defects for their company"
ON public.vehicle_defects FOR SELECT
USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Users can create defects for their company"
ON public.vehicle_defects FOR INSERT
WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Managers can update defects"
ON public.vehicle_defects FOR UPDATE
USING (company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid() AND role = 'manager' LIMIT 1));

-- Function to record vehicle driver assignment changes
CREATE OR REPLACE FUNCTION public.record_vehicle_driver_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If driver is being unassigned (changed from one driver to another or to null)
  IF OLD.assigned_driver_id IS NOT NULL AND (NEW.assigned_driver_id IS NULL OR NEW.assigned_driver_id != OLD.assigned_driver_id) THEN
    UPDATE public.vehicle_driver_history
    SET unassigned_at = now()
    WHERE vehicle_id = NEW.id AND driver_id = OLD.assigned_driver_id AND unassigned_at IS NULL;
  END IF;
  
  -- If a new driver is being assigned
  IF NEW.assigned_driver_id IS NOT NULL AND (OLD.assigned_driver_id IS NULL OR NEW.assigned_driver_id != OLD.assigned_driver_id) THEN
    INSERT INTO public.vehicle_driver_history (vehicle_id, driver_id, company_id, assigned_at)
    VALUES (NEW.id, NEW.assigned_driver_id, NEW.company_id, now());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for vehicle driver changes
CREATE TRIGGER on_vehicle_driver_change
AFTER UPDATE OF assigned_driver_id ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.record_vehicle_driver_change();

-- Trigger for new vehicle with driver assigned
CREATE OR REPLACE FUNCTION public.record_initial_vehicle_driver()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_driver_id IS NOT NULL THEN
    INSERT INTO public.vehicle_driver_history (vehicle_id, driver_id, company_id, assigned_at)
    VALUES (NEW.id, NEW.assigned_driver_id, NEW.company_id, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_vehicle_insert_with_driver
AFTER INSERT ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.record_initial_vehicle_driver();