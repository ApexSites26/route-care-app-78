-- Make company-documents bucket private for better security
UPDATE storage.buckets SET public = false WHERE id = 'company-documents';

-- Drop the overly permissive view policy for company documents
DROP POLICY IF EXISTS "Anyone authenticated can view company documents" ON storage.objects;

-- Create a more restrictive policy - only users from the same company can view documents
CREATE POLICY "Users can view their company documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'company-documents'
  AND auth.uid() IN (
    SELECT p.user_id FROM public.profiles p
    WHERE p.company_id = (
      SELECT p2.company_id FROM public.profiles p2 WHERE p2.user_id = auth.uid()
    )
  )
);