import { Plan } from '@/constants/plan';

// 使用量タイプの定義
export type MetricType = 'location' | 'review' | 'ai_reply';

// 使用量記録のインターフェース
export interface UsageMetric {
  id: string;
  tenant_id: string;
  metric_name: MetricType;
  count: number;
  month: string;
  year: number;
  created_at: string;
  updated_at: string;
}

// 使用量の記録
export const recordUsage = async (metricName: MetricType, count: number = 1) => {
  try {
    const response = await fetch('/api/usage-metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metric_name: metricName,
        count,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 403 && errorData.limitExceeded) {
        throw {
          limitExceeded: true,
          currentUsage: errorData.currentUsage,
          limit: errorData.limit,
          message: errorData.error || '使用量制限を超えています',
        };
      }
      throw new Error(errorData.error || '使用量の記録に失敗しました');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('使用量記録エラー:', error);
    throw error;
  }
};

// 使用量の取得
export const getUserMetrics = async (
  metricName?: MetricType, 
  month?: string, 
  year?: number
) => {
  try {
    let url = '/api/usage-metrics?';
    const params = new URLSearchParams();
    
    if (metricName) {
      params.append('metric', metricName);
    }
    
    if (month) {
      params.append('month', month);
    }
    
    if (year) {
      params.append('year', year.toString());
    }
    
    url += params.toString();

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '使用量の取得に失敗しました');
    }

    const data = await response.json();
    return data as UsageMetric[];
  } catch (error) {
    console.error('使用量取得エラー:', error);
    throw error;
  }
};

// 制限に対する使用率を計算
export const calculateUsagePercentage = (current: number, limit: number): number => {
  if (limit <= 0) return 100;
  const percentage = (current / limit) * 100;
  return Math.min(percentage, 100);
};

// 使用状況のステータスを取得
export const getUsageStatus = (percentage: number): 'success' | 'warning' | 'error' => {
  if (percentage < 70) return 'success';
  if (percentage < 90) return 'warning';
  return 'error';
}; 