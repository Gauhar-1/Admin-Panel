export default function SkeletonLoader({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-fade-in">
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <div className="skeleton h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-t border-border">
                {Array.from({ length: cols }).map((_, colIdx) => (
                  <td key={colIdx} className="px-4 py-3">
                    <div
                      className="skeleton h-4"
                      style={{ width: `${60 + Math.random() * 40}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
