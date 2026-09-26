import { useEffect, useRef, useState } from 'react'
import { CheckSquare, ChevronDown, ChevronUp, Code2, GripVertical, List, ListOrdered, MessageSquareQuote, Minus, Pilcrow, Plus, Trash2, Type } from 'lucide-react'
import type { BlockType, Json, PageBlock } from '../../types/database.types'

const blockOptions: Array<{ type: BlockType; label: string; icon: React.ReactNode }> = [
  { type: 'paragraph', label: 'Text', icon: <Pilcrow size={14} /> },
  { type: 'heading_1', label: 'Heading 1', icon: <Type size={14} /> },
  { type: 'heading_2', label: 'Heading 2', icon: <Type size={14} /> },
  { type: 'heading_3', label: 'Heading 3', icon: <Type size={14} /> },
  { type: 'bulleted_list', label: 'Bulleted list', icon: <List size={14} /> },
  { type: 'numbered_list', label: 'Numbered list', icon: <ListOrdered size={14} /> },
  { type: 'todo', label: 'To-do', icon: <CheckSquare size={14} /> },
  { type: 'quote', label: 'Quote', icon: <MessageSquareQuote size={14} /> },
  { type: 'callout', label: 'Callout', icon: <MessageSquareQuote size={14} /> },
  { type: 'code', label: 'Code', icon: <Code2 size={14} /> },
  { type: 'divider', label: 'Divider', icon: <Minus size={14} /> },
]

function contentObject(content: Json) {
  return content && typeof content === 'object' && !Array.isArray(content) ? content as Record<string, Json | undefined> : {}
}

export function PageBlockEditor({
  block,
  index,
  total,
  readOnly,
  onChange,
  onCreateAfter,
  onDelete,
  onMove,
}: {
  block: PageBlock
  index: number
  total: number
  readOnly: boolean
  onChange: (block: PageBlock, patch: Partial<Pick<PageBlock, 'block_type' | 'content'>>) => void
  onCreateAfter: (block: PageBlock) => void
  onDelete: (block: PageBlock) => void
  onMove: (block: PageBlock, direction: -1 | 1) => void
}) {
  const content = contentObject(block.content)
  const rawText = typeof content.text === 'string' ? content.text : ''
  const rawChecked = content.checked === true
  const [text, setText] = useState(rawText)
  const [checked, setChecked] = useState(rawChecked)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    setText(rawText)
    setChecked(rawChecked)
  }, [block.id, rawText, rawChecked])

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  function save(nextText = text, nextChecked = checked) {
    if (readOnly) return
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onChange(block, { content: { text: nextText, checked: nextChecked } }), 300)
  }

  function changeText(next: string) {
    setText(next)
    save(next, checked)
  }

  function changeChecked(next: boolean) {
    setChecked(next)
    save(text, next)
  }

  const common = 'notion-block-input w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none placeholder:text-neutral-300'
  const rows = Math.max(1, text.split('\n').length)
  const textArea = <textarea
    value={text}
    rows={rows}
    readOnly={readOnly}
    placeholder={block.block_type === 'paragraph' ? "Type '/' for commands" : ''}
    onChange={(event) => changeText(event.target.value)}
    onKeyDown={(event) => {
      if (readOnly) return
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onCreateAfter(block) }
      if (event.key === 'Backspace' && !text && total > 1) { event.preventDefault(); onDelete(block) }
    }}
    className={`${common} ${block.block_type === 'heading_1' ? 'text-[2rem] font-bold leading-tight' : block.block_type === 'heading_2' ? 'text-2xl font-semibold leading-tight' : block.block_type === 'heading_3' ? 'text-xl font-semibold' : block.block_type === 'code' ? 'font-mono text-[13px]' : 'text-[15px] leading-7'}`}
  />

  return <div className="group relative flex min-h-8 items-start gap-1 rounded px-1 py-0.5 hover:bg-neutral-50/60">
    {!readOnly ? <div className="absolute -left-16 top-1 hidden items-center gap-0.5 rounded bg-white shadow-sm ring-1 ring-neutral-200 group-hover:flex">
      <button title="Add block" onClick={() => onCreateAfter(block)} className="p-1 text-neutral-400 hover:text-neutral-800"><Plus size={14} /></button>
      <span className="cursor-grab p-1 text-neutral-300"><GripVertical size={14} /></span>
    </div> : null}
    <div className="min-w-0 flex-1">
      {block.block_type === 'divider' ? <div className="py-3"><hr className="border-neutral-200" /></div> : null}
      {block.block_type === 'todo' ? <label className="flex items-start gap-2"><input type="checkbox" className="mt-1.5" checked={checked} disabled={readOnly} onChange={(event) => changeChecked(event.target.checked)} />{textArea}</label> : null}
      {block.block_type === 'bulleted_list' ? <div className="flex gap-2"><span className="mt-1.5">•</span>{textArea}</div> : null}
      {block.block_type === 'numbered_list' ? <div className="flex gap-2"><span className="mt-1.5 min-w-5 text-right text-neutral-500">{index + 1}.</span>{textArea}</div> : null}
      {block.block_type === 'quote' ? <div className="border-l-4 border-neutral-800 pl-3">{textArea}</div> : null}
      {block.block_type === 'callout' ? <div className="rounded-md bg-neutral-100 px-3 py-2">{textArea}</div> : null}
      {block.block_type === 'code' ? <div className="rounded-md bg-neutral-100 px-3 py-2">{textArea}</div> : null}
      {!['divider','todo','bulleted_list','numbered_list','quote','callout','code'].includes(block.block_type) ? textArea : null}
    </div>
    {!readOnly ? <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
      <select aria-label="Block type" value={block.block_type} onChange={(event) => onChange(block, { block_type: event.target.value as BlockType })} className="h-7 max-w-24 rounded border border-transparent bg-transparent px-1 text-[10px] text-neutral-400 outline-none hover:border-neutral-200 hover:bg-white">
        {blockOptions.map((option) => <option key={option.type} value={option.type}>{option.label}</option>)}
      </select>
      <button disabled={index === 0} onClick={() => onMove(block, -1)} className="rounded p-1 text-neutral-300 hover:bg-white hover:text-neutral-700 disabled:opacity-20"><ChevronUp size={13} /></button>
      <button disabled={index === total - 1} onClick={() => onMove(block, 1)} className="rounded p-1 text-neutral-300 hover:bg-white hover:text-neutral-700 disabled:opacity-20"><ChevronDown size={13} /></button>
      <button onClick={() => onDelete(block)} className="rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
    </div> : null}
  </div>
}
