import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { generateReply } from '@/utils/openai';
import { sendLineNotification, formatReplyNotification } from '@/utils/line';
import { ReplyFormData } from '@/types/reply';
import { ReviewStatus } from '@/types/review';
import { Tone } from '@/constants/tone';

type ReplyFormProps = {
  reviewId: string;
  reviewContent: string;
  reviewAuthor: string;
  locationId: string;
  locationTone: Tone;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ReplyForm({
  reviewId,
  reviewContent,
  reviewAuthor,
  locationId,
  locationTone,
  onClose,
  onSuccess,
}: ReplyFormProps) {
  const [formData, setFormData] = useState<ReplyFormData>({
    review_id: reviewId,
    content: '',
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const generatedContent = await generateReply(reviewContent, locationTone);
      setFormData({ ...formData, content: generatedContent });
    } catch (error) {
      setError('返信の生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('認証エラーが発生しました');

      const { error: replyError } = await supabase
        .from('replies')
        .insert(formData);

      if (replyError) throw replyError;

      const { error: reviewError } = await supabase
        .from('reviews')
        .update({ status: 'replied' as ReviewStatus })
        .eq('id', reviewId);

      if (reviewError) throw reviewError;

      // LINE通知を送信
      const { data: location } = await supabase
        .from('locations')
        .select('name, line_user_id')
        .eq('id', locationId)
        .single();

      if (location?.line_user_id) {
        await sendLineNotification(
          location.line_user_id,
          formatReplyNotification(location.name, reviewAuthor)
        );
      }

      onSuccess();
      onClose();
    } catch (error) {
      setError('返信の保存に失敗しました');
      console.error('返信の保存エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            レビューへの返信
          </h3>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                返信内容
              </label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                rows={4}
                required
              />
            </div>

            <div className="flex justify-between mb-4">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {generating ? '生成中...' : 'AIで生成'}
              </button>
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