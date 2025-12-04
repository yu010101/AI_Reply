#!/bin/bash

# オンボーディング機能のマイグレーションをSupabase CLIで実行するスクリプト

echo "オンボーディング機能のマイグレーションを実行します..."

# マイグレーションSQLファイルのパス
MIGRATION_FILE="supabase/migrations/20250127000002_add_onboarding_completed.sql"

# SQLファイルの内容を確認
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "エラー: マイグレーションファイルが見つかりません: $MIGRATION_FILE"
    exit 1
fi

echo "マイグレーションファイル: $MIGRATION_FILE"
echo ""
echo "以下のSQLをSupabaseダッシュボードのSQLエディタで実行してください:"
echo "=========================================="
cat "$MIGRATION_FILE"
echo "=========================================="
echo ""
echo "または、psqlで直接実行する場合:"
echo "psql 'postgresql://postgres:[PASSWORD]@db.fmonerzmxohwkisdagvm.supabase.co:5432/postgres' -f $MIGRATION_FILE"
