-- ひとことβ 改善ループの受け口（POST /api/loop-event・GET /api/loop-events、worker.mjs）の保存先。
-- 既存の D1（binding QUOTA）に表を1つ足すだけ。既存の quota・trial_applications 表には触れない。本番は未適用（本人確認のうえで適用）。
-- 例: wrangler d1 execute radineer-reviews-beta-quota --remote --file intake-beta/migrations/0002_loop_events.sql --config intake-beta/wrangler.json
-- 1行 = (日付 UTC, 種類, 指紋) ごとの件数。お客さま画面からの行は 種類・画面・版・エラー種別・自分たちのJSのファイル名:関数名・選んだ区分 だけ。
-- 自由記述（text_masked）は店主のご意見（screen が lp / create）だけで、保存前にメール・電話・URL・鍵を伏せ字にしたもの。
-- IP・ハッシュ・店名・感想本文・申込情報はこの表に入らない（連打対策の数は quota 表の lpip:/lfip:/lpday: 行、3日で削除）。
-- 保存期間（2026-09-29 本人決定）: 店主のご意見（text_masked のある行）は6か月で行ごと、ほかの行は13か月で削除（worker.mjs の scheduled()・毎日）。
CREATE TABLE IF NOT EXISTS loop_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  product TEXT NOT NULL CHECK (product = 'hitokoto-beta'),
  kind TEXT NOT NULL CHECK (kind IN ('error','feedback')),
  screen TEXT NOT NULL CHECK (length(screen) BETWEEN 1 AND 40),
  version TEXT NOT NULL CHECK (length(version) BETWEEN 1 AND 40),
  fp TEXT NOT NULL CHECK (length(fp) = 16),
  error_type TEXT CHECK (error_type IS NULL OR length(error_type) <= 80),
  frame TEXT CHECK (frame IS NULL OR length(frame) <= 80),
  category TEXT CHECK (category IS NULL OR length(category) <= 20),
  text_masked TEXT CHECK (text_masked IS NULL OR (kind = 'feedback' AND screen IN ('lp','create') AND length(text_masked) <= 400)),
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1),
  UNIQUE (day, kind, fp)
);
CREATE INDEX IF NOT EXISTS loop_events_product_day ON loop_events (product, day);
