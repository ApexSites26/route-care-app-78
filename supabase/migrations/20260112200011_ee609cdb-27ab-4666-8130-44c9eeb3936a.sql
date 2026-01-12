-- Create a public access table for inspection links
CREATE TABLE public.vehicle_inspection_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.vehicle_inspection_links ENABLE ROW LEVEL SECURITY;

-- Managers can manage inspection links for their company
CREATE POLICY "Managers can manage inspection links"
ON public.vehicle_inspection_links
FOR ALL
USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'manager'));

-- Allow public read of vehicle_inspection_links by token (for inspection mode)
CREATE POLICY "Anyone can read inspection links by token"
ON public.vehicle_inspection_links
FOR SELECT
USING (true);

-- Create public read policies for inspection mode using the access token
-- These will be accessed via a security definer function

CREATE OR REPLACE FUNCTION public.get_vehicle_for_inspection(p_token TEXT)
RETURNS TABLE (
  vehicle_id UUID,
  registration TEXT,
  make TEXT,
  model TEXT,
  company_id UUID,
  company_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as vehicle_id,
    v.registration,
    v.make,
    v.model,
    v.company_id,
    c.name as company_name
  FROM vehicle_inspection_links vil
  JOIN vehicles v ON v.id = vil.vehicle_id
  JOIN companies c ON c.id = v.company_id
  WHERE vil.access_token = p_token
    AND vil.is_active = true
    AND (vil.expires_at IS NULL OR vil.expires_at > now());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_vehicle_diary_for_inspection(
  p_token TEXT,
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '12 months',
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_id UUID;
  result JSON;
BEGIN
  -- Validate token and get vehicle_id
  SELECT vil.vehicle_id INTO v_vehicle_id
  FROM vehicle_inspection_links vil
  WHERE vil.access_token = p_token
    AND vil.is_active = true
    AND (vil.expires_at IS NULL OR vil.expires_at > now());
  
  IF v_vehicle_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Build the complete diary
  SELECT json_build_object(
    'driver_history', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', vdh.id,
        'driver_name', p.full_name,
        'assigned_at', vdh.assigned_at,
        'unassigned_at', vdh.unassigned_at
      ) ORDER BY vdh.assigned_at DESC), '[]'::json)
      FROM vehicle_driver_history vdh
      LEFT JOIN profiles p ON p.id = vdh.driver_id
      WHERE vdh.vehicle_id = v_vehicle_id
        AND vdh.assigned_at >= p_date_from
        AND vdh.assigned_at <= p_date_to + INTERVAL '1 day'
    ),
    'garage_visits', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', gv.id,
        'visit_date', gv.visit_date,
        'reason_type', gv.reason_type,
        'notes', gv.notes,
        'mileage', gv.mileage,
        'driver_name', p.full_name,
        'created_at', gv.created_at
      ) ORDER BY gv.visit_date DESC), '[]'::json)
      FROM garage_visits gv
      LEFT JOIN profiles p ON p.id = gv.driver_id
      WHERE gv.vehicle_id = v_vehicle_id
        AND gv.visit_date >= p_date_from
        AND gv.visit_date <= p_date_to
    ),
    'workshop_records', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', wr.id,
        'date_left', wr.date_left,
        'date_returned', wr.date_returned,
        'garage_name', wr.garage_name,
        'work_carried_out', wr.work_carried_out,
        'created_at', wr.created_at
      ) ORDER BY wr.date_left DESC), '[]'::json)
      FROM workshop_records wr
      WHERE wr.vehicle_id = v_vehicle_id
        AND wr.date_left >= p_date_from
        AND wr.date_left <= p_date_to + INTERVAL '1 day'
    ),
    'defects', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', vd.id,
        'date_identified', vd.date_identified,
        'defect_description', vd.defect_description,
        'is_resolved', vd.is_resolved,
        'date_corrected', vd.date_corrected,
        'action_taken', vd.action_taken,
        'reporter_name', p.full_name,
        'created_at', vd.created_at
      ) ORDER BY vd.date_identified DESC), '[]'::json)
      FROM vehicle_defects vd
      LEFT JOIN profiles p ON p.id = vd.reported_by
      WHERE vd.vehicle_id = v_vehicle_id
        AND vd.date_identified >= p_date_from
        AND vd.date_identified <= p_date_to
    )
  ) INTO result;
  
  RETURN result;
END;
$$;