-- RLS Policies for inspection validation fields
-- Ensures proper access control for the validation workflow

-- Drop existing overly permissive policies for inspections
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.inspections;

-- Create more granular policies for inspections

-- Allow inspectors to read all inspections (for dashboard viewing)
CREATE POLICY "inspectors_can_read_inspections" ON public.inspections
    FOR SELECT TO authenticated
    USING (true);

-- Allow inspectors to update their own inspections (but not validation fields)
CREATE POLICY "inspectors_can_update_own_inspections" ON public.inspections
    FOR UPDATE TO authenticated
    USING (inspector_id = auth.uid())
    WITH CHECK (
        inspector_id = auth.uid() AND 
        -- Inspectors cannot directly modify validation fields
        ready_to_send = OLD.ready_to_send AND
        (proof_check_notes IS NULL OR proof_check_notes = OLD.proof_check_notes)
    );

-- Allow inspectors to insert new inspections
CREATE POLICY "inspectors_can_insert_inspections" ON public.inspections
    FOR INSERT TO authenticated
    WITH CHECK (
        inspector_id = auth.uid() AND
        -- New inspections start with validation fields in default state
        ready_to_send = false AND
        proof_check_notes IS NULL
    );

-- Allow admins/super_admins to perform all operations
CREATE POLICY "admins_can_manage_inspections" ON public.inspections
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Special policy for service role (edge functions) to update validation fields
-- This will allow the validation edge function to update ready_to_send and proof_check_notes
CREATE POLICY "service_role_can_update_validation_fields" ON public.inspections
    FOR UPDATE TO service_role
    USING (true)
    WITH CHECK (true);

-- Create a function to check if user can update validation fields (for edge functions)
CREATE OR REPLACE FUNCTION public.can_update_inspection_validation(inspection_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- This function will be called by edge functions using service role
    -- It provides an additional layer of validation if needed
    RETURN true;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.can_update_inspection_validation(UUID) TO service_role;