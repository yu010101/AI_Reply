-- ひとことβ ③ 時間と離脱（匿名）と ① 店ごとの「声の報告」の保存先（worker.mjs）。本番は未適用（本人確認のうえで適用）。
-- 既存の D1（binding QUOTA）に表を4つ足すだけ。既存の quota・trial_applications・loop_events・pick_stats 表には触れない。
-- 例: wrangler d1 execute radineer-reviews-beta-quota --remote --file intake-beta/migrations/0004_store_report.sql --config intake-beta/wrangler.json
-- funnel_times: お客さま画面の各段階に、開いてから何秒で着いたか（区分）を (日付 UTC, 段階, 区分) ごとの件数で数える。店とは結びつかない。
-- stores: #create で発行した店ID（sid・16バイトの乱数）と、店主だけが持つ報告用トークン（32バイトの乱数）の SHA-256 だけ。
--   店名・Googleのリンク・トークン本体・IP は入らない。kind は候補の話題の表を選ぶための業種。
-- store_picks / store_steps: 店ID × 日付 × 話題 × 評価 × 細目、店ID × 日付 × 段階 の件数。感想の文・店名・IP は入らない。
-- 保存期間（2026-09-29 本人決定）: funnel_times・store_picks・store_steps は13か月、stores は最後に使われてから1年（0005 で last_used_day を足す）。worker.mjs の scheduled() が毎日削除。
CREATE TABLE IF NOT EXISTS funnel_times (
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  step TEXT NOT NULL CHECK (step IN ('view','classify','rating','rated','cands','cand','confirm','copy','google','draft','direct')),
  bucket TEXT NOT NULL CHECK (bucket IN ('0-10','10-20','20-30','30-60','60-120','120+')),
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1),
  PRIMARY KEY (day, step, bucket)
);
CREATE TABLE IF NOT EXISTS stores (
  sid TEXT PRIMARY KEY CHECK (length(sid) = 22 AND sid NOT GLOB '*[^A-Za-z0-9_-]*'),
  token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64 AND token_hash NOT GLOB '*[^0-9a-f]*'),
  kind TEXT NOT NULL CHECK (kind IN ('general','food','beauty','retail')),
  created_day TEXT NOT NULL CHECK (created_day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
CREATE TABLE IF NOT EXISTS store_picks (
  sid TEXT NOT NULL REFERENCES stores (sid),
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  topic TEXT NOT NULL CHECK (topic GLOB '[a-z]*' AND length(topic) BETWEEN 1 AND 20),
  rating TEXT NOT NULL CHECK (rating IN ('good','ok','concern')),
  detail TEXT NOT NULL DEFAULT '' CHECK (length(detail) <= 20),
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1),
  PRIMARY KEY (sid, day, topic, rating, detail)
);
CREATE TABLE IF NOT EXISTS store_steps (
  sid TEXT NOT NULL REFERENCES stores (sid),
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  step TEXT NOT NULL CHECK (step IN ('view','classify','rating','rated','cands','cand','confirm','copy','google','draft','direct','picks')),
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1),
  PRIMARY KEY (sid, day, step)
);
