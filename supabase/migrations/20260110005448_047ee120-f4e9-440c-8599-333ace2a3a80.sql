-- Create a function to register a new company and set up the manager
CREATE OR REPLACE FUNCTION public.register_company(
  company_name TEXT,
  user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.register_company TO authenticated;