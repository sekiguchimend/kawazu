-- サブスクリプション関連のテーブルを作成（完全版）

-- 既存テーブルがある場合は削除
DROP TABLE IF EXISTS stripe_events CASCADE;
DROP TABLE IF EXISTS subscription_history CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

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

-- インデックス作成
CREATE INDEX idx_subscription_plans_stripe_price_id ON subscription_plans(stripe_price_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_created_at ON subscription_history(created_at);
CREATE INDEX idx_stripe_events_stripe_event_id ON stripe_events(stripe_event_id);
CREATE INDEX idx_stripe_events_processed ON stripe_events(processed);

-- RLS設定
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

-- updated_at 自動更新のトリガー関数
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- サブスクリプションテーブルにトリガー追加
CREATE TRIGGER set_subscription_plans_timestamp
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_user_subscriptions_timestamp
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- 初期プランデータ挿入
INSERT INTO subscription_plans (name, stripe_price_id, amount, features) VALUES
  ('ベーシック', 'price_1QcABCDEFGHIJKLMNOP', 1000, '{"max_rooms": 5, "max_participants_per_room": 10, "storage_gb": 1}'),
  ('スタンダード', 'price_1QcABCDEFGHIJKLMNOQ', 3000, '{"max_rooms": 20, "max_participants_per_room": 50, "storage_gb": 10, "advanced_features": true}'),
  ('プレミアム', 'price_1QcABCDEFGHIJKLMNOR', 5000, '{"max_rooms": "unlimited", "max_participants_per_room": "unlimited", "storage_gb": 100, "advanced_features": true, "priority_support": true}');