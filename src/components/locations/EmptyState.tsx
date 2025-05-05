type EmptyStateProps = {
  onAddLocation: () => void;
};

export default function EmptyState({ onAddLocation }: EmptyStateProps) {
  return (
    <div className="text-center">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">店舗が登録されていません</h3>
      <p className="mt-1 text-sm text-gray-500">
        最初の店舗を登録して、レビュー返信の自動化を始めましょう。
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onAddLocation}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          新規店舗を追加
        </button>
      </div>
    </div>
  );
} 