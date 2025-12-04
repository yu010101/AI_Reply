#!/bin/bash

# Supabase Management APIを使用してオンボーディング機能のマイグレーションを実行

set -e

echo "=========================================="
echo "オンボーディング機能のマイグレーション実行"
echo "=========================================="
echo ""

# 環境変数の確認
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://fmonerzmxohwkisdagvm.supabase.co}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ エラー: SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません"
    echo ""
    echo "Supabaseダッシュボードから取得してください:"
    echo "  Settings → API → service_role key (secret)"
    echo ""
    echo "使用方法:"
    echo "  export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
    echo "  ./scripts/execute-onboarding-direct-api.sh"
    echo ""
    echo "または、SupabaseダッシュボードのSQLエディタで以下を実行してください:"
    echo "=========================================="
    cat scripts/run-onboarding-migration.sql
    echo "=========================================="
    exit 1
fi

# マイグレーションSQLを読み込み
MIGRATION_SQL=$(cat scripts/run-onboarding-migration.sql)

echo "Supabase Management APIを使用してマイグレーションを実行します..."
echo ""

# Supabase Management APIを使用してSQLを実行
# 注意: Supabaseには直接SQL実行のREST APIエンドポイントがないため、
# この方法は使用できません。代わりにSupabaseダッシュボードで実行してください。

echo "⚠️  Supabase Management APIには直接SQL実行のエンドポイントがありません"
echo ""
echo "代わりに、以下のいずれかの方法を使用してください:"
echo ""
echo "方法1: SupabaseダッシュボードのSQLエディタで実行（推奨）"
echo "  1. https://supabase.com/dashboard にアクセス"
echo "  2. プロジェクト fmonerzmxohwkisdagvm を選択"
echo "  3. SQL Editorを開く"
echo "  4. 以下のSQLをコピーして実行:"
echo "=========================================="
echo "$MIGRATION_SQL"
echo "=========================================="
echo ""
echo "方法2: psqlコマンドで直接実行"
echo "  export SUPABASE_DB_PASSWORD='your-database-password'"
echo "  ./scripts/run-onboarding-migration-psql.sh"
echo ""
