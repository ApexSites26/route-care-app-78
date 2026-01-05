-- Allow drivers to update their own entries (for adding afternoon times)
CREATE POLICY "Drivers can update their own entries"
ON public.driver_entries
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow escorts to update their own entries (for adding afternoon times)
CREATE POLICY "Escorts can update their own entries"
ON public.escort_entries
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);