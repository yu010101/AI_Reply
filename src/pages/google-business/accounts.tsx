import React, { useState, useRef, useEffect } from 'react';

const [isRequesting, setIsRequesting] = useState(false);
const requestTimeoutRef = useRef<NodeJS.Timeout>();

const fetchAccounts = async () => {
  try {
    // 既にリクエスト中の場合は処理をスキップ
    if (isRequesting) {
      console.log('[GoogleBusinessAccounts] リクエスト中です。処理をスキップします');
      return;
    }

    // 前回のリクエストから1分以内の場合は処理をスキップ
    if (requestTimeoutRef.current) {
      console.log('[GoogleBusinessAccounts] 前回のリクエストから1分以内です。処理をスキップします');
      return;
    }

    console.log('[GoogleBusinessAccounts] アカウント情報の取得を開始します');
    setLoading(true);
    setError(null);
    setIsRequesting(true);

    const response = await fetch('/api/google-business/accounts');
    console.log('[GoogleBusinessAccounts] API応答:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[GoogleBusinessAccounts] APIエラー:', {
        status: response.status,
        error: errorData
      });
      throw new Error(errorData.message || 'アカウント情報の取得に失敗しました');
    }

    const data = await response.json();
    console.log('[GoogleBusinessAccounts] 取得したアカウント情報:', {
      count: data.length,
      accounts: data
    });

    setAccounts(data);

    // 1分間のクールダウンを設定
    requestTimeoutRef.current = setTimeout(() => {
      requestTimeoutRef.current = undefined;
    }, 60000);

  } catch (err: any) {
    console.error('[GoogleBusinessAccounts] エラー発生:', {
      message: err.message,
      stack: err.stack
    });
    setError(err.message);
  } finally {
    setLoading(false);
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