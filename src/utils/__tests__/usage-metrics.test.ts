import { recordUsage, getUserMetrics, calculateUsagePercentage, getUsageStatus } from '../usage-metrics';

// グローバルのfetchをモック
const mockFetch = global.fetch as jest.Mock;

describe('使用量メトリクスユーティリティ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateUsagePercentage', () => {
    it('使用率を正しく計算する', () => {
      expect(calculateUsagePercentage(50, 100)).toBe(50);
      expect(calculateUsagePercentage(75, 100)).toBe(75);
      expect(calculateUsagePercentage(0, 100)).toBe(0);
    });

    it('使用率が100%を超える場合は100%に制限する', () => {
      expect(calculateUsagePercentage(150, 100)).toBe(100);
    });

    it('制限が0以下の場合は100%を返す', () => {
      expect(calculateUsagePercentage(50, 0)).toBe(100);
      expect(calculateUsagePercentage(50, -10)).toBe(100);
    });
  });

  describe('getUsageStatus', () => {
    it('使用率に応じた適切なステータスを返す', () => {
      expect(getUsageStatus(0)).toBe('success');
      expect(getUsageStatus(50)).toBe('success');
      expect(getUsageStatus(69)).toBe('success');
      expect(getUsageStatus(70)).toBe('warning');
      expect(getUsageStatus(80)).toBe('warning');
      expect(getUsageStatus(89)).toBe('warning');
      expect(getUsageStatus(90)).toBe('error');
      expect(getUsageStatus(100)).toBe('error');
    });
  });

  describe('recordUsage', () => {
    it('使用量を記録するAPIを正しく呼び出す', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: { id: '123', metric_name: 'review', count: 10 },
          currentUsage: 10,
          limit: 100
        })
      });

      const result = await recordUsage('review', 10);
      
      expect(mockFetch).toHaveBeenCalledWith('/api/usage-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metric_name: 'review',
          count: 10,
        }),
      });
      
      expect(result).toEqual({
        success: true,
        data: { id: '123', metric_name: 'review', count: 10 },
        currentUsage: 10,
        limit: 100
      });
    });

    it('使用量制限エラーを適切に処理する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: jest.fn().mockResolvedValueOnce({
          error: '使用量制限を超えています',
          limitExceeded: true,
          currentUsage: 100,
          limit: 100
        })
      });

      await expect(recordUsage('review')).rejects.toEqual({
        limitExceeded: true,
        currentUsage: 100,
        limit: 100,
        message: '使用量制限を超えています'
      });
    });

    it('一般的なエラーを適切に処理する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({
          error: '認証エラー'
        })
      });

      await expect(recordUsage('review')).rejects.toThrow('認証エラー');
    });
  });

  describe('getUserMetrics', () => {
    it('使用量データを取得するAPIを正しく呼び出す', async () => {
      const mockMetrics = [
        { id: '1', metric_name: 'review', count: 50 },
        { id: '2', metric_name: 'review', count: 30 }
      ];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockMetrics)
      });

      const result = await getUserMetrics('review', '05', 2023);
      
      expect(mockFetch).toHaveBeenCalledWith('/api/usage-metrics?metric=review&month=05&year=2023');
      expect(result).toEqual(mockMetrics);
    });

    it('引数がない場合はすべての使用量データを取得する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce([])
      });

      await getUserMetrics();
      
      expect(mockFetch).toHaveBeenCalledWith('/api/usage-metrics?');
    });

    it('APIエラーを適切に処理する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({
          error: 'データの取得に失敗しました'
        })
      });

      await expect(getUserMetrics()).rejects.toThrow('データの取得に失敗しました');
    });
  });
}); 