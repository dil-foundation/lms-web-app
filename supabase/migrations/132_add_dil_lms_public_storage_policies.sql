-- Migration: Add storage policies for dil-lms-public bucket
-- Description: Allows authenticated users to upload, read, update, and delete files in the dil-lms-public bucket
-- 
-- NOTE: This migration should be applied through the Supabase Dashboard Storage Policies section
-- due to permission restrictions on the storage.objects table.
--
-- Manual steps required:
-- 1. Go to Supabase Dashboard → Storage → Policies
-- 2. Select the 'dil-lms-public' bucket
-- 3. Add the following policies:

/*
Policy 1: Public Read Access
- Name: "Public read access for dil-lms-public"
- Operation: SELECT
- Target roles: public
- Using expression: bucket_id = 'dil-lms-public'

Policy 2: Authenticated Upload
- Name: "Authenticated users can upload to dil-lms-public"
- Operation: INSERT
- Target roles: authenticated
- Using expression: bucket_id = 'dil-lms-public'

Policy 3: User Update
- Name: "Users can update their own files in dil-lms-public"
- Operation: UPDATE
- Target roles: authenticated
- Using expression: 
  bucket_id = 'dil-lms-public' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text

Policy 4: User Delete
- Name: "Users can delete their own files in dil-lms-public"
- Operation: DELETE
- Target roles: authenticated
- Using expression: 
  bucket_id = 'dil-lms-public' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
*/

-- This migration is documented for reference but should be applied manually
-- through the Supabase Dashboard Storage Policies interface.
