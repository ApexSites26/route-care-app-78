-- Ensure user_roles table has proper RLS policies
-- First, check if policies exist and create them if not

-- Enable RLS on user_roles if not already
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can view roles in their company" ON public.user_roles;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Managers can manage all roles for users in their company
CREATE POLICY "Managers can manage user roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles manager
    JOIN profiles target ON target.user_id = user_roles.user_id
    WHERE manager.user_id = auth.uid()
    AND manager.role = 'manager'
    AND manager.company_id = target.company_id
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Backfill user_roles from existing profiles (only if not already exists)
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.user_id = profiles.user_id AND user_roles.role = profiles.role
)
ON CONFLICT DO NOTHING;