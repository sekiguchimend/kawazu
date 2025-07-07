-- initルームを作成
INSERT INTO rooms (name, slug, is_private, created_at) VALUES
  ('初期化ルーム', 'init', false, NOW())
ON CONFLICT (slug) DO NOTHING;

-- 現在作成されているルームの確認
SELECT id, name, slug, is_private, created_at FROM rooms ORDER BY created_at; 