-- Create run_exceptions table for date-specific time overrides
CREATE TABLE public.run_exceptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.school_runs(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  affected_leg text NOT NULL CHECK (affected_leg IN ('home_to_school', 'school_to_home')),
  override_pickup_time time without time zone NOT NULL,
  note text,
  company_id uuid REFERENCES public.companies(id),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(run_id, exception_date, affected_leg)
);

-- Enable RLS
ALTER TABLE public.run_exceptions ENABLE ROW LEVEL SECURITY;

-- Managers can do everything for their company
CREATE POLICY "Managers can manage run exceptions"
ON public.run_exceptions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = run_exceptions.company_id
    AND profiles.role = 'manager'
  )
);

-- Drivers and escorts can read exceptions for their company
CREATE POLICY "Staff can view run exceptions"
ON public.run_exceptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = run_exceptions.company_id
  )
);

-- Create index for common queries
CREATE INDEX idx_run_exceptions_run_date ON public.run_exceptions(run_id, exception_date);
CREATE INDEX idx_run_exceptions_date ON public.run_exceptions(exception_date);
CREATE INDEX idx_run_exceptions_company ON public.run_exceptions(company_id);

-- Add trigger for updated_at
CREATE TRIGGER update_run_exceptions_updated_at
BEFORE UPDATE ON public.run_exceptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();