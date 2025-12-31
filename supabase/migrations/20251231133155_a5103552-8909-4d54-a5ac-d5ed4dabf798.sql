-- First, ensure the manager has a user_roles entry
-- The sync_user_role trigger should handle this, but let's make sure it exists

-- Add user_roles entries for any existing profiles that don't have them
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role FROM public.profiles
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = profiles.user_id
)
ON CONFLICT DO NOTHING;