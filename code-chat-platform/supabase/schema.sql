-- Code Chat Database Schema

-- ルームテーブル
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  is_private BOOLEAN DEFAULT false,
  password_hash VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メッセージテーブル
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  username VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'code', 'system'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ルーム参加者テーブル
CREATE TABLE room_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  username VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- ユーザープロフィールテーブル
CREATE TABLE user_profiles (
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

-- プロフィール閲覧ログテーブル
CREATE TABLE profile_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_username VARCHAR(100),
  viewed_username VARCHAR(100) NOT NULL REFERENCES user_profiles(username),
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX idx_rooms_slug ON rooms(slug);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_is_public ON user_profiles(is_public);
CREATE INDEX idx_profile_views_viewed_username ON profile_views(viewed_username);
CREATE INDEX idx_profile_views_viewer_username ON profile_views(viewer_username);

-- RLS (Row Level Security) の設定
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- ポリシーの設定
-- ルームは誰でも読み取り可能（パブリックルームの場合）
CREATE POLICY "Public rooms are readable by everyone" ON rooms
  FOR SELECT USING (NOT is_private);

-- プライベートルームは参加者のみ読み取り可能
CREATE POLICY "Private rooms are readable by participants" ON rooms
  FOR SELECT USING (
    is_private AND EXISTS (
      SELECT 1 FROM room_participants 
      WHERE room_participants.room_id = rooms.id 
      AND room_participants.user_id = auth.uid()
    )
  );

-- ルーム作成は認証済みユーザーのみ可能
CREATE POLICY "Authenticated users can create rooms" ON rooms
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- メッセージは参加者のみ読み取り可能
CREATE POLICY "Messages are readable by room participants" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM room_participants 
      WHERE room_participants.room_id = messages.room_id 
      AND room_participants.user_id = auth.uid()
    )
  );

-- メッセージ作成は参加者のみ可能
CREATE POLICY "Room participants can create messages" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_participants 
      WHERE room_participants.room_id = messages.room_id 
      AND room_participants.user_id = auth.uid()
    )
  );

-- 参加者情報は参加者のみ読み取り可能
CREATE POLICY "Participants are readable by room participants" ON room_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = room_participants.room_id 
      AND rp.user_id = auth.uid()
    )
  );

-- ユーザープロフィールポリシー
-- パブリックプロフィールは誰でも読み取り可能
CREATE POLICY "Public profiles are readable by everyone" ON user_profiles
  FOR SELECT USING (is_public = true);

-- プライベートプロフィールは本人のみ読み取り可能
CREATE POLICY "Private profiles are readable by owner" ON user_profiles
  FOR SELECT USING (
    is_public = false AND 
    username = current_setting('app.current_username', true)
  );

-- プロフィール作成・更新は本人のみ可能
CREATE POLICY "Users can manage their own profiles" ON user_profiles
  FOR ALL USING (username = current_setting('app.current_username', true));

-- プロフィール閲覧ログポリシー
CREATE POLICY "Profile views are readable by involved users" ON profile_views
  FOR SELECT USING (
    viewer_username = current_setting('app.current_username', true) OR
    viewed_username = current_setting('app.current_username', true)
  );

CREATE POLICY "Users can log profile views" ON profile_views
  FOR INSERT WITH CHECK (true);

-- updated_at 自動更新のトリガー関数
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- テーブルに updated_at 自動更新トリガーを追加
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_user_profiles_timestamp
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- ファイル共有テーブル
CREATE TABLE file_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_username VARCHAR(100) NOT NULL,
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_content TEXT,
  file_type VARCHAR(50),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  share_token VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ファイル共有権限テーブル
CREATE TABLE file_share_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID REFERENCES file_shares(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  permission_type VARCHAR(20) DEFAULT 'read', -- 'read', 'write'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by VARCHAR(100) NOT NULL,
  UNIQUE(share_id, username)
);

-- ファイルアクセスログテーブル
CREATE TABLE file_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID REFERENCES file_shares(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'view', 'download', 'edit', 'approve', 'deny'
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ファイル共有関連のインデックス
CREATE INDEX idx_file_shares_room_id ON file_shares(room_id);
CREATE INDEX idx_file_shares_owner ON file_shares(owner_username);
CREATE INDEX idx_file_shares_token ON file_shares(share_token);
CREATE INDEX idx_file_shares_active ON file_shares(is_active, expires_at);
CREATE INDEX idx_file_share_permissions_share_id ON file_share_permissions(share_id);
CREATE INDEX idx_file_share_permissions_username ON file_share_permissions(username, status);
CREATE INDEX idx_file_access_logs_share_id ON file_access_logs(share_id);
CREATE INDEX idx_file_access_logs_username ON file_access_logs(username, accessed_at);

-- ファイル共有テーブルのRLS設定
ALTER TABLE file_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_share_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_access_logs ENABLE ROW LEVEL SECURITY;

-- ファイル共有のポリシー設定
-- ファイル共有は室内参加者のみ読み取り可能
CREATE POLICY "File shares are readable by room participants" ON file_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM room_participants 
      WHERE room_participants.room_id = file_shares.room_id 
      AND room_participants.user_id = auth.uid()
    )
  );

-- ファイル共有作成は室内参加者のみ可能
CREATE POLICY "Room participants can create file shares" ON file_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_participants 
      WHERE room_participants.room_id = file_shares.room_id 
      AND room_participants.user_id = auth.uid()
    )
  );

-- ファイル共有権限は関連ユーザーのみ読み取り可能
CREATE POLICY "File share permissions are readable by involved users" ON file_share_permissions
  FOR SELECT USING (
    username = current_setting('app.current_username', true) OR
    EXISTS (
      SELECT 1 FROM file_shares fs
      WHERE fs.id = file_share_permissions.share_id
      AND fs.owner_username = current_setting('app.current_username', true)
    )
  );

-- ファイルアクセスログは関連ユーザーのみ読み取り可能
CREATE POLICY "File access logs are readable by involved users" ON file_access_logs
  FOR SELECT USING (
    username = current_setting('app.current_username', true) OR
    EXISTS (
      SELECT 1 FROM file_shares fs
      WHERE fs.id = file_access_logs.share_id
      AND fs.owner_username = current_setting('app.current_username', true)
    )
  );

-- file_shares テーブルに updated_at 自動更新トリガーを追加
CREATE TRIGGER set_file_shares_timestamp
  BEFORE UPDATE ON file_shares
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- サブスクリプションプランテーブル
CREATE TABLE subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  stripe_price_id VARCHAR(255) UNIQUE NOT NULL,
  amount INTEGER NOT NULL, -- 円単位
  currency VARCHAR(3) DEFAULT 'jpy',
  interval_type VARCHAR(20) DEFAULT 'month', -- 'month', 'year'
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザーサブスクリプションテーブル
CREATE TABLE user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due', 'unpaid', 'incomplete'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- サブスクリプション履歴テーブル
CREATE TABLE subscription_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES subscription_plans(id),
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'canceled', 'reactivated'
  stripe_event_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripeイベントログテーブル
CREATE TABLE stripe_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- サブスクリプション関連のインデックス
CREATE INDEX idx_subscription_plans_stripe_price_id ON subscription_plans(stripe_price_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_created_at ON subscription_history(created_at);
CREATE INDEX idx_stripe_events_stripe_event_id ON stripe_events(stripe_event_id);
CREATE INDEX idx_stripe_events_processed ON stripe_events(processed);

-- サブスクリプションテーブルのRLS設定
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- サブスクリプションプランは誰でも読み取り可能
CREATE POLICY "Subscription plans are readable by everyone" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- ユーザーサブスクリプションは本人のみ読み取り可能
CREATE POLICY "Users can read their own subscriptions" ON user_subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- ユーザーサブスクリプションの更新は本人のみ可能
CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- サブスクリプション履歴は本人のみ読み取り可能
CREATE POLICY "Users can read their own subscription history" ON subscription_history
  FOR SELECT USING (user_id = auth.uid());

-- Stripeイベントはサービスロールのみアクセス可能
CREATE POLICY "Service role can access stripe events" ON stripe_events
  FOR ALL USING (auth.role() = 'service_role');

-- サブスクリプションテーブルに updated_at 自動更新トリガーを追加
CREATE TRIGGER set_subscription_plans_timestamp
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_user_subscriptions_timestamp
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- 初期サブスクリプションプランの挿入
INSERT INTO subscription_plans (name, stripe_price_id, amount, features) VALUES
  ('ベーシック', 'price_basic_1000_jpy', 1000, '{"max_rooms": 5, "max_participants_per_room": 10, "storage_gb": 1}'),
  ('スタンダード', 'price_standard_3000_jpy', 3000, '{"max_rooms": 20, "max_participants_per_room": 50, "storage_gb": 10, "advanced_features": true}'),
  ('プレミアム', 'price_premium_5000_jpy', 5000, '{"max_rooms": "unlimited", "max_participants_per_room": "unlimited", "storage_gb": 100, "advanced_features": true, "priority_support": true}');