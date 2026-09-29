-- ひとことβ LP の試用店舗募集フォーム（POST /api/trial）の保存先。
-- 既存の D1（binding QUOTA / radineer-reviews-beta-quota）に表を1つ足すだけ。既存の quota 表には触れない。
-- 本番への適用は本人確認のうえで行う（例: wrangler d1 execute radineer-reviews-beta-quota --remote --file intake-beta/migrations/0001_trial_applications.sql --config intake-beta/wrangler.json）。
-- IP・ハッシュ・端末情報は保存しない。連打対策の数は quota 表の trip:/trday:/trtotal 行で数える（3日より古い trip:/trday: 行は自動削除）。
CREATE TABLE IF NOT EXISTS trial_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,                                   -- UTC ISO8601
  store_name TEXT NOT NULL CHECK (length(store_name) BETWEEN 1 AND 80),
  contact_name TEXT NOT NULL CHECK (length(contact_name) BETWEEN 1 AND 40),
  contact TEXT NOT NULL CHECK (length(contact) BETWEEN 1 AND 120),     -- メールアドレスまたは電話番号
  message TEXT NOT NULL DEFAULT '' CHECK (length(message) <= 400),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','accepted','declined','deleted'))
);
CREATE INDEX IF NOT EXISTS trial_applications_created_at ON trial_applications (created_at);
