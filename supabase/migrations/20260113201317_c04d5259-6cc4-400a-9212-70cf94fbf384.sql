-- Add email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email TEXT;

-- Update the add_staff_to_company function to accept email
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