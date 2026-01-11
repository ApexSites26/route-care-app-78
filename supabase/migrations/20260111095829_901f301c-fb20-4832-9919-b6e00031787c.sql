-- Fix the handle_new_user trigger to avoid duplicate key errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    'driver'::app_role,
    true
  );
  
  -- Insert into user_roles for RLS checks - use ON CONFLICT to avoid duplicates
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'driver'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;