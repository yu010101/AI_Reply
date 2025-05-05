# コントリビューションガイド

## はじめに

RevAI Conciergeプロジェクトへの貢献を歓迎します。このガイドは、プロジェクトへの貢献方法を説明します。

## 貢献の種類

1. **バグレポート**
   - 問題の詳細な説明
   - 再現手順
   - 期待される動作
   - 実際の動作

2. **機能リクエスト**
   - 機能の説明
   - 使用例
   - 実装の提案

3. **コード貢献**
   - バグ修正
   - 新機能の実装
   - ドキュメントの改善
   - テストの追加

## 開発環境のセットアップ

1. **リポジトリのフォーク**
   ```bash
   git clone https://github.com/your-username/revai-concierge.git
   cd revai-concierge
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   ```

3. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

## コーディング規約

### コードスタイル

- **TypeScript**
  - 厳格な型チェックを使用
  - インターフェースと型を適切に使用
  - 非同期処理はasync/awaitを使用

- **React**
  - 関数コンポーネントを使用
  - Hooksを適切に使用
  - コンポーネントは小規模に保つ

- **スタイリング**
  - Tailwind CSSを使用
  - カスタムスタイルは最小限に
  - レスポンシブデザインを考慮

### コミットメッセージ

```
<type>(<scope>): <subject>

<body>

<footer>
```

**タイプ**
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント
- style: フォーマット
- refactor: リファクタリング
- test: テスト
- chore: ビルド

**例**
```
feat(auth): パスワードリセット機能の追加

- パスワードリセットメールの送信
- リセットトークンの検証
- 新しいパスワードの設定

Closes #123
```

## プルリクエストの手順

1. **ブランチの作成**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **変更のコミット**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. **プッシュ**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **プルリクエストの作成**
   - タイトルと説明を追加
   - 関連するIssueをリンク
   - レビュアーをアサイン

## テスト

### テストの実行

```bash
# すべてのテスト
npm test

# 特定のテスト
npm test -- path/to/test

# カバレッジ
npm run test:coverage
```

### テストの作成

```typescript
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## ドキュメント

### ドキュメントの更新

1. **APIドキュメント**
   - エンドポイントの説明
   - リクエスト/レスポンスの例
   - エラーケース

2. **開発ガイド**
   - セットアップ手順
   - アーキテクチャの説明
   - ベストプラクティス

3. **ユーザーガイド**
   - 機能の説明
   - 使用方法
   - トラブルシューティング

## レビュープロセス

1. **コードレビュー**
   - コードの品質
   - パフォーマンス
   - セキュリティ
   - テストカバレッジ

2. **ドキュメントレビュー**
   - 正確性
   - 完全性
   - 読みやすさ

3. **CI/CDチェック**
   - ビルド
   - テスト
   - リント
   - 型チェック

## コミュニケーション

### Issueの作成

1. **バグレポート**
   ```
   タイトル: [Bug] 問題の簡単な説明

   説明:
   - 問題の詳細
   - 再現手順
   - 期待される動作
   - 実際の動作
   - 環境情報
   ```

2. **機能リクエスト**
   ```
   タイトル: [Feature] 機能の簡単な説明

   説明:
   - 機能の詳細
   - 使用例
   - 実装の提案
   - 関連するIssue
   ```

### ディスカッション

- GitHub Discussions
- Slackチャンネル
- 定期的なミーティング

## ライセンス

このプロジェクトは[MITライセンス](./LICENSE)の下で公開されています。貢献者は、貢献したコードが同じライセンスの下で公開されることに同意するものとします。

## 行動規範

1. **尊重**
   - 他の貢献者を尊重
   - 建設的なフィードバック
   - 多様性の尊重

2. **協力**
   - オープンなコミュニケーション
   - 知識の共有
   - 相互支援

3. **責任**
   - コードの品質
   - セキュリティ
   - ドキュメント

## 謝辞

プロジェクトへの貢献に感謝します。あなたの貢献が、RevAI Conciergeをより良いものにすることを願っています。 