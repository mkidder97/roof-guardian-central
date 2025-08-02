-- Phase 1: Normalize inspection_sessions.session_data into proper relational tables
-- This migration creates the foundational tables for structured inspection data

-- =====================================================
-- 1. INSPECTION DEFICIENCIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inspection_deficiencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_session_id UUID NOT NULL REFERENCES public.inspection_sessions(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'Membrane Failures', 'Perimeter Flashing', 'Curb Flashing', 'Penetration',
    'Roof Top Equipment', 'Gutters/Downspouts', 'Roofing Drains', 'Scuppers',
    'Debris', 'General Wear', 'Structural Issues', 'Other'
  )),
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  location_description TEXT,
  estimated_cost NUMERIC(10,2),
  priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
  recommended_action TEXT,
  status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'in_progress', 'resolved', 'deferred')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. INSPECTION PHOTOS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inspection_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_session_id UUID NOT NULL REFERENCES public.inspection_sessions(id) ON DELETE CASCADE,
  deficiency_id UUID REFERENCES public.inspection_deficiencies(id) ON DELETE SET NULL,
  photo_type TEXT NOT NULL DEFAULT 'general' CHECK (photo_type IN (
    'general', 'deficiency', 'overview', 'before', 'after', 'detail', 'aerial'
  )),
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  metadata JSONB DEFAULT '{}', -- Technical metadata only (EXIF, dimensions, etc.)
  file_size_bytes INTEGER,
  mime_type TEXT,
  taken_at TIMESTAMP WITH TIME ZONE,
  gps_coordinates POINT, -- For aerial photos or location tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. INSPECTION NOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inspection_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_session_id UUID NOT NULL REFERENCES public.inspection_sessions(id) ON DELETE CASCADE,
  deficiency_id UUID REFERENCES public.inspection_deficiencies(id) ON DELETE SET NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN (
    'general', 'voice', 'text', 'observation', 'safety', 'recommendation'
  )),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  inspector_id UUID REFERENCES auth.users(id),
  is_private BOOLEAN DEFAULT false, -- For internal inspector notes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. INSPECTION CAPITAL EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inspection_capital_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_session_id UUID NOT NULL REFERENCES public.inspection_sessions(id) ON DELETE CASCADE,
  deficiency_id UUID REFERENCES public.inspection_deficiencies(id) ON DELETE SET NULL,
  expense_category TEXT NOT NULL CHECK (expense_category IN (
    'Roof Replacement', 'Membrane Repair', 'Flashing Repair', 'Drainage Improvement',
    'Structural Repair', 'Equipment Replacement', 'Emergency Repair', 'Preventive Maintenance'
  )),
  description TEXT NOT NULL,
  estimated_cost NUMERIC(10,2) NOT NULL,
  actual_cost NUMERIC(10,2),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  recommended_timeline TEXT CHECK (recommended_timeline IN (
    'Immediate', '0-3 months', '3-6 months', '6-12 months', '1-2 years', '2+ years'
  )),
  vendor_recommendations TEXT,
  status TEXT DEFAULT 'estimated' CHECK (status IN (
    'estimated', 'approved', 'in_progress', 'completed', 'cancelled'
  )),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

-- Deficiencies indexes
CREATE INDEX IF NOT EXISTS idx_inspection_deficiencies_session_id 
  ON public.inspection_deficiencies(inspection_session_id);
CREATE INDEX IF NOT EXISTS idx_inspection_deficiencies_category 
  ON public.inspection_deficiencies(category);
CREATE INDEX IF NOT EXISTS idx_inspection_deficiencies_severity 
  ON public.inspection_deficiencies(severity);
CREATE INDEX IF NOT EXISTS idx_inspection_deficiencies_status 
  ON public.inspection_deficiencies(status);

-- Photos indexes
CREATE INDEX IF NOT EXISTS idx_inspection_photos_session_id 
  ON public.inspection_photos(inspection_session_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_deficiency_id 
  ON public.inspection_photos(deficiency_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_type 
  ON public.inspection_photos(photo_type);

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_inspection_notes_session_id 
  ON public.inspection_notes(inspection_session_id);
CREATE INDEX IF NOT EXISTS idx_inspection_notes_deficiency_id 
  ON public.inspection_notes(deficiency_id);
CREATE INDEX IF NOT EXISTS idx_inspection_notes_type 
  ON public.inspection_notes(note_type);

-- Capital expenses indexes
CREATE INDEX IF NOT EXISTS idx_inspection_capital_expenses_session_id 
  ON public.inspection_capital_expenses(inspection_session_id);
CREATE INDEX IF NOT EXISTS idx_inspection_capital_expenses_deficiency_id 
  ON public.inspection_capital_expenses(deficiency_id);
CREATE INDEX IF NOT EXISTS idx_inspection_capital_expenses_category 
  ON public.inspection_capital_expenses(expense_category);
CREATE INDEX IF NOT EXISTS idx_inspection_capital_expenses_priority 
  ON public.inspection_capital_expenses(priority);

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.inspection_deficiencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_capital_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspection_deficiencies
CREATE POLICY "Users can view deficiencies for their assigned inspections"
  ON public.inspection_deficiencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_sessions s
      WHERE s.id = inspection_session_id
      AND s.inspector_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert deficiencies for their assigned inspections"
  ON public.inspection_deficiencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_sessions s
      WHERE s.id = inspection_session_id
      AND s.inspector_id = auth.uid()
    )
  );

CREATE POLICY "Users can update deficiencies for their assigned inspections"
  ON public.inspection_deficiencies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_sessions s
      WHERE s.id = inspection_session_id
      AND s.inspector_id = auth.uid()
    )
  );

-- RLS Policies for inspection_photos
CREATE POLICY "Users can view photos for their assigned inspections"
  ON public.inspection_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_sessions s
      WHERE s.id = inspection_session_id
      AND s.inspector_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert photos for their assigned inspections"
  ON public.inspection_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_sessions s
      WHERE s.id = inspection_session_id
      AND s.inspector_id = auth.uid()
    )
  );

-- RLS Policies for inspection_notes
CREATE POLICY "Users can view notes for their assigned inspections"
  ON public.inspection_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_sessions s
      WHERE s.id = inspection_session_id
      AND s.inspector_id = auth.uid()
    )
    OR (is_private = false) -- Public notes can be viewed by all
  );

CREATE POLICY "Users can insert notes for their assigned inspections"
  ON public.inspection_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_sessions s
      WHERE s.id = inspection_session_id
      AND s.inspector_id = auth.uid()
    )
  );

-- RLS Policies for inspection_capital_expenses
CREATE POLICY "Users can view capital expenses for their assigned inspections"
  ON public.inspection_capital_expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_sessions s
      WHERE s.id = inspection_session_id
      AND s.inspector_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert capital expenses for their assigned inspections"
  ON public.inspection_capital_expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_sessions s
      WHERE s.id = inspection_session_id
      AND s.inspector_id = auth.uid()
    )
  );

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_inspection_deficiencies_updated_at
  BEFORE UPDATE ON public.inspection_deficiencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspection_capital_expenses_updated_at
  BEFORE UPDATE ON public.inspection_capital_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 8. HELPFUL VIEWS
-- =====================================================

-- View for inspection summary with aggregated data
CREATE OR REPLACE VIEW public.inspection_summary AS
SELECT 
  s.id as session_id,
  s.property_id,
  s.inspector_id,
  s.status as session_status,
  COUNT(d.id) as total_deficiencies,
  COUNT(CASE WHEN d.severity = 'critical' THEN 1 END) as critical_deficiencies,
  COUNT(CASE WHEN d.severity = 'high' THEN 1 END) as high_deficiencies,
  COUNT(p.id) as total_photos,
  COUNT(n.id) as total_notes,
  COALESCE(SUM(ce.estimated_cost), 0) as total_estimated_cost,
  s.created_at,
  s.last_updated
FROM public.inspection_sessions s
LEFT JOIN public.inspection_deficiencies d ON s.id = d.inspection_session_id
LEFT JOIN public.inspection_photos p ON s.id = p.inspection_session_id
LEFT JOIN public.inspection_notes n ON s.id = n.inspection_session_id
LEFT JOIN public.inspection_capital_expenses ce ON s.id = ce.inspection_session_id
GROUP BY s.id, s.property_id, s.inspector_id, s.status, s.created_at, s.last_updated;

-- Grant permissions on the view
GRANT SELECT ON public.inspection_summary TO authenticated;

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.inspection_deficiencies IS 'Structured storage for inspection deficiencies, replacing JSON blob in session_data';
COMMENT ON TABLE public.inspection_photos IS 'Structured storage for inspection photos with proper categorization and metadata';
COMMENT ON TABLE public.inspection_notes IS 'Structured storage for inspection notes, including voice-to-text and observations';
COMMENT ON TABLE public.inspection_capital_expenses IS 'Structured storage for capital expense recommendations from inspections';

COMMENT ON COLUMN public.inspection_deficiencies.category IS 'Standardized deficiency categories for consistent reporting';
COMMENT ON COLUMN public.inspection_deficiencies.severity IS 'Severity level for prioritization and risk assessment';
COMMENT ON COLUMN public.inspection_photos.photo_type IS 'Photo categorization for better organization and workflow';
COMMENT ON COLUMN public.inspection_notes.note_type IS 'Note categorization including voice-to-text support';
COMMENT ON COLUMN public.inspection_capital_expenses.recommended_timeline IS 'Timeline recommendation for budgeting and planning';