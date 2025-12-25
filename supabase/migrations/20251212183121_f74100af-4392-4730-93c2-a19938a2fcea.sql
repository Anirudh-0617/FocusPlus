-- Create storage bucket for notes with RLS policies
INSERT INTO storage.buckets (id, name, public) VALUES ('notes', 'notes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for notes bucket
CREATE POLICY "Users can upload own notes" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own notes" ON storage.objects FOR SELECT 
USING (bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own notes" ON storage.objects FOR DELETE 
USING (bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view notes files" ON storage.objects FOR SELECT 
USING (bucket_id = 'notes');