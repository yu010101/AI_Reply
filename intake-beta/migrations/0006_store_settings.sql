-- ひとことβ 店主の管理画面の「お店の設定」（振り分け・LINE・インスタ）と、振り分けの件数（2026-10-02 本人決定）。本番は未適用（本人確認のうえで適用）。
-- 例: wrangler d1 execute radineer-reviews-beta-quota --remote --file intake-beta/migrations/0006_store_settings.sql --config intake-beta/wrangler.json
-- 0005 の後、この表を使う worker を配備する前に適用する。表を4つ足すだけ。既存の表・行には触れない。
-- store_settings: 店ID ごとの設定。route_low = 振り分け（評価が低いお客さまに Google への案内を出さない）。既定は 0（オフ）。
--   1 にできるのは、店主が管理画面で Google のポリシーの原文とおそれを読み、同意したときだけ（route_consent_at = 同意した日時 UTC・
--   route_consent_version = 同意した説明文の版）。オフに戻しても最後の同意の記録は残す（履歴は store_route_log）。
--   line_url / instagram_url: 店主が登録した LINE 公式アカウントの友だち追加URL・インスタのプロフィールURL（worker が許可した形に直したもの。'' = なし）。
-- store_route_log: 振り分けをオン（同意）・オフにした日時の記録。お店の登録と一緒に消す。
-- store_route_counts: 振り分けがオンの店で、お客さまが候補を見る操作をしたとき、Google への案内を出さなかった（held）／出した（passed）の件数。
-- store_held_picks: held のお客さまが選んだ話題・評価・細目の件数（store_picks と同じ形。感想の文・店名・IP は入らない）。
-- 保存期間: store_route_counts・store_held_picks は記録した日から13か月。4つとも、お店の登録（stores）が最後に使われてから1年で消えるときに先に消す。
--   worker.mjs の scheduled() が毎日削除する（D1 は外部キーを強制するため、子の行を先に消す）。
CREATE TABLE IF NOT EXISTS store_settings (
  sid TEXT PRIMARY KEY REFERENCES stores (sid),
  route_low INTEGER NOT NULL DEFAULT 0 CHECK (route_low IN (0, 1)),
  route_consent_at TEXT CHECK (route_consent_at IS NULL OR route_consent_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]Z'),
  route_consent_version TEXT CHECK (route_consent_version IS NULL OR length(route_consent_version) BETWEEN 1 AND 20),
  line_url TEXT NOT NULL DEFAULT '' CHECK (length(line_url) <= 200 AND (line_url = '' OR line_url GLOB 'https://*')),
  instagram_url TEXT NOT NULL DEFAULT '' CHECK (length(instagram_url) <= 200 AND (instagram_url = '' OR instagram_url GLOB 'https://www.instagram.com/*')),
  CHECK (route_low = 0 OR (route_consent_at IS NOT NULL AND route_consent_version IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS store_route_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sid TEXT NOT NULL REFERENCES stores (sid),
  at TEXT NOT NULL CHECK (at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9]Z'),
  action TEXT NOT NULL CHECK (action IN ('on', 'off')),
  consent_version TEXT CHECK ((action = 'on' AND consent_version IS NOT NULL AND length(consent_version) BETWEEN 1 AND 20) OR (action = 'off' AND consent_version IS NULL))
);
CREATE INDEX IF NOT EXISTS store_route_log_sid ON store_route_log (sid);
CREATE TABLE IF NOT EXISTS store_route_counts (
  sid TEXT NOT NULL REFERENCES stores (sid),
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  outcome TEXT NOT NULL CHECK (outcome IN ('held', 'passed')),
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1),
  PRIMARY KEY (sid, day, outcome)
);
CREATE TABLE IF NOT EXISTS store_held_picks (
  sid TEXT NOT NULL REFERENCES stores (sid),
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  topic TEXT NOT NULL CHECK (topic GLOB '[a-z]*' AND length(topic) BETWEEN 1 AND 20),
  rating TEXT NOT NULL CHECK (rating IN ('good', 'ok', 'concern')),
  detail TEXT NOT NULL DEFAULT '' CHECK (length(detail) <= 20),
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1),
  PRIMARY KEY (sid, day, topic, rating, detail)
);
