export function SkeletonTable() {
  const columnWidths = [220, 160, 160, 180, 180]
  return (
    <div className="animate-pulse overflow-hidden border-t border-neutral-200">
      <div className="flex h-9 border-b border-neutral-200 bg-neutral-50/70">{columnWidths.map((width, index) => <div key={`header-${index}`} style={{ width }} className="shrink-0 border-r border-neutral-200 px-3 py-2"><div className="h-3 w-20 rounded bg-neutral-200" /></div>)}</div>
      {Array.from({ length: 10 }, (_, rowIndex) => <div key={rowIndex} className="flex h-10 border-b border-neutral-100">{columnWidths.map((width, columnIndex) => <div key={`cell-${rowIndex}-${columnIndex}`} style={{ width }} className="shrink-0 border-r border-neutral-100 px-3 py-3"><div className="h-3 w-2/3 rounded bg-neutral-100" /></div>)}</div>)}
    </div>
  )
}
