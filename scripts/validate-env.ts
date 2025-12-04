#!/usr/bin/env ts-node
/**
 * 環境変数バリデーションスクリプト
 * 
 * 起動時に必須環境変数の存在を確認し、不足している場合はエラーを出力します。
 * 
 * 使用方法:
 *   npm run validate-env
 *   または
 *   ts-node scripts/validate-env.ts
 */

interface EnvVarDefinition {
  name: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean | string;
  example?: string;
}

// 環境変数の定義
const envVarDefinitions: EnvVarDefinition[] = [
  // Supabase設定（必須）
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'SupabaseプロジェクトのURL',
    validate: (value) => {
      if (!value.startsWith('https://') || !value.includes('.supabase.co')) {
        return 'Supabase URLは https://*.supabase.co の形式である必要があります';
      }
      return true;
    },
    example: 'https://your-project.supabase.co',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase匿名キー（クライアントサイドで使用）',
    validate: (value) => {
      if (value.length < 50) {
        return 'Supabase匿名キーの形式が正しくない可能性があります';
      }
      return true;
    },
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabaseサービスロールキー（サーバーサイドのみ）',
    validate: (value) => {
      if (value.length < 50) {
        return 'Supabaseサービスロールキーの形式が正しくない可能性があります';
      }
      return true;
    },
  },
  
  // Stripe設定（必須）
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    required: true,
    description: 'Stripe公開可能キー（クライアントサイドで使用）',
    validate: (value) => {
      if (!value.startsWith('pk_')) {
        return 'Stripe公開可能キーは pk_ で始まる必要があります';
      }
      return true;
    },
    example: 'pk_test_...',
  },
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
    description: 'Stripeシークレットキー（サーバーサイドのみ）',
    validate: (value) => {
      if (!value.startsWith('sk_')) {
        return 'Stripeシークレットキーは sk_ で始まる必要があります';
      }
      return true;
    },
    example: 'sk_test_...',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    description: 'Stripe Webhookシークレット（Webhook検証用）',
    validate: (value) => {
      if (!value.startsWith('whsec_')) {
        return 'Stripe Webhookシークレットは whsec_ で始まる必要があります';
      }
      return true;
    },
    example: 'whsec_...',
  },
  
  // OpenAI設定（必須）
  {
    name: 'OPENAI_API_KEY',
    required: true,
    description: 'OpenAI APIキー',
    validate: (value) => {
      if (!value.startsWith('sk-')) {
        return 'OpenAI APIキーは sk- で始まる必要があります';
      }
      return true;
    },
    example: 'sk-...',
  },
  
  // Google OAuth設定（必須）
  {
    name: 'GOOGLE_CLIENT_ID',
    required: true,
    description: 'Google OAuth 2.0 クライアントID',
    validate: (value) => {
      if (!value.includes('.apps.googleusercontent.com')) {
        return 'Google OAuth クライアントIDの形式が正しくない可能性があります';
      }
      return true;
    },
    example: 'xxx.apps.googleusercontent.com',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: true,
    description: 'Google OAuth 2.0 クライアントシークレット',
    validate: (value) => {
      if (value.length < 20) {
        return 'Google OAuth クライアントシークレットの形式が正しくない可能性があります';
      }
      return true;
    },
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: true,
    description: 'アプリケーションのベースURL',
    validate: (value) => {
      if (!value.startsWith('http://') && !value.startsWith('https://')) {
        return 'アプリケーションURLは http:// または https:// で始まる必要があります';
      }
      return true;
    },
    example: 'https://your-domain.com',
  },
  
  // LINE設定（オプション）
  {
    name: 'LINE_CHANNEL_ACCESS_TOKEN',
    required: false,
    description: 'LINE Messaging API チャネルアクセストークン',
  },
  {
    name: 'LINE_CHANNEL_SECRET',
    required: false,
    description: 'LINE Messaging API チャネルシークレット',
  },
  
  // SMTP設定（オプション）
  {
    name: 'SMTP_HOST',
    required: false,
    description: 'SMTPサーバーのホスト名',
    example: 'smtp.gmail.com',
  },
  {
    name: 'SMTP_PORT',
    required: false,
    description: 'SMTPサーバーのポート番号',
    validate: (value) => {
      const port = parseInt(value, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return 'SMTPポートは1-65535の範囲の数値である必要があります';
      }
      return true;
    },
    example: '587',
  },
  {
    name: 'SMTP_USER',
    required: false,
    description: 'SMTP認証ユーザー名',
  },
  {
    name: 'SMTP_PASSWORD',
    required: false,
    description: 'SMTP認証パスワード',
  },
  {
    name: 'SMTP_SECURE',
    required: false,
    description: 'SMTP接続のセキュリティ設定（true/false）',
    validate: (value) => {
      if (value !== 'true' && value !== 'false') {
        return 'SMTP_SECUREは true または false である必要があります';
      }
      return true;
    },
    example: 'false',
  },
  
  // その他の設定（オプション）
  {
    name: 'NOTIFICATION_API_KEY',
    required: false,
    description: '通知APIキー',
  },
  {
    name: 'GOOGLE_API_KEY',
    required: false,
    description: 'Google Maps APIキー',
  },
];

/**
 * 環境変数をバリデーション
 */
function validateEnvironmentVariables(): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 本番環境かどうかを確認
  const isProduction = process.env.NODE_ENV === 'production';
  
  for (const def of envVarDefinitions) {
    const value = process.env[def.name];
    
    // 必須環境変数のチェック
    if (def.required && !value) {
      errors.push(`❌ 必須環境変数が設定されていません: ${def.name}`);
      if (def.description) {
        errors.push(`   ${def.description}`);
      }
      if (def.example) {
        errors.push(`   例: ${def.name}=${def.example}`);
      }
      continue;
    }
    
    // オプション環境変数が設定されている場合のみバリデーション
    if (!def.required && !value) {
      continue;
    }
    
    // 値のバリデーション
    if (value && def.validate) {
      const validationResult = def.validate(value);
      if (validationResult !== true) {
        errors.push(`❌ 環境変数の値が無効です: ${def.name}`);
        errors.push(`   ${validationResult}`);
        if (def.example) {
          errors.push(`   例: ${def.name}=${def.example}`);
        }
      }
    }
    
    // 本番環境での警告
    if (isProduction && def.name.startsWith('NEXT_PUBLIC_') && value) {
      // NEXT_PUBLIC_ で始まる変数はクライアントサイドで公開されるため、機密情報が含まれていないか確認
      const sensitivePatterns = [
        /secret/i,
        /password/i,
        /key/i,
        /token/i,
        /api[_-]?key/i,
      ];
      
      const hasSensitiveInfo = sensitivePatterns.some(pattern => 
        pattern.test(def.name) && !def.name.includes('PUBLISHABLE')
      );
      
      if (hasSensitiveInfo && value.length > 20) {
        warnings.push(`⚠️  警告: ${def.name} はクライアントサイドで公開されます。機密情報が含まれていないか確認してください。`);
      }
    }
  }
  
  // 本番環境での追加チェック
  if (isProduction) {
    // MOCK_GOOGLE_AUTHがtrueになっていないか確認
    if (process.env.MOCK_GOOGLE_AUTH === 'true') {
      errors.push('❌ 本番環境では MOCK_GOOGLE_AUTH を true に設定できません');
    }
    
    // 開発用の環境変数が設定されていないか確認
    if (process.env.DEV_USER_ID) {
      warnings.push('⚠️  警告: DEV_USER_ID が設定されています。本番環境では使用しないことを推奨します。');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * メイン処理
 */
function main() {
  console.log('🔍 環境変数のバリデーションを開始します...\n');
  
  const result = validateEnvironmentVariables();
  
  // 警告の表示
  if (result.warnings.length > 0) {
    console.log('⚠️  警告:');
    result.warnings.forEach(warning => console.log(`  ${warning}`));
    console.log('');
  }
  
  // エラーの表示
  if (result.errors.length > 0) {
    console.error('❌ 環境変数のバリデーションに失敗しました:\n');
    result.errors.forEach(error => console.error(`  ${error}`));
    console.error('\n💡 解決方法:');
    console.error('  1. .env.local ファイルを作成し、必要な環境変数を設定してください');
    console.error('  2. .env.example ファイルを参考にしてください');
    console.error('  3. 環境変数の設定方法については README.md を参照してください\n');
    process.exit(1);
  }
  
  // 成功メッセージ
  console.log('✅ 環境変数のバリデーションが成功しました\n');
  
  // 設定されている環境変数の一覧を表示（機密情報はマスク）
  console.log('📋 設定されている環境変数:');
  envVarDefinitions.forEach(def => {
    const value = process.env[def.name];
    if (value) {
      // 機密情報をマスク
      const maskedValue = def.name.includes('SECRET') || 
                         def.name.includes('KEY') || 
                         def.name.includes('PASSWORD') || 
                         def.name.includes('TOKEN')
        ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
        : value;
      console.log(`  ✓ ${def.name}=${maskedValue}`);
    } else if (!def.required) {
      console.log(`  ○ ${def.name} (未設定 - オプション)`);
    }
  });
  
  console.log('\n✨ すべての環境変数が正しく設定されています');
}

// スクリプトが直接実行された場合のみ実行
// Node.jsの実行方法を判定
const isMainModule = process.argv[1] && process.argv[1].endsWith('validate-env.ts');
if (isMainModule) {
  main();
}

export { validateEnvironmentVariables, envVarDefinitions };
