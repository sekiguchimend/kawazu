-- Stripe Price IDを正しい値に更新
UPDATE subscription_plans SET 
  stripe_price_id = 'price_basic_1000_jpy'
WHERE name = 'ベーシック';

UPDATE subscription_plans SET 
  stripe_price_id = 'price_standard_3000_jpy'
WHERE name = 'スタンダード';

UPDATE subscription_plans SET 
  stripe_price_id = 'price_premium_5000_jpy'
WHERE name = 'プレミアム';

-- 更新結果を確認
SELECT name, stripe_price_id, amount FROM subscription_plans ORDER BY amount;