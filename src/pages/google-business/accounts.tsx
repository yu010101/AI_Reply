import React, { useState, useRef, useEffect } from 'react';

export default function GoogleBusinessAccountsPage() {
  const [isRequesting, setIsRequesting] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const requestTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchAccounts = async () => {
    if (isRequesting) {
      console.log('[GoogleBusinessAPI] リクエスト処理中です');
      return;
    }

    if (requestTimeoutRef.current) {
      console.log('[GoogleBusinessAPI] 前回のリクエストから1分経過していません');
      return;
    }

    try {
      setIsRequesting(true);
      const response = await fetch('/api/google-business/accounts');
      const data = await response.json();

      if (response.status === 429) {
        console.log('[GoogleBusinessAPI] レート制限により待機します:', data.retryAfter);
        requestTimeoutRef.current = setTimeout(() => {
          requestTimeoutRef.current = undefined;
        }, data.retryAfter * 1000);
        return;
      }

      if (data.accounts) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error('[GoogleBusinessAPI] エラー:', error);
      setError('アカウント情報の取得に失敗しました');
    } finally {
      setIsRequesting(false);
    }
  };

  // コンポーネントのアンマウント時にタイムアウトをクリア
  useEffect(() => {
    return () => {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div>
      <h1>Google Business Accounts</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button onClick={fetchAccounts} disabled={isRequesting}>
        {isRequesting ? '取得中...' : 'アカウントを取得'}
      </button>
      <ul>
        {accounts.map((account, index) => (
          <li key={index}>{account.name || account.accountName}</li>
        ))}
      </ul>
    </div>
  );
}
