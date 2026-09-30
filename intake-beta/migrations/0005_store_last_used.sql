-- ひとことβ 保存期間（DECISIONS.md「保存期間・表示基準」2026-09-29 本人決定）のための列。本番は未適用（本人確認のうえで適用）。
-- 例: wrangler d1 execute radineer-reviews-beta-quota --remote --file intake-beta/migrations/0005_store_last_used.sql --config intake-beta/wrangler.json
-- 0004_store_report.sql の後、この列を使う worker を配備する前に適用する。stores に列を1つ足し、既にある店は「適用した日に使われた」とする
--   （0004 の後に使われていた店が created_day で古く見えて早く消えないように。消える側に倒さない）。ほかの表・行には触れない。
-- stores.last_used_day: その店が最後に使われた日（UTC）。お客さまの pick/段階の記録と報告の閲覧（/api/report・/api/notice）のたびに
--   その日の日付にする（同じ日に2回目以降は書かない）。NULL は 0004 のまま一度も使われていない店で、そのときは created_day を使う。
-- 期限切れの削除は worker.mjs の scheduled()（Cron Trigger・毎日1回）: COALESCE(last_used_day, created_day) が1年より前の店を、
--   先に store_picks・store_steps を消してから消す（D1 は外部キーを強制するため、子の行が残っている店は消さない）。
ALTER TABLE stores ADD COLUMN last_used_day TEXT CHECK (last_used_day IS NULL OR last_used_day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
UPDATE stores SET last_used_day = date('now') WHERE last_used_day IS NULL;
