#!/bin/bash

# 環境変数の読み込み
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Supabaseのマイグレーションを実行
echo "Supabaseのマイグレーションを実行中..."
npx supabase db push

echo "マイグレーションが完了しました" 