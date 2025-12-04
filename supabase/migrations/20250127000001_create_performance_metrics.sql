-- パフォーマンスメトリクステーブルの作成
-- このテーブルはAPIリクエストのパフォーマンスメトリクスを記録します

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  duration INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  user_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_status_code ON performance_metrics(status_code);

-- パーティショニング（オプション - 大量データの場合）
-- 月ごとのパーティションを作成する場合は以下をコメントアウト
-- CREATE TABLE performance_metrics_2025_01 PARTITION OF performance_metrics
--   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- RLSポリシーの設定
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- 管理者のみが全データを閲覧可能
CREATE POLICY "管理者は全パフォーマンスメトリクスを閲覧可能"
  ON performance_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ユーザーは自分のメトリクスのみ閲覧可能
CREATE POLICY "ユーザーは自分のパフォーマンスメトリクスを閲覧可能"
  ON performance_metrics
  FOR SELECT
  USING (user_id = auth.uid());

-- システムはメトリクスを挿入可能（service_roleキーを使用）
-- 注意: service_roleキーを使用する場合は、RLSをバイパスするため、追加のポリシーは不要

-- コメント
COMMENT ON TABLE performance_metrics IS 'APIリクエストのパフォーマンスメトリクスを記録するテーブル';
COMMENT ON COLUMN performance_metrics.endpoint IS 'APIエンドポイントのパス';
COMMENT ON COLUMN performance_metrics.method IS 'HTTPメソッド（GET, POST, PUT, DELETEなど）';
COMMENT ON COLUMN performance_metrics.duration IS 'レスポンスタイム（ミリ秒）';
COMMENT ON COLUMN performance_metrics.status_code IS 'HTTPステータスコード';
COMMENT ON COLUMN performance_metrics.user_id IS 'リクエストを送信したユーザーID（認証されていない場合はNULL）';
COMMENT ON COLUMN performance_metrics.timestamp IS 'リクエストが処理された時刻';
