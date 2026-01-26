-- Migration: Add account_type and is_staff columns to profiles table
-- Run this in Supabase SQL Editor to fix the live database
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

-- ============================================================================
-- STEP 1: Add missing columns to profiles table
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'client';

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- STEP 2: Update the handle_new_user trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_is_staff BOOLEAN;
BEGIN
  -- Auto-detect staff from email domain
  user_is_staff := NEW.email LIKE '%@mirrorlabs3d.com';

  INSERT INTO public.profiles (id, email, name, initials, account_type, is_staff)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    generate_initials(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))),
    CASE WHEN user_is_staff THEN 'staff' ELSE 'client' END,
    user_is_staff
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Ensure trigger exists (recreate it)
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- STEP 4: Fix existing users without profiles (optional)
-- Run this if you have auth users whose profiles were not created
-- ============================================================================

-- First, check for auth users without profiles:
-- SELECT au.id, au.email
-- FROM auth.users au
-- LEFT JOIN profiles p ON au.id = p.id
-- WHERE p.id IS NULL;

-- Insert missing profiles for existing auth users:
INSERT INTO profiles (id, email, name, initials, account_type, is_staff)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  generate_initials(COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1))),
  CASE WHEN au.email LIKE '%@mirrorlabs3d.com' THEN 'staff' ELSE 'client' END,
  au.email LIKE '%@mirrorlabs3d.com'
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 5: Update existing profiles to set is_staff based on email domain
-- (for profiles that were created before this migration)
-- ============================================================================

UPDATE profiles
SET
  is_staff = (email LIKE '%@mirrorlabs3d.com'),
  account_type = CASE WHEN email LIKE '%@mirrorlabs3d.com' THEN 'staff' ELSE 'client' END
WHERE is_staff IS NULL OR account_type IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Run these queries to verify the migration worked:

-- Check profiles table structure:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Check all profiles with their staff status:
-- SELECT id, email, name, account_type, is_staff FROM profiles;

-- Check the trigger function exists:
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user';
