-- Cleanup broad RLS policies that allow all operations for authenticated users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inspections' AND polname = 'Allow all operations for authenticated users'
  ) THEN
    EXECUTE 'DROP POLICY "Allow all operations for authenticated users" ON public.inspections';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inspection_reports' AND polname = 'Allow all operations for authenticated users'
  ) THEN
    EXECUTE 'DROP POLICY "Allow all operations for authenticated users" ON public.inspection_reports';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roofs' AND polname = 'Allow all operations for authenticated users'
  ) THEN
    EXECUTE 'DROP POLICY "Allow all operations for authenticated users" ON public.roofs';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'work_orders' AND polname = 'Allow all operations for authenticated users'
  ) THEN
    EXECUTE 'DROP POLICY "Allow all operations for authenticated users" ON public.work_orders';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND polname = 'Allow all operations for authenticated users'
  ) THEN
    EXECUTE 'DROP POLICY "Allow all operations for authenticated users" ON public.users';
  END IF;
END $$; 