-- Fix user_roles RLS policies to prevent cross-company access
-- Drop existing policies that don't filter by company
DROP POLICY IF EXISTS "Managers can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Managers can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Managers can update roles" ON user_roles;
DROP POLICY IF EXISTS "Managers can delete roles" ON user_roles;

-- Create new policies that filter by company via profiles table join
CREATE POLICY "Managers can view company roles"
ON user_roles FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND user_id IN (
    SELECT p.user_id FROM profiles p
    WHERE p.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Managers can insert company roles"
ON user_roles FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
  AND user_id IN (
    SELECT p.user_id FROM profiles p
    WHERE p.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Managers can update company roles"
ON user_roles FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND user_id IN (
    SELECT p.user_id FROM profiles p
    WHERE p.company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Managers can delete company roles"
ON user_roles FOR DELETE
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND user_id IN (
    SELECT p.user_id FROM profiles p
    WHERE p.company_id = get_user_company_id(auth.uid())
  )
);