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
  skills TEXT[], -- プログラミング言語・技術スキル
  location VARCHAR(100),
  timezone VARCHAR(50),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- プロフィール閲覧履歴（オプション）
CREATE TABLE profile_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_username VARCHAR(100),
  viewed_username VARCHAR(100) NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (viewed_username) REFERENCES user_profiles(username)
);

-- インデックス作成
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_public ON user_profiles(is_public);
CREATE INDEX idx_profile_views_viewed ON profile_views(viewed_username);

-- RLS設定
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- プロフィールの読み取りポリシー
CREATE POLICY "Public profiles are readable by everyone" ON user_profiles
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can read their own profile" ON user_profiles
  FOR SELECT USING (username = current_setting('app.current_username', true));

-- プロフィールの更新ポリシー
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (username = current_setting('app.current_username', true));

-- プロフィール作成ポリシー
CREATE POLICY "Anyone can create a profile" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- updated_at自動更新トリガー
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- 既存のroom_participantsテーブルとの連携用VIEW
CREATE VIEW participant_profiles AS
SELECT 
  rp.room_id,
  rp.username,
  rp.role,
  rp.joined_at,
  up.display_name,
  up.avatar_url,
  up.bio
FROM room_participants rp
LEFT JOIN user_profiles up ON rp.username = up.username;