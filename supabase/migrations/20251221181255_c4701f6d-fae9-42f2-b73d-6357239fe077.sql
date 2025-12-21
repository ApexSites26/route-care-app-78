-- Insert manager profile (bypassing RLS for initial setup)
INSERT INTO public.profiles (user_id, full_name, role, is_active) 
VALUES ('151c07e9-2c8f-4221-8e0a-d17831567668', 'Manager', 'manager', true)
ON CONFLICT (user_id) DO UPDATE SET role = 'manager';

-- Ensure user_roles entry exists
INSERT INTO public.user_roles (user_id, role) 
VALUES ('151c07e9-2c8f-4221-8e0a-d17831567668', 'manager')
ON CONFLICT (user_id, role) DO NOTHING;