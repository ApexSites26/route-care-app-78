-- Add contract_start_date column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN contract_start_date DATE DEFAULT CURRENT_DATE;