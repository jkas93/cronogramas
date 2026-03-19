export default function Loading() {
  return (
    <div className="p-8 max-w-full mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-4 bg-surface-800 rounded w-48 mb-4"></div>
          <div className="h-8 bg-surface-800 rounded w-96 mb-2"></div>
          <div className="h-4 bg-surface-800 rounded w-full max-w-md"></div>
        </div>
        <div className="h-8 bg-surface-800 rounded w-32"></div>
      </div>
      
      <div className="flex gap-2 mb-6">
        <div className="h-10 bg-surface-800 rounded w-24"></div>
        <div className="h-10 bg-surface-800 rounded w-32"></div>
        <div className="h-10 bg-surface-800 rounded w-40"></div>
        <div className="h-10 bg-surface-800 rounded w-24"></div>
      </div>

      <div className="h-[500px] bg-surface-900 rounded-xl border border-surface-800"></div>
    </div>
  );
}
