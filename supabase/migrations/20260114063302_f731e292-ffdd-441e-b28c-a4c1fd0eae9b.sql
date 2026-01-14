-- Fix 1: Add authorization to add_staff_to_company function
-- This prevents managers from adding staff to companies they don't manage
CREATE OR REPLACE FUNCTION public.add_staff_to_company(
  _user_id UUID,
  _company_id UUID,
  _full_name TEXT,
  _role app_role,
  _contracted_hours NUMERIC DEFAULT 40,
  _email TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is a manager of the target company
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND company_id = _company_id
    AND role = 'manager'
  ) THEN
    RAISE EXCEPTION 'Permission denied: not a manager of this company';
  END IF;

  -- Update or insert the profile
  INSERT INTO public.profiles (user_id, company_id, full_name, role, contracted_hours, email, is_active)
  VALUES (_user_id, _company_id, _full_name, _role, _contracted_hours, _email, true)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    company_id = _company_id,
    full_name = _full_name,
    role = _role,
    contracted_hours = _contracted_hours,
    email = COALESCE(_email, profiles.email),
    is_active = true,
    updated_at = now();
END;
$$;

-- Fix 2: Add authorization to register_company function
-- This prevents users from registering companies for other users or registering multiple companies
CREATE OR REPLACE FUNCTION public.register_company(company_name TEXT, user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
  existing_company_id UUID;
BEGIN
  -- Verify caller is registering for themselves
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Permission denied: can only register company for yourself';
  END IF;
  
  -- Check if user already has a company
  SELECT company_id INTO existing_company_id
  FROM public.profiles
  WHERE profiles.user_id = register_company.user_id;
  
  IF existing_company_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;

  -- Create the company
  INSERT INTO public.companies (name)
  VALUES (company_name)
  RETURNING id INTO new_company_id;
  
  -- Update the user's profile to be a manager of this company
  UPDATE public.profiles
  SET 
    company_id = new_company_id,
    role = 'manager'
  WHERE profiles.user_id = register_company.user_id;
  
  -- Add manager role to user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (register_company.user_id, 'manager')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new_company_id;
END;
$$;

-- Fix 3: Remove the dangerous public SELECT policy on vehicle_inspection_links
DROP POLICY IF EXISTS "Anyone can read inspection links by token" ON public.vehicle_inspection_links;

-- Fix 4: Add a manager-only SELECT policy for vehicle_inspection_links
-- Note: The "Managers can manage inspection links" ALL policy already covers SELECT for managers,
-- but we'll add a cleaner explicit SELECT policy
CREATE POLICY "Managers can view company inspection links"
ON public.vehicle_inspection_links
FOR SELECT
USING (
  company_id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'manager'
  )
);