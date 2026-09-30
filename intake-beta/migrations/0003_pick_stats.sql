-- ひとことβ 選択の件数（POST /api/pick-stat・GET /api/pick-stats、worker.mjs）の保存先。DECISIONS.md「話題の外部根拠と選択の記録」の本人決定「はい」。
-- 既存の D1（binding QUOTA）に表を1つ足すだけ。既存の quota・trial_applications・loop_events 表には触れない。本番は未適用（本人確認のうえで適用）。
-- 例: wrangler d1 execute radineer-reviews-beta-quota --remote --file intake-beta/migrations/0003_pick_stats.sql --config intake-beta/wrangler.json
-- 1行 = (日付 UTC, 業種, 話題, 評価, 細目) ごとの件数。detail='' はその話題がその評価で選ばれた回数（細目の有無によらず1回）、
-- detail=<細目のID> はその細目も選ばれた回数。値は public/compose.js の固定の表の ID だけ（worker が検査）。
-- 店名・共有URL・感想の文・ひとこと足すの言葉・IP・ハッシュはこの表に入らない（連打対策の数は quota 表の psip:/psday: 行、3日で削除）。
-- 保存期間（2026-09-29 本人決定）: 13か月。worker.mjs の scheduled()（Cron Trigger・毎日）が古い日付の行を削除。
CREATE TABLE IF NOT EXISTS pick_stats (
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  kind TEXT NOT NULL CHECK (kind IN ('general','food','beauty','retail')),
  topic TEXT NOT NULL CHECK (topic GLOB '[a-z]*' AND length(topic) BETWEEN 1 AND 20),
  rating TEXT NOT NULL CHECK (rating IN ('good','ok','concern')),
  detail TEXT NOT NULL DEFAULT '' CHECK (length(detail) <= 20),
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1),
  PRIMARY KEY (day, kind, topic, rating, detail)
);
