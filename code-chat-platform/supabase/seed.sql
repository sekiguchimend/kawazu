-- サンプルデータの投入
-- 開発・テスト用のサンプルルームとメッセージ

-- サンプルルーム作成
INSERT INTO rooms (name, slug, is_private, created_at) VALUES
  ('プロジェクト会議', 'project-meeting', false, NOW()),
  ('コードレビュー', 'code-review', false, NOW()),
  ('開発チーム雑談', 'dev-team-chat', false, NOW()),
  ('テスト用プライベート', 'private-test', true, '$2b$10$example.hash.for.password123', NOW());

-- サンプル参加者データ
INSERT INTO room_participants (room_id, username, role, joined_at) VALUES
  (
    (SELECT id FROM rooms WHERE slug = 'project-meeting'),
    'alice',
    'owner',
    NOW() - INTERVAL '30 minutes'
  ),
  (
    (SELECT id FROM rooms WHERE slug = 'project-meeting'),
    'bob',
    'member',
    NOW() - INTERVAL '25 minutes'
  ),
  (
    (SELECT id FROM rooms WHERE slug = 'code-review'),
    'alice',
    'owner',
    NOW() - INTERVAL '15 minutes'
  ),
  (
    (SELECT id FROM rooms WHERE slug = 'code-review'),
    'charlie',
    'member',
    NOW() - INTERVAL '10 minutes'
  );

-- サンプルメッセージデータ
INSERT INTO messages (room_id, username, content, message_type, created_at) VALUES
  (
    (SELECT id FROM rooms WHERE slug = 'project-meeting'),
    'alice',
    'みなさんお疲れさまです！今日の進捗はいかがでしょうか？',
    'text',
    NOW() - INTERVAL '20 minutes'
  ),
  (
    (SELECT id FROM rooms WHERE slug = 'project-meeting'),
    'bob',
    'お疲れさまです！ユーザー認証機能が完成しました。',
    'text',
    NOW() - INTERVAL '18 minutes'
  ),
  (
    (SELECT id FROM rooms WHERE slug = 'project-meeting'),
    'bob',
    E'```javascript\n// 新しい認証フック\nexport function useAuth() {\n  const [user, setUser] = useState(null);\n  // ...\n}\n```',
    'code',
    NOW() - INTERVAL '15 minutes'
  ),
  (
    (SELECT id FROM rooms WHERE slug = 'project-meeting'),
    'alice',
    'いいですね！テストも書いていただけますか？',
    'text',
    NOW() - INTERVAL '12 minutes'
  ),
  (
    (SELECT id FROM rooms WHERE slug = 'code-review'),
    'alice',
    '新しいPRをレビューお願いします',
    'text',
    NOW() - INTERVAL '8 minutes'
  ),
  (
    (SELECT id FROM rooms WHERE slug = 'code-review'),
    'charlie',
    '確認します！',
    'text',
    NOW() - INTERVAL '5 minutes'
  );