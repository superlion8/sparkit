export default function LoadingSpinner({ text = "加载中..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-primary-600">
      <div className="h-12 w-12">
        <svg className="animate-spin text-primary-500" viewBox="0 0 50 50">
          <circle
            className="opacity-25"
            cx="25"
            cy="25"
            r="20"
            stroke="currentColor"
            strokeWidth="5"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M25 5a20 20 0 00-4 39.6v-5.1a15 15 0 114-29.4V5z"
          />
        </svg>
      </div>
      <p className="mt-4 text-sm font-medium">{text}</p>
    </div>
  );
}
