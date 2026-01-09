-- Create companies table for multi-tenancy
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '222 47% 51%',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Add company_id to profiles
ALTER TABLE public.profiles ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to vehicles
ALTER TABLE public.vehicles ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to school_runs
ALTER TABLE public.school_runs ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to driver_entries
ALTER TABLE public.driver_entries ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to escort_entries
ALTER TABLE public.escort_entries ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to vehicle_maintenance
ALTER TABLE public.vehicle_maintenance ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Add company_id to run_allocations
ALTER TABLE public.run_allocations ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Create audit_logs table for compliance
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id
$$;

-- RLS policies for companies table
CREATE POLICY "Users can view their own company"
ON public.companies FOR SELECT
USING (id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can update their company"
ON public.companies FOR UPDATE
USING (id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'manager'));

-- RLS policies for audit_logs
CREATE POLICY "Managers can view company audit logs"
ON public.audit_logs FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'manager'));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Update trigger for companies
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing RLS policies to include company isolation

-- Drop and recreate profiles policies with company isolation
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can delete profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view company profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can insert company profiles"
ON public.profiles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can update company profiles"
ON public.profiles FOR UPDATE
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can delete company profiles"
ON public.profiles FOR DELETE
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

-- Update vehicles policies
DROP POLICY IF EXISTS "Drivers can view their assigned vehicle" ON public.vehicles;
DROP POLICY IF EXISTS "Managers can view all vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Managers can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Managers can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Managers can delete vehicles" ON public.vehicles;

CREATE POLICY "Drivers can view their assigned vehicle"
ON public.vehicles FOR SELECT
USING (assigned_driver_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can view company vehicles"
ON public.vehicles FOR SELECT
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can insert company vehicles"
ON public.vehicles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can update company vehicles"
ON public.vehicles FOR UPDATE
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can delete company vehicles"
ON public.vehicles FOR DELETE
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

-- Update driver_entries policies
DROP POLICY IF EXISTS "Drivers can view their own entries" ON public.driver_entries;
DROP POLICY IF EXISTS "Drivers can insert their own entries" ON public.driver_entries;
DROP POLICY IF EXISTS "Drivers can update their own entries" ON public.driver_entries;
DROP POLICY IF EXISTS "Managers can view all driver entries" ON public.driver_entries;

CREATE POLICY "Drivers can view their own entries"
ON public.driver_entries FOR SELECT
USING (auth.uid() = user_id AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Drivers can insert their own entries"
ON public.driver_entries FOR INSERT
WITH CHECK (auth.uid() = user_id AND get_user_role(auth.uid()) = 'driver' AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Drivers can update their own entries"
ON public.driver_entries FOR UPDATE
USING (auth.uid() = user_id AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can view company driver entries"
ON public.driver_entries FOR SELECT
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

-- Update escort_entries policies
DROP POLICY IF EXISTS "Escorts can view their own entries" ON public.escort_entries;
DROP POLICY IF EXISTS "Escorts can insert their own entries" ON public.escort_entries;
DROP POLICY IF EXISTS "Escorts can update their own entries" ON public.escort_entries;
DROP POLICY IF EXISTS "Managers can view all escort entries" ON public.escort_entries;

CREATE POLICY "Escorts can view their own entries"
ON public.escort_entries FOR SELECT
USING (auth.uid() = user_id AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Escorts can insert their own entries"
ON public.escort_entries FOR INSERT
WITH CHECK (auth.uid() = user_id AND get_user_role(auth.uid()) = 'escort' AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Escorts can update their own entries"
ON public.escort_entries FOR UPDATE
USING (auth.uid() = user_id AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can view company escort entries"
ON public.escort_entries FOR SELECT
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

-- Update school_runs policies
DROP POLICY IF EXISTS "Drivers can view school runs" ON public.school_runs;
DROP POLICY IF EXISTS "Escorts can view school runs" ON public.school_runs;
DROP POLICY IF EXISTS "Managers can manage school runs" ON public.school_runs;

CREATE POLICY "Staff can view company school runs"
ON public.school_runs FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can insert company school runs"
ON public.school_runs FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can update company school runs"
ON public.school_runs FOR UPDATE
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can delete company school runs"
ON public.school_runs FOR DELETE
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

-- Update run_allocations policies
DROP POLICY IF EXISTS "Drivers can view their allocations" ON public.run_allocations;
DROP POLICY IF EXISTS "Escorts can view their allocations" ON public.run_allocations;
DROP POLICY IF EXISTS "Managers can manage allocations" ON public.run_allocations;

CREATE POLICY "Drivers can view their allocations"
ON public.run_allocations FOR SELECT
USING (driver_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Escorts can view their allocations"
ON public.run_allocations FOR SELECT
USING (escort_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can view company allocations"
ON public.run_allocations FOR SELECT
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can insert company allocations"
ON public.run_allocations FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can update company allocations"
ON public.run_allocations FOR UPDATE
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can delete company allocations"
ON public.run_allocations FOR DELETE
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

-- Update vehicle_maintenance policies
DROP POLICY IF EXISTS "Drivers can view maintenance for their vehicle" ON public.vehicle_maintenance;
DROP POLICY IF EXISTS "Managers can manage maintenance" ON public.vehicle_maintenance;

CREATE POLICY "Drivers can view their vehicle maintenance"
ON public.vehicle_maintenance FOR SELECT
USING (vehicle_id IN (SELECT id FROM vehicles WHERE assigned_driver_id = (SELECT id FROM profiles WHERE user_id = auth.uid())) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can view company maintenance"
ON public.vehicle_maintenance FOR SELECT
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can insert company maintenance"
ON public.vehicle_maintenance FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can update company maintenance"
ON public.vehicle_maintenance FOR UPDATE
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can delete company maintenance"
ON public.vehicle_maintenance FOR DELETE
USING (has_role(auth.uid(), 'manager') AND company_id = get_user_company_id(auth.uid()));

-- Drop app_settings table as we're now using companies table for branding
DROP TABLE IF EXISTS public.app_settings;