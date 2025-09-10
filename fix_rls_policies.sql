-- =====================================================
-- FIX RLS POLICIES FOR MULTITENANCY TABLES
-- =====================================================
-- This script updates the RLS policies to work with your existing
-- database structure and is_admin_user function
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
-- COUNTRIES POLICIES
-- =====================================================

-- Countries are viewable by everyone
CREATE POLICY "Countries are viewable by everyone" ON countries 
FOR SELECT USING (true);

-- Only admins can insert countries
CREATE POLICY "Only admins can insert countries" ON countries 
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

-- Only admins can update countries
CREATE POLICY "Only admins can update countries" ON countries 
FOR UPDATE USING (is_admin_user(auth.uid()));

-- Only admins can delete countries
CREATE POLICY "Only admins can delete countries" ON countries 
FOR DELETE USING (is_admin_user(auth.uid()));

-- =====================================================
-- REGIONS POLICIES
-- =====================================================

-- Regions are viewable by everyone
CREATE POLICY "Regions are viewable by everyone" ON regions 
FOR SELECT USING (true);

-- Only admins can insert regions
CREATE POLICY "Only admins can insert regions" ON regions 
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

-- Only admins can update regions
CREATE POLICY "Only admins can update regions" ON regions 
FOR UPDATE USING (is_admin_user(auth.uid()));

-- Only admins can delete regions
CREATE POLICY "Only admins can delete regions" ON regions 
FOR DELETE USING (is_admin_user(auth.uid()));

-- =====================================================
-- CITIES POLICIES
-- =====================================================

-- Cities are viewable by everyone
CREATE POLICY "Cities are viewable by everyone" ON cities 
FOR SELECT USING (true);

-- Only admins can insert cities
CREATE POLICY "Only admins can insert cities" ON cities 
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

-- Only admins can update cities
CREATE POLICY "Only admins can update cities" ON cities 
FOR UPDATE USING (is_admin_user(auth.uid()));

-- Only admins can delete cities
CREATE POLICY "Only admins can delete cities" ON cities 
FOR DELETE USING (is_admin_user(auth.uid()));

-- =====================================================
-- PROJECTS POLICIES
-- =====================================================

-- Projects are viewable by everyone
CREATE POLICY "Projects are viewable by everyone" ON projects 
FOR SELECT USING (true);

-- Only admins can insert projects
CREATE POLICY "Only admins can insert projects" ON projects 
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

-- Only admins can update projects
CREATE POLICY "Only admins can update projects" ON projects 
FOR UPDATE USING (is_admin_user(auth.uid()));

-- Only admins can delete projects
CREATE POLICY "Only admins can delete projects" ON projects 
FOR DELETE USING (is_admin_user(auth.uid()));

-- =====================================================
-- BOARDS POLICIES
-- =====================================================

-- Boards are viewable by everyone
CREATE POLICY "Boards are viewable by everyone" ON boards 
FOR SELECT USING (true);

-- Only admins can insert boards
CREATE POLICY "Only admins can insert boards" ON boards 
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

-- Only admins can update boards
CREATE POLICY "Only admins can update boards" ON boards 
FOR UPDATE USING (is_admin_user(auth.uid()));

-- Only admins can delete boards
CREATE POLICY "Only admins can delete boards" ON boards 
FOR DELETE USING (is_admin_user(auth.uid()));

-- =====================================================
-- SCHOOLS POLICIES
-- =====================================================

-- Schools are viewable by everyone
CREATE POLICY "Schools are viewable by everyone" ON schools 
FOR SELECT USING (true);

-- Only admins can insert schools
CREATE POLICY "Only admins can insert schools" ON schools 
FOR INSERT WITH CHECK (is_admin_user(auth.uid()));

-- Only admins can update schools
CREATE POLICY "Only admins can update schools" ON schools 
FOR UPDATE USING (is_admin_user(auth.uid()));

-- Only admins can delete schools
CREATE POLICY "Only admins can delete schools" ON schools 
FOR DELETE USING (is_admin_user(auth.uid()));

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
-- TEST ADMIN FUNCTION
-- =====================================================

-- Test if the is_admin_user function works correctly
-- Replace 'your-user-id' with your actual user ID
-- SELECT is_admin_user('your-user-id');

-- =====================================================
-- END OF SCRIPT
-- =====================================================
