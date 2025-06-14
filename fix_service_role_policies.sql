-- Grant service role permissions to bypass RLS for all tables
-- This allows the service role to read/write data for API operations

-- Grant service role permission to bypass RLS
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create policies that allow service role to bypass RLS
-- Add service role bypass policies for each table

-- file_access_logs
CREATE POLICY "service_role_file_access_logs" ON public.file_access_logs
  FOR ALL USING (auth.role() = 'service_role');

-- file_share_permissions  
CREATE POLICY "service_role_file_share_permissions" ON public.file_share_permissions
  FOR ALL USING (auth.role() = 'service_role');

-- file_shares
CREATE POLICY "service_role_file_shares" ON public.file_shares
  FOR ALL USING (auth.role() = 'service_role');

-- messages
CREATE POLICY "service_role_messages" ON public.messages
  FOR ALL USING (auth.role() = 'service_role');

-- profile_views
CREATE POLICY "service_role_profile_views" ON public.profile_views
  FOR ALL USING (auth.role() = 'service_role');

-- room_participants
CREATE POLICY "service_role_room_participants" ON public.room_participants
  FOR ALL USING (auth.role() = 'service_role');

-- rooms
CREATE POLICY "service_role_rooms" ON public.rooms
  FOR ALL USING (auth.role() = 'service_role');

-- stripe_events
CREATE POLICY "service_role_stripe_events" ON public.stripe_events
  FOR ALL USING (auth.role() = 'service_role');

-- subscription_history
CREATE POLICY "service_role_subscription_history" ON public.subscription_history
  FOR ALL USING (auth.role() = 'service_role');

-- subscription_plans
CREATE POLICY "service_role_subscription_plans" ON public.subscription_plans
  FOR ALL USING (auth.role() = 'service_role');

-- user_profiles
CREATE POLICY "service_role_user_profiles" ON public.user_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- user_subscriptions
CREATE POLICY "service_role_user_subscriptions" ON public.user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');