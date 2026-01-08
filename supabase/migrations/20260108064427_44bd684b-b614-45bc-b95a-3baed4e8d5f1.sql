-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Allow anyone to view logos (public bucket)
CREATE POLICY "Anyone can view logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'logos');

-- Only managers can upload logos
CREATE POLICY "Managers can upload logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'logos' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'manager'
  )
);

-- Managers can update logos
CREATE POLICY "Managers can update logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'logos' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'manager'
  )
);

-- Managers can delete logos
CREATE POLICY "Managers can delete logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'logos' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'manager'
  )
);