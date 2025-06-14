-- Enable RLS on all tables
ALTER TABLE public.file_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_share_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_access_logs
CREATE POLICY "file_access_logs_select" ON public.file_access_logs
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.file_shares fs 
      WHERE fs.id = file_access_logs.share_id 
      AND fs.owner_username = (
        SELECT username FROM public.user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "file_access_logs_insert" ON public.file_access_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for file_share_permissions
CREATE POLICY "file_share_permissions_select" ON public.file_share_permissions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      username = (
        SELECT username FROM public.user_profiles 
        WHERE id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.file_shares fs 
        WHERE fs.id = file_share_permissions.share_id 
        AND fs.owner_username = (
          SELECT username FROM public.user_profiles 
          WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "file_share_permissions_insert" ON public.file_share_permissions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.file_shares fs 
      WHERE fs.id = share_id 
      AND fs.owner_username = (
        SELECT username FROM public.user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "file_share_permissions_update" ON public.file_share_permissions
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      username = (
        SELECT username FROM public.user_profiles 
        WHERE id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.file_shares fs 
        WHERE fs.id = file_share_permissions.share_id 
        AND fs.owner_username = (
          SELECT username FROM public.user_profiles 
          WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "file_share_permissions_delete" ON public.file_share_permissions
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.file_shares fs 
      WHERE fs.id = file_share_permissions.share_id 
      AND fs.owner_username = (
        SELECT username FROM public.user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for file_shares
CREATE POLICY "file_shares_select" ON public.file_shares
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      owner_username = (
        SELECT username FROM public.user_profiles 
        WHERE id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.file_share_permissions fsp
        WHERE fsp.share_id = file_shares.id 
        AND fsp.username = (
          SELECT username FROM public.user_profiles 
          WHERE id = auth.uid()
        )
        AND fsp.status = 'granted'
      )
    )
  );

CREATE POLICY "file_shares_insert" ON public.file_shares
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    owner_username = (
      SELECT username FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "file_shares_update" ON public.file_shares
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    owner_username = (
      SELECT username FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "file_shares_delete" ON public.file_shares
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    owner_username = (
      SELECT username FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

-- RLS Policies for messages
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = messages.room_id 
      AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    username = (
      SELECT username FROM public.user_profiles 
      WHERE id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.room_participants rp
      WHERE rp.room_id = messages.room_id 
      AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

-- RLS Policies for profile_views
CREATE POLICY "profile_views_select" ON public.profile_views
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      viewed_username = (
        SELECT username FROM public.user_profiles 
        WHERE id = auth.uid()
      ) OR
      viewer_username = (
        SELECT username FROM public.user_profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "profile_views_insert" ON public.profile_views
  FOR INSERT WITH CHECK (true);

-- RLS Policies for room_participants
CREATE POLICY "room_participants_select" ON public.room_participants
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.room_participants rp2
        WHERE rp2.room_id = room_participants.room_id 
        AND rp2.user_id = auth.uid()
        AND rp2.role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY "room_participants_insert" ON public.room_participants
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    username = (
      SELECT username FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "room_participants_update" ON public.room_participants
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.room_participants rp2
        WHERE rp2.room_id = room_participants.room_id 
        AND rp2.user_id = auth.uid()
        AND rp2.role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY "room_participants_delete" ON public.room_participants
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.room_participants rp2
        WHERE rp2.room_id = room_participants.room_id 
        AND rp2.user_id = auth.uid()
        AND rp2.role IN ('admin', 'moderator')
      )
    )
  );

-- RLS Policies for rooms
CREATE POLICY "rooms_select" ON public.rooms
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      NOT is_private OR
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.room_participants rp
        WHERE rp.room_id = rooms.id 
        AND rp.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "rooms_insert" ON public.rooms
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

CREATE POLICY "rooms_update" ON public.rooms
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.room_participants rp
        WHERE rp.room_id = rooms.id 
        AND rp.user_id = auth.uid()
        AND rp.role IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY "rooms_delete" ON public.rooms
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- RLS Policies for stripe_events (admin only)
CREATE POLICY "stripe_events_select" ON public.stripe_events
  FOR SELECT USING (false);

CREATE POLICY "stripe_events_insert" ON public.stripe_events
  FOR INSERT WITH CHECK (false);

CREATE POLICY "stripe_events_update" ON public.stripe_events
  FOR UPDATE USING (false);

CREATE POLICY "stripe_events_delete" ON public.stripe_events
  FOR DELETE USING (false);

-- RLS Policies for subscription_history
CREATE POLICY "subscription_history_select" ON public.subscription_history
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "subscription_history_insert" ON public.subscription_history
  FOR INSERT WITH CHECK (false);

-- RLS Policies for subscription_plans (read-only for authenticated users)
CREATE POLICY "subscription_plans_select" ON public.subscription_plans
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    is_active = true
  );

CREATE POLICY "subscription_plans_insert" ON public.subscription_plans
  FOR INSERT WITH CHECK (false);

CREATE POLICY "subscription_plans_update" ON public.subscription_plans
  FOR UPDATE USING (false);

CREATE POLICY "subscription_plans_delete" ON public.subscription_plans
  FOR DELETE USING (false);

-- RLS Policies for user_profiles
CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      is_public = true OR
      id = auth.uid()
    )
  );

CREATE POLICY "user_profiles_insert" ON public.user_profiles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    id = auth.uid()
  );

CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    id = auth.uid()
  );

CREATE POLICY "user_profiles_delete" ON public.user_profiles
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    id = auth.uid()
  );

-- RLS Policies for user_subscriptions
CREATE POLICY "user_subscriptions_select" ON public.user_subscriptions
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "user_subscriptions_insert" ON public.user_subscriptions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "user_subscriptions_update" ON public.user_subscriptions
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );

CREATE POLICY "user_subscriptions_delete" ON public.user_subscriptions
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid()
  );