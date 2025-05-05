# デザインガイド

## はじめに

このガイドでは、RevAI ConciergeのデザインシステムとUI/UXガイドラインについて説明します。

## デザインシステム

### カラーパレット

1. **プライマリーカラー**
   - メインカラー: `#2563EB` (Blue 600)
   - アクセントカラー: `#3B82F6` (Blue 500)
   - セカンダリーカラー: `#1E40AF` (Blue 800)

2. **ニュートラルカラー**
   - テキスト: `#1F2937` (Gray 800)
   - 背景: `#F9FAFB` (Gray 50)
   - ボーダー: `#E5E7EB` (Gray 200)

3. **ステータスカラー**
   - 成功: `#10B981` (Green 500)
   - 警告: `#F59E0B` (Yellow 500)
   - エラー: `#EF4444` (Red 500)

### タイポグラフィ

1. **フォントファミリー**
   - メインフォント: Inter
   - コードフォント: Fira Code
   - フォールバック: system-ui

2. **フォントサイズ**
   ```css
   :root {
     --text-xs: 0.75rem;    /* 12px */
     --text-sm: 0.875rem;   /* 14px */
     --text-base: 1rem;     /* 16px */
     --text-lg: 1.125rem;   /* 18px */
     --text-xl: 1.25rem;    /* 20px */
     --text-2xl: 1.5rem;    /* 24px */
     --text-3xl: 1.875rem;  /* 30px */
   }
   ```

3. **フォントウェイト**
   - 通常: 400
   - 中程度: 500
   - 太字: 600
   - 極太: 700

### スペーシング

1. **余白**
   ```css
   :root {
     --space-1: 0.25rem;  /* 4px */
     --space-2: 0.5rem;   /* 8px */
     --space-3: 0.75rem;  /* 12px */
     --space-4: 1rem;     /* 16px */
     --space-5: 1.25rem;  /* 20px */
     --space-6: 1.5rem;   /* 24px */
   }
   ```

2. **グリッドシステム**
   - 12カラムグリッド
   - レスポンシブブレークポイント
   - ガター幅: 1.5rem

### コンポーネント

1. **ボタン**
   ```typescript
   interface ButtonProps {
     variant: 'primary' | 'secondary' | 'outline';
     size: 'sm' | 'md' | 'lg';
     children: React.ReactNode;
     onClick?: () => void;
   }

   const Button: React.FC<ButtonProps> = ({
     variant,
     size,
     children,
     onClick,
   }) => (
     <button
       className={`btn btn-${variant} btn-${size}`}
       onClick={onClick}
     >
       {children}
     </button>
   );
   ```

2. **フォーム要素**
   - テキスト入力
   - セレクトボックス
   - チェックボックス
   - ラジオボタン

3. **カード**
   ```typescript
   interface CardProps {
     title: string;
     children: React.ReactNode;
   }

   const Card: React.FC<CardProps> = ({ title, children }) => (
     <div className="card">
       <h3 className="card-title">{title}</h3>
       <div className="card-content">{children}</div>
     </div>
   );
   ```

## UI/UXガイドライン

### レイアウト

1. **ページ構造**
   - ヘッダー
   - サイドバー
   - メインコンテンツ
   - フッター

2. **レスポンシブデザイン**
   ```css
   /* ブレークポイント */
   @media (min-width: 640px) { /* sm */ }
   @media (min-width: 768px) { /* md */ }
   @media (min-width: 1024px) { /* lg */ }
   @media (min-width: 1280px) { /* xl */ }
   ```

### インタラクション

1. **アニメーション**
   - トランジション: 0.2s ease-in-out
   - ホバーエフェクト
   - ローディングアニメーション

2. **フィードバック**
   - ローディング状態
   - エラーメッセージ
   - 成功メッセージ

### アクセシビリティ

1. **WCAG準拠**
   - コントラスト比: 4.5:1以上
   - キーボードナビゲーション
   - スクリーンリーダー対応

2. **ARIA属性**
   ```html
   <button
     aria-label="メニューを開く"
     aria-expanded="false"
     aria-controls="menu"
   >
     メニュー
   </button>
   ```

## デザインツール

### 使用ツール

1. **デザインツール**
   - Figma
   - Adobe XD
   - Sketch

2. **開発ツール**
   - Tailwind CSS
   - Storybook
   - Chromatic

### アセット管理

1. **画像アセット**
   - フォーマット: WebP, SVG
   - サイズ最適化
   - 遅延読み込み

2. **アイコン**
   - ライブラリ: Heroicons
   - サイズ: 24x24px
   - カラー: カレントカラー

## デザイン原則

### 一貫性

1. **コンポーネントの再利用**
   - 共通コンポーネント
   - デザインパターン
   - 命名規則

2. **スタイルガイド**
   - クラス命名規則
   - ファイル構造
   - コメント規約

### ユーザビリティ

1. **直感的な操作**
   - 明確なナビゲーション
   - 一貫したインタラクション
   - 適切なフィードバック

2. **効率的なワークフロー**
   - ショートカット
   - バッチ処理
   - 自動化

## デザインリソース

### テンプレート

1. **ページテンプレート**
   - ダッシュボード
   - フォーム
   - リストビュー

2. **コンポーネントテンプレート**
   - モーダル
   - アラート
   - トースト

### リソースリンク

1. **デザインシステム**
   - Figmaファイル
   - コンポーネントライブラリ
   - アイコンセット

2. **ドキュメント**
   - スタイルガイド
   - コンポーネント仕様
   - アクセシビリティガイド 