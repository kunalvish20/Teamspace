export function CheckboxCell({ value, disabled, onCommit }: { value: boolean; disabled?: boolean; onCommit: (value: boolean) => void }) {
  return <div className="grid h-full min-h-9 place-items-center"><input type="checkbox" disabled={disabled} checked={value} onChange={(event) => onCommit(event.target.checked)} className="h-4 w-4 rounded border-neutral-300 accent-neutral-900 disabled:cursor-default" /></div>
}
