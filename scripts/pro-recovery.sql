-- Pro 復旧用（Supabase SQL Editor で上から順に実行）

-- 0) 古い subscriptions テーブル用：不足カラムを追加（1回だけ実行）
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- 1) 現在の登録状況を確認
SELECT device_id, status, stripe_customer_id, stripe_subscription_id, customer_email, updated_at
FROM subscriptions
ORDER BY updated_at DESC;

-- 2) ブラウザの deviceId を確認（/pro で F12 → Console）
-- JSON.parse(localStorage.getItem('tsugi-bato-profile')).deviceId

-- 3) YOUR_DEVICE_ID を Console の値に置き換えて実行
-- INSERT INTO subscriptions (
--   device_id,
--   stripe_subscription_id,
--   customer_email,
--   customer_name,
--   status,
--   updated_at
-- ) VALUES (
--   'YOUR_DEVICE_ID',
--   'sub_1Tl5j8LAGMmFqsdLTqjZbYxo',
--   'shootingstar.ft@gmail.com',
--   'TSUKASA FUJIWARA',
--   'active',
--   now()
-- )
-- ON CONFLICT (device_id) DO UPDATE SET
--   stripe_subscription_id = EXCLUDED.stripe_subscription_id,
--   status = 'active',
--   customer_email = EXCLUDED.customer_email,
--   customer_name = EXCLUDED.customer_name,
--   updated_at = now();
