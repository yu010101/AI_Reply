import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { TONE_OPTIONS } from '@/constants/tone';
import { Location, LocationFormData } from '@/types/location';

type LocationFormProps = {
  location?: Location;
  onClose: () => void;
  onSuccess: () => void;
};

export default function LocationForm({ location, onClose, onSuccess }: LocationFormProps) {
  const [formData, setFormData] = useState<LocationFormData>({
    name: location?.name || '',
    tone: location?.tone || 'formal',
    line_user_id: location?.line_user_id || '',
    google_place_id: location?.google_place_id || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('認証エラーが発生しました');

      if (location) {
        // 更新
        const { error } = await supabase
          .from('locations')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', location.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // 新規作成
        const { error } = await supabase
          .from('locations')
          .insert({
            ...formData,
            user_id: user.id,
          });

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      setError('店舗情報の保存に失敗しました');
      console.error('店舗情報の保存エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {location ? '店舗情報の編集' : '新規店舗の追加'}
          </h3>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                店舗名
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">
                トーン
              </label>
              <select
                id="tone"
                value={formData.tone}
                onChange={(e) => setFormData({ ...formData, tone: e.target.value as Tone })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                {TONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="line_user_id" className="block text-sm font-medium text-gray-700 mb-1">
                LINEユーザーID
              </label>
              <input
                type="text"
                id="line_user_id"
                value={formData.line_user_id}
                onChange={(e) => setFormData({ ...formData, line_user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="google_place_id" className="block text-sm font-medium text-gray-700 mb-1">
                Google Place ID
              </label>
              <input
                type="text"
                id="google_place_id"
                value={formData.google_place_id}
                onChange={(e) => setFormData({ ...formData, google_place_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="例: ChIJN1t_tDeuEmsRUsoyG83frY4"
              />
              <p className="mt-1 text-sm text-gray-500">
                Google Places APIで使用する店舗IDです。
                <a
                  href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  詳細はこちら
                </a>
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 