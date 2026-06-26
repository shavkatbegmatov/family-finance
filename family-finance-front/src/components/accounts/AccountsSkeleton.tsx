/**
 * Hisoblar sahifasi dastlabki yuklanish skeleti (header + KPI + filtrlar + grid).
 * Original AccountsPage skeleti bilan bir xil.
 */
export function AccountsSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-8 w-48" />
          <div className="skeleton mt-2 h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-9 w-9" />
          <div className="skeleton h-9 w-32" />
        </div>
      </div>

      {/* KPI skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="skeleton h-4 w-24" />
                <div className="skeleton mt-3 h-8 w-32" />
              </div>
              <div className="skeleton h-12 w-12 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-3">
        <div className="skeleton h-12 flex-1" />
        <div className="skeleton h-12 w-44" />
        <div className="skeleton h-12 w-40" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="surface-card p-5 pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="skeleton h-12 w-12 rounded-2xl" />
              <div className="skeleton h-5 w-16" />
            </div>
            <div className="skeleton h-5 w-3/4 mb-1" />
            <div className="skeleton h-3 w-1/2 mb-4" />
            <div className="skeleton h-20 w-full rounded-xl mb-3" />
            <div className="skeleton h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
