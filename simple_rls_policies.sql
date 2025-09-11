-- =====================================================
-- SIMPLE RLS POLICIES FOR TESTING
-- =====================================================
-- This script creates simple RLS policies that allow all
-- authenticated users to perform CRUD operations
-- =====================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Countries are viewable by everyone" ON countries;
DROP POLICY IF EXISTS "Only admins can insert countries" ON countries;
DROP POLICY IF EXISTS "Only admins can update countries" ON countries;
DROP POLICY IF EXISTS "Only admins can delete countries" ON countries;

DROP POLICY IF EXISTS "Regions are viewable by everyone" ON regions;
DROP POLICY IF EXISTS "Only admins can insert regions" ON regions;
DROP POLICY IF EXISTS "Only admins can update regions" ON regions;
DROP POLICY IF EXISTS "Only admins can delete regions" ON regions;

DROP POLICY IF EXISTS "Cities are viewable by everyone" ON cities;
DROP POLICY IF EXISTS "Only admins can insert cities" ON cities;
DROP POLICY IF EXISTS "Only admins can update cities" ON cities;
DROP POLICY IF EXISTS "Only admins can delete cities" ON cities;

DROP POLICY IF EXISTS "Projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Only admins can insert projects" ON projects;
DROP POLICY IF EXISTS "Only admins can update projects" ON projects;
DROP POLICY IF EXISTS "Only admins can delete projects" ON projects;

DROP POLICY IF EXISTS "Boards are viewable by everyone" ON boards;
DROP POLICY IF EXISTS "Only admins can insert boards" ON boards;
DROP POLICY IF EXISTS "Only admins can update boards" ON boards;
DROP POLICY IF EXISTS "Only admins can delete boards" ON boards;

DROP POLICY IF EXISTS "Schools are viewable by everyone" ON schools;
DROP POLICY IF EXISTS "Only admins can insert schools" ON schools;
DROP POLICY IF EXISTS "Only admins can update schools" ON schools;
DROP POLICY IF EXISTS "Only admins can delete schools" ON schools;

-- =====================================================
-- COUNTRIES POLICIES - ALLOW ALL AUTHENTICATED USERS
-- =====================================================

-- Countries are viewable by everyone
CREATE POLICY "Countries are viewable by everyone" ON countries 
FOR SELECT USING (true);

-- All authenticated users can insert countries
CREATE POLICY "Authenticated users can insert countries" ON countries 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated users can update countries
CREATE POLICY "Authenticated users can update countries" ON countries 
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- All authenticated users can delete countries
CREATE POLICY "Authenticated users can delete countries" ON countries 
FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- REGIONS POLICIES - ALLOW ALL AUTHENTICATED USERS
-- =====================================================

-- Regions are viewable by everyone
CREATE POLICY "Regions are viewable by everyone" ON regions 
FOR SELECT USING (true);

-- All authenticated users can insert regions
CREATE POLICY "Authenticated users can insert regions" ON regions 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated users can update regions
CREATE POLICY "Authenticated users can update regions" ON regions 
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- All authenticated users can delete regions
CREATE POLICY "Authenticated users can delete regions" ON regions 
FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- CITIES POLICIES - ALLOW ALL AUTHENTICATED USERS
-- =====================================================

-- Cities are viewable by everyone
CREATE POLICY "Cities are viewable by everyone" ON cities 
FOR SELECT USING (true);

-- All authenticated users can insert cities
CREATE POLICY "Authenticated users can insert cities" ON cities 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated users can update cities
CREATE POLICY "Authenticated users can update cities" ON cities 
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- All authenticated users can delete cities
CREATE POLICY "Authenticated users can delete cities" ON cities 
FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- PROJECTS POLICIES - ALLOW ALL AUTHENTICATED USERS
-- =====================================================

-- Projects are viewable by everyone
CREATE POLICY "Projects are viewable by everyone" ON projects 
FOR SELECT USING (true);

-- All authenticated users can insert projects
CREATE POLICY "Authenticated users can insert projects" ON projects 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated users can update projects
CREATE POLICY "Authenticated users can update projects" ON projects 
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- All authenticated users can delete projects
CREATE POLICY "Authenticated users can delete projects" ON projects 
FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- BOARDS POLICIES - ALLOW ALL AUTHENTICATED USERS
-- =====================================================

-- Boards are viewable by everyone
CREATE POLICY "Boards are viewable by everyone" ON boards 
FOR SELECT USING (true);

-- All authenticated users can insert boards
CREATE POLICY "Authenticated users can insert boards" ON boards 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated users can update boards
CREATE POLICY "Authenticated users can update boards" ON boards 
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- All authenticated users can delete boards
CREATE POLICY "Authenticated users can delete boards" ON boards 
FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- SCHOOLS POLICIES - ALLOW ALL AUTHENTICATED USERS
-- =====================================================

-- Schools are viewable by everyone
CREATE POLICY "Schools are viewable by everyone" ON schools 
FOR SELECT USING (true);

-- All authenticated users can insert schools
CREATE POLICY "Authenticated users can insert schools" ON schools 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated users can update schools
CREATE POLICY "Authenticated users can update schools" ON schools 
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- All authenticated users can delete schools
CREATE POLICY "Authenticated users can delete schools" ON schools 
FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- VERIFY POLICIES
-- =====================================================

-- Check if policies are created correctly
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('countries', 'regions', 'cities', 'projects', 'boards', 'schools')
ORDER BY tablename, policyname;

-- =====================================================
-- END OF SCRIPT
-- =====================================================
