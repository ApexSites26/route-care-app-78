-- Drop the old constraint that doesn't include shift_type
ALTER TABLE public.run_allocations DROP CONSTRAINT IF EXISTS run_allocations_run_id_day_of_week_key;