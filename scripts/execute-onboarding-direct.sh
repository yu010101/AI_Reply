#!/bin/bash

# Supabase CLIでオンボーディング機能のマイグレーションを直接実行

echo "オンボーディング機能のマイグレーションをSupabase CLIで実行します..."
echo ""

# 最新のSupabase CLIを使用
SUPABASE_CMD="npx supabase@latest"

# プロジェクトにリンク
echo "1. Supabaseプロジェクトにリンク中..."
$SUPABASE_CMD link --project-ref fmonerzmxohwkisdagvm --password "$(echo 'YOUR_DB_PASSWORD' | base64)" 2>&1 | grep -v "password" || echo "リンク済み"

echo ""
echo "2. マイグレーションSQLを読み込み中..."
SQL_CONTENT=$(cat scripts/run-onboarding-migration.sql)

echo ""
echo "3. SupabaseダッシュボードのSQLエディタで以下を実行してください:"
echo "=========================================="
echo "$SQL_CONTENT"
echo "=========================================="
echo ""
echo "または、psqlで直接実行する場合:"
echo "psql 'postgresql://postgres:[PASSWORD]@db.fmonerzmxohwkisdagvm.supabase.co:5432/postgres' -f scripts/run-onboarding-migration.sql"
echo ""
echo "注意: Supabase CLIの認証に問題がある場合は、上記の方法で実行してください。"
