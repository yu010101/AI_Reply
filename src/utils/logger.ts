/**
 * 統一ロガーユーティリティ
 * 
 * 本番環境でのログ出力を適切に管理し、機密情報の漏洩を防ぎます。
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  [key: string]: any;
}

interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
  filterSensitiveData: boolean;
}

// 機密情報のパターン（正規表現）
const SENSITIVE_PATTERNS = [
  // APIキー
  /(api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
  /(secret[_-]?key|secretkey)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
  
  // トークン
  /(token|access[_-]?token|refresh[_-]?token)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
  /(bearer\s+)([a-zA-Z0-9_\-\.]{20,})/gi,
  
  // パスワード
  /(password|passwd|pwd)\s*[:=]\s*['"]?([^\s'"]+)['"]?/gi,
  
  // 認証情報
  /(authorization|auth)\s*[:=]\s*['"]?([^\s'"]+)['"]?/gi,
  
  // Stripeキー
  /(sk_|pk_|whsec_)([a-zA-Z0-9_\-]{20,})/g,
  
  // OpenAIキー
  /(sk-)([a-zA-Z0-9_\-]{20,})/g,
  
  // Supabaseキー
  /(eyJ[a-zA-Z0-9_\-\.]+)/g, // JWT形式のトークン
  
  // クレジットカード情報
  /(card[_-]?number|cc[_-]?number)\s*[:=]\s*['"]?(\d{13,19})['"]?/gi,
  /(cvv|cvc)\s*[:=]\s*['"]?(\d{3,4})['"]?/gi,
  
  // メールアドレス（オプション - 必要に応じて有効化）
  // /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
];

// 機密情報をマスクする関数
function maskSensitiveData(data: any): any {
  if (typeof data === 'string') {
    let masked = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      masked = masked.replace(pattern, (match, prefix, value) => {
        if (value && value.length > 8) {
          return `${prefix || ''}${value.substring(0, 4)}***${value.substring(value.length - 4)}`;
        }
        return '***';
      });
    }
    return masked;
  }
  
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(item => maskSensitiveData(item));
    }
    
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      // キー名に機密情報を示す単語が含まれている場合
      const isSensitiveKey = /(password|secret|key|token|auth|credential|api[_-]?key)/i.test(key);
      
      if (isSensitiveKey && typeof value === 'string' && value.length > 8) {
        masked[key] = `${value.substring(0, 4)}***${value.substring(value.length - 4)}`;
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  
  return data;
}

// 環境に応じた設定
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const defaultConfig: LoggerConfig = {
  level: isProduction ? LogLevel.INFO : LogLevel.DEBUG,
  enableColors: !isProduction,
  enableTimestamp: true,
  filterSensitiveData: true,
};

class Logger {
  private config: LoggerConfig;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }
  
  /**
   * ログレベルを設定
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
  
  /**
   * 機密情報フィルタリングを有効/無効化
   */
  setFilterSensitiveData(enabled: boolean): void {
    this.config.filterSensitiveData = enabled;
  }
  
  /**
   * ログを出力するかどうかを判定
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }
  
  /**
   * ログメッセージをフォーマット
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = this.config.enableTimestamp
      ? new Date().toISOString()
      : '';
    
    const levelName = LogLevel[level];
    const prefix = timestamp
      ? `[${timestamp}] [${levelName}]`
      : `[${levelName}]`;
    
    let formattedMessage = `${prefix} ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      // 機密情報をフィルタリング
      const safeContext = this.config.filterSensitiveData
        ? maskSensitiveData(context)
        : context;
      
      const contextStr = JSON.stringify(safeContext, null, isDevelopment ? 2 : 0);
      formattedMessage += `\n${contextStr}`;
    }
    
    return formattedMessage;
  }
  
  /**
   * ログを出力
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }
    
    const formattedMessage = this.formatMessage(level, message, context);
    
    // ログレベルに応じた出力方法
    switch (level) {
      case LogLevel.DEBUG:
        if (this.config.enableColors) {
          console.debug(`\x1b[36m${formattedMessage}\x1b[0m`); // Cyan
        } else {
          console.debug(formattedMessage);
        }
        break;
        
      case LogLevel.INFO:
        if (this.config.enableColors) {
          console.info(`\x1b[32m${formattedMessage}\x1b[0m`); // Green
        } else {
          console.info(formattedMessage);
        }
        break;
        
      case LogLevel.WARN:
        if (this.config.enableColors) {
          console.warn(`\x1b[33m${formattedMessage}\x1b[0m`); // Yellow
        } else {
          console.warn(formattedMessage);
        }
        break;
        
      case LogLevel.ERROR:
        if (this.config.enableColors) {
          console.error(`\x1b[31m${formattedMessage}\x1b[0m`); // Red
        } else {
          console.error(formattedMessage);
        }
        break;
    }
  }
  
  /**
   * DEBUGレベルのログ
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  /**
   * INFOレベルのログ
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  /**
   * WARNレベルのログ
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  /**
   * ERRORレベルのログ
   */
  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }
  
  /**
   * エラーオブジェクトをログに記録
   */
  errorWithStack(error: Error, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      message: error.message,
      name: error.name,
      ...(isDevelopment && { stack: error.stack }),
    };
    
    this.log(LogLevel.ERROR, error.message, errorContext);
  }
}

// シングルトンインスタンス
export const logger = new Logger();

// 便利なエクスポート
export default logger;

// 既存のconsole.logを段階的に置き換えるためのヘルパー
export const log = {
  debug: (message: string, ...args: any[]) => {
    logger.debug(message, args.length > 0 ? { data: args } : undefined);
  },
  info: (message: string, ...args: any[]) => {
    logger.info(message, args.length > 0 ? { data: args } : undefined);
  },
  warn: (message: string, ...args: any[]) => {
    logger.warn(message, args.length > 0 ? { data: args } : undefined);
  },
  error: (message: string, ...args: any[]) => {
    logger.error(message, args.length > 0 ? { data: args } : undefined);
  },
};
