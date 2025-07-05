-- ============================================
-- Service Role RLS Policy Fixes for Kawazu Code Chat Platform
-- ============================================
-- This script fixes Row Level Security issues preventing service role access
-- Run this script to allow your API server to properly access the database

-- ============================================
-- 1. Add Service Role Bypass Policies
-- ============================================

-- Add service role bypass policies for rooms
CREATE POLICY "Service role can access all rooms" ON rooms
  FOR ALL USING (auth.role() = 'service_role');

-- Add service role bypass policies for messages  
CREATE POLICY "Service role can access all messages" ON messages
  FOR ALL USING (auth.role() = 'service_role');

-- Add service role bypass policies for room_participants
CREATE POLICY "Service role can access all room_participants" ON room_participants
  FOR ALL USING (auth.role() = 'service_role');

-- Add service role bypass policies for user_profiles
CREATE POLICY "Service role can access all user_profiles" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Add service role bypass policies for file_shares (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_shares') THEN
        EXECUTE 'CREATE POLICY "Service role can access all file_shares" ON file_shares
                 FOR ALL USING (auth.role() = ''service_role'')';
    END IF;
END $$;

-- Add service role bypass policies for subscription tables (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
        EXECUTE 'CREATE POLICY "Service role can access all user_subscriptions" ON user_subscriptions
                 FOR ALL USING (auth.role() = ''service_role'')';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_history') THEN
        EXECUTE 'CREATE POLICY "Service role can access all subscription_history" ON subscription_history
                 FOR ALL USING (auth.role() = ''service_role'')';
    END IF;
END $$;

-- ============================================
-- 2. Ensure RLS is enabled on all tables
-- ============================================

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on optional tables if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_shares') THEN
        EXECUTE 'ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
        EXECUTE 'ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_history') THEN
        EXECUTE 'ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- ============================================
-- 3. Add missing tables if they don't exist
-- ============================================

-- Create rooms table if it doesn't exist
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  is_private BOOLEAN DEFAULT false,
  password_hash VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url VARCHAR(500),
  website_url VARCHAR(500),
  twitter_handle VARCHAR(100),
  github_handle VARCHAR(100),
  skills TEXT[],
  location VARCHAR(100),
  timezone VARCHAR(50),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. Grant necessary permissions to authenticated role
-- ============================================

-- Grant usage on all sequences to authenticated users
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant select, insert, update, delete on all tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ============================================
-- 5. Create updated_at trigger function if it doesn't exist
-- ============================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers if they don't exist
DROP TRIGGER IF EXISTS set_timestamp_rooms ON rooms;
CREATE TRIGGER set_timestamp_rooms
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_user_profiles ON user_profiles;
CREATE TRIGGER set_timestamp_user_profiles
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================
-- 6. Verify script completion
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Service role RLS policies have been successfully applied!';
    RAISE NOTICE 'Your API server should now be able to access the database properly.';
END $$;

-- Service Role がサブスクリプション情報にアクセスできるようにRLSポリシーを修正

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can read their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can read their own subscription history" ON subscription_history;

-- 新しいポリシーを作成（Service Roleアクセスを許可）
-- ユーザーサブスクリプションは本人またはService Roleが読み取り可能
CREATE POLICY "Users and service role can read subscriptions" ON user_subscriptions
  FOR SELECT USING (
    auth.role() = 'service_role' OR 
    user_id = auth.uid()
  );

-- ユーザーサブスクリプションの挿入はService Roleのみ可能
CREATE POLICY "Service role can insert subscriptions" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ユーザーサブスクリプションの更新はService Roleまたは本人が可能
CREATE POLICY "Users and service role can update subscriptions" ON user_subscriptions
  FOR UPDATE USING (
    auth.role() = 'service_role' OR 
    user_id = auth.uid()
  );

-- ユーザーサブスクリプションの削除はService Roleのみ可能
CREATE POLICY "Service role can delete subscriptions" ON user_subscriptions
  FOR DELETE USING (auth.role() = 'service_role');

-- サブスクリプション履歴は本人またはService Roleが読み取り可能
CREATE POLICY "Users and service role can read subscription history" ON subscription_history
  FOR SELECT USING (
    auth.role() = 'service_role' OR 
    user_id = auth.uid()
  );

-- サブスクリプション履歴の挿入はService Roleのみ可能
CREATE POLICY "Service role can insert subscription history" ON subscription_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ルーム作成制限チェック用に、Service Roleがrooms テーブルに完全アクセスできるようにする
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON rooms;

-- 新しいルーム作成ポリシー
CREATE POLICY "Authenticated users and service role can create rooms" ON rooms
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR 
    auth.role() = 'authenticated'
  );

-- Service Role がrooms テーブルを完全に読み取れるようにする
CREATE POLICY "Service role can read all rooms" ON rooms
  FOR SELECT USING (auth.role() = 'service_role');

-- Service Role がrooms テーブルを更新・削除できるようにする
CREATE POLICY "Service role can update rooms" ON rooms
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete rooms" ON rooms
  FOR DELETE USING (auth.role() = 'service_role');

-- Service Role がroom_participants テーブルに完全アクセスできるようにする
CREATE POLICY "Service role can manage all room participants" ON room_participants
  FOR ALL USING (auth.role() = 'service_role');

-- Service Role がmessages テーブルに完全アクセスできるようにする  
CREATE POLICY "Service role can manage all messages" ON messages
  FOR ALL USING (auth.role() = 'service_role');

-- Service Role がuser_profiles テーブルに完全アクセスできるようにする
CREATE POLICY "Service role can manage all user profiles" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Service Role がprofile_views テーブルに完全アクセスできるようにする
CREATE POLICY "Service role can manage all profile views" ON profile_views
  FOR ALL USING (auth.role() = 'service_role');

-- Service Role がfile_shares テーブルに完全アクセスできるようにする
CREATE POLICY "Service role can manage all file shares" ON file_shares
  FOR ALL USING (auth.role() = 'service_role');

-- Service Role がfile_share_permissions テーブルに完全アクセスできるようにする
CREATE POLICY "Service role can manage all file share permissions" ON file_share_permissions
  FOR ALL USING (auth.role() = 'service_role');

-- Service Role がfile_access_logs テーブルに完全アクセスできるようにする
CREATE POLICY "Service role can manage all file access logs" ON file_access_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Service Role がsubscription_plans テーブルに完全アクセスできるようにする
CREATE POLICY "Service role can manage all subscription plans" ON subscription_plans
  FOR ALL USING (auth.role() = 'service_role');