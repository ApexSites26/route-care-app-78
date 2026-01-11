-- Create a function to add staff to a company (bypasses RLS)
CREATE OR REPLACE FUNCTION public.add_staff_to_company(
  _user_id uuid,
  _company_id uuid,
  _full_name text,
  _role app_role,
  _contracted_hours numeric DEFAULT 40
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update the profile with company details
  UPDATE public.profiles
  SET 
    company_id = _company_id,
    full_name = _full_name,
    role = _role,
    contracted_hours = _contracted_hours
  WHERE user_id = _user_id;
  
  -- Update user_roles to match new role
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.add_staff_to_company TO authenticated;