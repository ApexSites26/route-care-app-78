-- Create additional_runs table for extra runs beyond AM/PM
CREATE TABLE public.additional_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_type text NOT NULL CHECK (entry_type IN ('driver', 'escort')),
  user_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  run_name text NOT NULL,
  start_time time without time zone NOT NULL,
  finish_time time without time zone NOT NULL,
  notes text,
  company_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.additional_runs ENABLE ROW LEVEL SECURITY;

-- Drivers can manage their own additional runs
CREATE POLICY "Users can view their own additional runs"
ON public.additional_runs FOR SELECT
USING (
  auth.uid() = user_id 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Users can insert their own additional runs"
ON public.additional_runs FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Users can update their own additional runs"
ON public.additional_runs FOR UPDATE
USING (
  auth.uid() = user_id 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Users can delete their own additional runs"
ON public.additional_runs FOR DELETE
USING (
  auth.uid() = user_id 
  AND company_id = get_user_company_id(auth.uid())
);

-- Managers can view company additional runs
CREATE POLICY "Managers can view company additional runs"
ON public.additional_runs FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- Add index for efficient querying
CREATE INDEX idx_additional_runs_user_date ON public.additional_runs(user_id, entry_date);
CREATE INDEX idx_additional_runs_company_date ON public.additional_runs(company_id, entry_date);