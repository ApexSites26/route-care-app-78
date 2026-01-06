-- School runs table
CREATE TABLE public.school_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_code TEXT NOT NULL UNIQUE,
  description TEXT,
  pickup_time_home TIME,
  pickup_time_school TIME,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Run allocations - links runs to drivers/escorts with day of week
CREATE TABLE public.run_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.school_runs(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  escort_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(run_id, day_of_week)
);

-- Vehicle maintenance/garage work
CREATE TABLE public.vehicle_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL,
  description TEXT,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.school_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;

-- School runs policies (managers full access, drivers/escorts can view)
CREATE POLICY "Managers can manage school runs" ON public.school_runs
  FOR ALL USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Drivers can view school runs" ON public.school_runs
  FOR SELECT USING (has_role(auth.uid(), 'driver'));

CREATE POLICY "Escorts can view school runs" ON public.school_runs
  FOR SELECT USING (has_role(auth.uid(), 'escort'));

-- Run allocations policies
CREATE POLICY "Managers can manage allocations" ON public.run_allocations
  FOR ALL USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Drivers can view their allocations" ON public.run_allocations
  FOR SELECT USING (
    driver_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Escorts can view their allocations" ON public.run_allocations
  FOR SELECT USING (
    escort_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Vehicle maintenance policies
CREATE POLICY "Managers can manage maintenance" ON public.vehicle_maintenance
  FOR ALL USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Drivers can view maintenance for their vehicle" ON public.vehicle_maintenance
  FOR SELECT USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE assigned_driver_id = (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_school_runs_updated_at
  BEFORE UPDATE ON public.school_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_run_allocations_updated_at
  BEFORE UPDATE ON public.run_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();