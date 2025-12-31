-- Update the handle_new_user function to use full_name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    'driver'::app_role,
    true
  );
  
  -- Also insert into user_roles for RLS checks
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'driver'::app_role);
  
  RETURN NEW;
END;
$$;