-- Add shift_type column to run_allocations to separate AM/PM
ALTER TABLE public.run_allocations 
ADD COLUMN shift_type text NOT NULL DEFAULT 'am' CHECK (shift_type IN ('am', 'pm'));

-- Drop the existing unique constraint if it exists and create a new one including shift_type
ALTER TABLE public.run_allocations 
ADD CONSTRAINT run_allocations_unique_shift UNIQUE (run_id, day_of_week, shift_type);

-- Add estimated duration in minutes to school_runs for hours calculation
ALTER TABLE public.school_runs 
ADD COLUMN duration_minutes integer DEFAULT 60;