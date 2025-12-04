#!/bin/bash

# psqlを使用してオンボーディング機能のマイグレーションを実行するスクリプト

set -e

echo "=========================================="
echo "オンボーディング機能のマイグレーション実行"
echo "=========================================="
echo ""

# データベース接続情報
# Supabaseダッシュボードの「Settings」→「Database」→「Connection string」から取得
DB_HOST="db.fmonerzmxohwkisdagvm.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

if [ -z "$DB_PASSWORD" ]; then
    echo "エラー: SUPABASE_DB_PASSWORD環境変数が設定されていません"
    echo ""
    echo "使用方法:"
    echo "  export SUPABASE_DB_PASSWORD='your-database-password'"
    echo "  ./scripts/run-onboarding-migration-psql.sh"
    echo ""
    echo "または、SupabaseダッシュボードのSQLエディタで以下を実行してください:"
    echo "=========================================="
    cat scripts/run-onboarding-migration.sql
    echo "=========================================="
    exit 1
fi

# psqlがインストールされているか確認
if ! command -v psql &> /dev/null; then
    echo "エラー: psqlがインストールされていません"
    echo ""
    echo "macOSの場合:"
    echo "  brew install postgresql"
    echo ""
    echo "または、SupabaseダッシュボードのSQLエディタで以下を実行してください:"
    echo "=========================================="
    cat scripts/run-onboarding-migration.sql
    echo "=========================================="
    exit 1
fi

# 接続文字列
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

echo "データベースに接続中..."
echo ""

# マイグレーションを実行
if psql "$CONNECTION_STRING" -f scripts/run-onboarding-migration.sql; then
    echo ""
    echo "✅ マイグレーションが正常に完了しました！"
    echo ""
    echo "確認クエリを実行します..."
    psql "$CONNECTION_STRING" -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed';"
else
    echo ""
    echo "❌ マイグレーションの実行に失敗しました"
    echo ""
    echo "SupabaseダッシュボードのSQLエディタで以下を実行してください:"
    echo "=========================================="
    cat scripts/run-onboarding-migration.sql
    echo "=========================================="
    exit 1
fi
