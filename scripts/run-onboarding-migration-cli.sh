#!/bin/bash

# Supabase CLIでオンボーディング機能のマイグレーションを実行するスクリプト

set -e

echo "=========================================="
echo "オンボーディング機能のマイグレーション実行"
echo "=========================================="
echo ""

# マイグレーションSQLファイル
MIGRATION_FILE="supabase/migrations/20250127000002_add_onboarding_completed.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "エラー: マイグレーションファイルが見つかりません: $MIGRATION_FILE"
    exit 1
fi

echo "マイグレーションファイルを確認しました: $MIGRATION_FILE"
echo ""

# Supabaseプロジェクトにリンクされているか確認
if ! supabase status > /dev/null 2>&1; then
    echo "Supabaseプロジェクトにリンクされていません。"
    echo "プロジェクトをリンクします..."
    supabase link --project-ref fmonerzmxohwkisdagvm
fi

echo ""
echo "マイグレーションを実行します..."
echo ""

# 一時的に他のマイグレーションファイルをバックアップ
BACKUP_DIR="supabase/migrations_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# オンボーディング機能以外のマイグレーションファイルをバックアップ
for file in supabase/migrations/*.sql; do
    if [ "$(basename "$file")" != "20250127000002_add_onboarding_completed.sql" ]; then
        mv "$file" "$BACKUP_DIR/"
    fi
done

echo "他のマイグレーションファイルをバックアップしました: $BACKUP_DIR"
echo ""

# マイグレーションを実行
echo "マイグレーションを実行中..."
if npx supabase@latest db push --include-all --yes; then
    echo ""
    echo "✅ マイグレーションが正常に完了しました！"
    
    # バックアップからファイルを復元
    echo ""
    echo "バックアップからファイルを復元中..."
    mv "$BACKUP_DIR"/* supabase/migrations/ 2>/dev/null || true
    rmdir "$BACKUP_DIR" 2>/dev/null || true
    
    echo "✅ 完了しました"
else
    echo ""
    echo "❌ マイグレーションの実行に失敗しました"
    echo ""
    echo "バックアップからファイルを復元中..."
    mv "$BACKUP_DIR"/* supabase/migrations/ 2>/dev/null || true
    rmdir "$BACKUP_DIR" 2>/dev/null || true
    
    echo ""
    echo "代替方法: SupabaseダッシュボードのSQLエディタで以下を実行してください:"
    echo "=========================================="
    cat "$MIGRATION_FILE"
    echo "=========================================="
    exit 1
fi
