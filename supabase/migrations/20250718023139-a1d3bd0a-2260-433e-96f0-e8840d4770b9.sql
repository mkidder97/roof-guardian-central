-- Create roof_files table
CREATE TABLE IF NOT EXISTS roof_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roof_id UUID REFERENCES roofs(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  file_url TEXT,
  storage_path TEXT,
  mime_type VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file categories lookup
CREATE TABLE IF NOT EXISTS file_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default file categories
INSERT INTO file_categories (name, description, icon, color) VALUES
('Inspection Report', 'Annual and routine inspection reports', 'file-text', 'blue'),
('Roof Plan', 'CAD drawings and roof plans', 'file-image', 'green'),
('Warranty', 'Warranty documents and certificates', 'shield', 'orange'),
('Photo', 'Property and roof photographs', 'camera', 'purple'),
('Other', 'Miscellaneous documents', 'file', 'gray')
ON CONFLICT DO NOTHING;

-- Create storage bucket for roof files
INSERT INTO storage.buckets (id, name, public) VALUES ('roof-files', 'roof-files', true) ON CONFLICT DO NOTHING;

-- Add RLS policies for roof_files
ALTER TABLE roof_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access roof files" ON roof_files FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add RLS policies for file_categories
ALTER TABLE file_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read file categories" ON file_categories FOR SELECT TO authenticated USING (true);

-- Storage policies for roof files
CREATE POLICY "Authenticated users can view roof files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'roof-files');
CREATE POLICY "Authenticated users can upload roof files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'roof-files');
CREATE POLICY "Authenticated users can update roof files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'roof-files');
CREATE POLICY "Authenticated users can delete roof files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'roof-files');

-- Add indexes
CREATE INDEX idx_roof_files_roof_id ON roof_files(roof_id);
CREATE INDEX idx_roof_files_file_type ON roof_files(file_type);
CREATE INDEX idx_roof_files_created_at ON roof_files(created_at);

-- Add triggers for updated_at
CREATE TRIGGER update_roof_files_updated_at
  BEFORE UPDATE ON roof_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();