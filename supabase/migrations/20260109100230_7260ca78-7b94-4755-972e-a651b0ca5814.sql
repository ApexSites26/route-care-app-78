-- Add contracted_hours column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN contracted_hours numeric DEFAULT 40;