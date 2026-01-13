-- Create notification settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_time TIME NOT NULL DEFAULT '14:00:00',
  manager_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Managers can view their company's notification settings
CREATE POLICY "Managers can view notification settings"
ON public.notification_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = notification_settings.company_id
    AND profiles.role = 'manager'
  )
);

-- Managers can insert notification settings for their company
CREATE POLICY "Managers can insert notification settings"
ON public.notification_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = notification_settings.company_id
    AND profiles.role = 'manager'
  )
);

-- Managers can update their company's notification settings
CREATE POLICY "Managers can update notification settings"
ON public.notification_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = notification_settings.company_id
    AND profiles.role = 'manager'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();