# Git状態の整理ガイド

## 📋 現在のGit状態

### 変更されたファイル

多くのファイルが変更されています。リリース前に適切にコミットする必要があります。

### 削除されたファイル

- `google_credentials.txt` - 機密情報を含むファイル（削除済み ✅）

### ブランチ状態

- **現在のブランチ**: `main`
- **リモートブランチ**:
  - `remotes/origin/cursor/bc-2a72fbd6-d9f1-4b2e-9183-e9b3af6d3814-3848`
  - `remotes/origin/cursor/google-9969`
- **同期状態**: `main`ブランチは`origin/main`より1コミット遅れています

---

## 🧹 Git状態の整理手順

### 1. 変更の確認とコミット

リリース前の変更を確認し、適切にコミットします：

```bash
# 変更されたファイルを確認
git status

# ステージング
git add .

# コミット（適切なメッセージで）
git commit -m "chore: リリース前の準備

- 監視とアラートの設定を追加
- パフォーマンステストの実装
- ドキュメントの更新
- セキュリティヘッダーの強化
- ロガーの統一
- エラーハンドリングの統一"

# プッシュ
git push origin main
```

### 2. リモートブランチの確認

不要なリモートブランチを削除：

```bash
# リモートブランチを確認
git branch -r

# 不要なブランチを削除（必要に応じて）
# git push origin --delete cursor/bc-2a72fbd6-d9f1-4b2e-9183-e9b3af6d3814-3848
# git push origin --delete cursor/google-9969
```

**注意**: ブランチを削除する前に、必要な変更が`main`ブランチにマージされていることを確認してください。

### 3. 未追跡ファイルの整理

```bash
# 未追跡ファイルを確認
git status --untracked-files=all

# 不要なファイルを.gitignoreに追加
# 例: test-results/, playwright-report/, .next/, node_modules/
```

### 4. mainブランチの同期

```bash
# リモートの最新状態を取得
git fetch origin

# リモートの変更を確認
git log HEAD..origin/main

# 必要に応じてマージまたはリベース
git merge origin/main
# または
git rebase origin/main
```

---

## ✅ チェックリスト

### リリース前のGit整理

- [ ] すべての変更を確認
- [ ] 適切なコミットメッセージでコミット
- [ ] リモートにプッシュ
- [ ] 不要なブランチの削除（必要に応じて）
- [ ] `.gitignore`の確認と更新
- [ ] `main`ブランチの同期

---

## 📝 推奨事項

### コミットメッセージの形式

[Conventional Commits](https://www.conventionalcommits.org/)の形式を使用することを推奨：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**タイプ**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードスタイル
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: その他

**例**:
```
chore: リリース前の準備

- 監視とアラートの設定を追加
- パフォーマンステストの実装
- ドキュメントの更新
```

### ブランチ戦略

- `main`: 本番環境用のブランチ
- `develop`: 開発用のブランチ（オプション）
- `feature/*`: 機能追加用のブランチ
- `fix/*`: バグ修正用のブランチ

---

## 🚨 注意事項

1. **機密情報の確認**
   - `.env.local`、`.env.production`などの機密情報を含むファイルがコミットされていないか確認
   - `google_credentials.txt`のような機密情報ファイルが削除されているか確認

2. **大きなファイルの確認**
   - 大きなバイナリファイルがコミットされていないか確認
   - 必要に応じてGit LFSを使用

3. **履歴の確認**
   - 機密情報が過去のコミットに含まれていないか確認
   - 必要に応じて`git filter-branch`またはBFG Repo-Cleanerを使用

---

## 📚 参考資料

- [Git Documentation](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Branching Model](https://nvie.com/posts/a-successful-git-branching-model/)
