type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
};

export default function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-t-2 border-gray-200 border-t-indigo-600`}
      />
    </div>
  );
} 