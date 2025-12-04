#!/usr/bin/env node
/**
 * console.log/error/warnをloggerに置き換えるスクリプト
 * 
 * 使用方法:
 *   node scripts/migrate-console-to-logger.js <file-path>
 * 
 * 注意: このスクリプトは自動置換を行いますが、手動での確認と調整が必要です。
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('使用方法: node scripts/migrate-console-to-logger.js <file-path>');
  process.exit(1);
}

const fullPath = path.resolve(filePath);

if (!fs.existsSync(fullPath)) {
  console.error(`ファイルが見つかりません: ${fullPath}`);
  process.exit(1);
}

let content = fs.readFileSync(fullPath, 'utf8');
let modified = false;

// loggerのインポートを追加（まだ存在しない場合）
if (!content.includes("import { logger }") && !content.includes("from '@/utils/logger'")) {
  // 最後のimport文の後に追加
  const importMatch = content.match(/(import\s+.*?from\s+['"].*?['"];?\s*\n)+/);
  if (importMatch) {
    const lastImport = importMatch[0].trim().split('\n').pop();
    const importIndex = content.lastIndexOf(lastImport) + lastImport.length;
    content = content.slice(0, importIndex) + 
      "\nimport { logger } from '@/utils/logger';" + 
      content.slice(importIndex);
    modified = true;
  }
}

// console.log を logger.debug または logger.info に置き換え
const logPatterns = [
  // console.log('[Tag] message', data) -> logger.debug('Tag: message', data)
  {
    pattern: /console\.log\(['"](\[?)([^\]]+)(\]?):\s*([^'"]+)['"],\s*({[^}]+})\)/g,
    replacement: (match, bracket1, tag, bracket2, message, data) => {
      const cleanTag = tag.replace(/\[|\]/g, '').trim();
      const cleanMessage = message.trim();
      return `logger.debug('${cleanTag}: ${cleanMessage}', ${data})`;
    }
  },
  // console.error('[Tag] message', data) -> logger.error('Tag: message', data)
  {
    pattern: /console\.error\(['"](\[?)([^\]]+)(\]?):\s*([^'"]+)['"],\s*({[^}]+})\)/g,
    replacement: (match, bracket1, tag, bracket2, message, data) => {
      const cleanTag = tag.replace(/\[|\]/g, '').trim();
      const cleanMessage = message.trim();
      return `logger.error('${cleanTag}: ${cleanMessage}', ${data})`;
    }
  },
  // console.warn('[Tag] message', data) -> logger.warn('Tag: message', data)
  {
    pattern: /console\.warn\(['"](\[?)([^\]]+)(\]?):\s*([^'"]+)['"],\s*({[^}]+})\)/g,
    replacement: (match, bracket1, tag, bracket2, message, data) => {
      const cleanTag = tag.replace(/\[|\]/g, '').trim();
      const cleanMessage = message.trim();
      return `logger.warn('${cleanTag}: ${cleanMessage}', ${data})`;
    }
  },
  // console.error('message', error) -> logger.error('message', { error })
  {
    pattern: /console\.error\(['"]([^'"]+)['"],\s*(\w+)\)/g,
    replacement: (match, message, errorVar) => {
      return `logger.error('${message}', { error: ${errorVar} })`;
    }
  },
];

for (const { pattern, replacement } of logPatterns) {
  const newContent = content.replace(pattern, replacement);
  if (newContent !== content) {
    content = newContent;
    modified = true;
  }
}

if (modified) {
  // バックアップを作成
  const backupPath = fullPath + '.backup';
  fs.writeFileSync(backupPath, fs.readFileSync(fullPath));
  console.log(`バックアップを作成しました: ${backupPath}`);
  
  // 変更を書き込み
  fs.writeFileSync(fullPath, content);
  console.log(`ファイルを更新しました: ${fullPath}`);
  console.log('⚠️  手動での確認と調整が必要です。');
} else {
  console.log('変更はありませんでした。');
}
