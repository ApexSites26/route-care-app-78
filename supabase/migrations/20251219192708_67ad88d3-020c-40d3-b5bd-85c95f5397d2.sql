
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('driver', 'escort', 'manager');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'driver',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration TEXT NOT NULL UNIQUE,
  make TEXT,
  model TEXT,
  assigned_driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver_entries table (daily timesheet + vehicle checklist)
CREATE TABLE public.driver_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  morning_start_time TIME,
  morning_finish_time TIME,
  afternoon_start_time TIME,
  afternoon_finish_time TIME,
  no_issues BOOLEAN NOT NULL DEFAULT true,
  issues_text TEXT,
  check_tyres BOOLEAN,
  check_lights BOOLEAN,
  check_oil BOOLEAN,
  check_fuel BOOLEAN,
  check_damage BOOLEAN,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- Create escort_entries table (daily timesheet only)
CREATE TABLE public.escort_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  morning_start_time TIME,
  morning_finish_time TIME,
  afternoon_start_time TIME,
  afternoon_finish_time TIME,
  no_issues BOOLEAN NOT NULL DEFAULT true,
  issues_text TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- Create user_roles table for secure role checking (following security best practices)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escort_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- Vehicles policies
CREATE POLICY "Drivers can view their assigned vehicle"
ON public.vehicles FOR SELECT
TO authenticated
USING (
  assigned_driver_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Managers can view all vehicles"
ON public.vehicles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can insert vehicles"
ON public.vehicles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update vehicles"
ON public.vehicles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete vehicles"
ON public.vehicles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- Driver entries policies
CREATE POLICY "Drivers can view their own entries"
ON public.driver_entries FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Drivers can insert their own entries"
ON public.driver_entries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.get_user_role(auth.uid()) = 'driver');

CREATE POLICY "Managers can view all driver entries"
ON public.driver_entries FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- Escort entries policies
CREATE POLICY "Escorts can view their own entries"
ON public.escort_entries FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Escorts can insert their own entries"
ON public.escort_entries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.get_user_role(auth.uid()) = 'escort');

CREATE POLICY "Managers can view all escort entries"
ON public.escort_entries FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- Trigger to sync user_roles when profile is created/updated
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing role
  DELETE FROM public.user_roles WHERE user_id = NEW.user_id;
  -- Insert new role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, NEW.role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_role_change
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Timestamp triggers
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
