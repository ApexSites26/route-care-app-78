-- 1. Add fuel_card_pin column to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN fuel_card_pin TEXT;

-- 2. Create company_documents table for document uploads
CREATE TABLE public.company_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on company_documents
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- Managers can insert documents
CREATE POLICY "Managers can insert company documents"
ON public.company_documents
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- Managers can update documents
CREATE POLICY "Managers can update company documents"
ON public.company_documents
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- Managers can delete documents
CREATE POLICY "Managers can delete company documents"
ON public.company_documents
FOR DELETE
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- All company users can view documents
CREATE POLICY "Users can view company documents"
ON public.company_documents
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- 3. Create storage bucket for company documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-documents', 'company-documents', true);

-- Storage policies for company-documents bucket
CREATE POLICY "Managers can upload company documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-documents' 
  AND has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Anyone authenticated can view company documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-documents');

CREATE POLICY "Managers can delete company documents from storage"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-documents' 
  AND has_role(auth.uid(), 'manager'::app_role)
);