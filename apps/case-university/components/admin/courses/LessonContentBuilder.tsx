"use client";

import type { ReactNode } from "react";

import type {
  LessonCalloutBlock,
  LessonContentBlock,
  LessonContentDocument,
  LessonImageBlock,
  LessonKnowledgeCheckBlock,
  LessonListBlock,
  LessonTableBlock,
} from "@/lib/university/lesson-content";

type LessonContentBuilderProps = {
  value: LessonContentDocument;
  onChange: (value: LessonContentDocument) => void;
  disabled?: boolean;
};

type AddBlockType =
  | "heading"
  | "paragraph"
  | "key_concept"
  | "tip"
  | "warning"
  | "bulleted_list"
  | "numbered_list"
  | "example"
  | "image"
  | "table"
  | "knowledge_check"
  | "divider";

const ADD_BLOCKS: Array<{
  type: AddBlockType;
  label: string;
  description: string;
}> = [
  { type: "heading", label: "Heading", description: "Introduce a lesson section." },
  { type: "paragraph", label: "Paragraph", description: "Write explanatory lesson text." },
  { type: "key_concept", label: "Key concept", description: "Highlight an important idea." },
  { type: "tip", label: "Tip", description: "Add helpful learner guidance." },
  { type: "warning", label: "Warning", description: "Call out risk or caution." },
  { type: "bulleted_list", label: "Bulleted list", description: "Organize related points." },
  { type: "numbered_list", label: "Numbered list", description: "Show ordered steps." },
  { type: "example", label: "Example", description: "Demonstrate a concept in practice." },
  { type: "image", label: "Image / media", description: "Add an externally hosted visual." },
  { type: "table", label: "Table", description: "Compare structured information." },
  { type: "knowledge_check", label: "Knowledge check", description: "Ask a self-check question." },
  { type: "divider", label: "Divider", description: "Separate major sections." },
];

export default function LessonContentBuilder({
  value,
  onChange,
  disabled = false,
}: LessonContentBuilderProps) {
  function updateBlocks(blocks: LessonContentBlock[]) {
    onChange({
      version: 1,
      blocks,
    });
  }

  function addBlock(type: AddBlockType) {
    updateBlocks([...value.blocks, createBlock(type)]);
  }

  function updateBlock(index: number, block: LessonContentBlock) {
    const next = [...value.blocks];
    next[index] = block;
    updateBlocks(next);
  }

  function moveBlock(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= value.blocks.length) return;

    const next = [...value.blocks];
    [next[index], next[target]] = [next[target], next[index]];
    updateBlocks(next);
  }

  function duplicateBlock(index: number) {
    const original = value.blocks[index];
    const copy = cloneBlockWithNewId(original);
    const next = [...value.blocks];
    next.splice(index + 1, 0, copy);
    updateBlocks(next);
  }

  function removeBlock(index: number) {
    updateBlocks(value.blocks.filter((_, blockIndex) => blockIndex !== index));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 sm:p-5">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Add content block</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Build the lesson visually. Blocks are saved to the existing JSONB content field.
          </p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {ADD_BLOCKS.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => addBlock(item.type)}
              disabled={disabled}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3.5 py-3 text-left transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="block text-xs font-bold text-[var(--text-primary)]">{item.label}</span>
              <span className="mt-1 block text-[11px] leading-4 text-[var(--text-muted)]">{item.description}</span>
            </button>
          ))}
        </div>
      </div>

      {value.blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-5 py-10 text-center">
          <p className="text-sm font-bold text-[var(--text-primary)]">No lesson content yet</p>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-[var(--text-muted)]">
            Start with a heading or paragraph, then add examples, callouts, lists, visuals, tables, and knowledge checks.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {value.blocks.map((block, index) => (
            <BlockEditor
              key={block.id}
              block={block}
              index={index}
              total={value.blocks.length}
              disabled={disabled}
              onChange={(nextBlock) => updateBlock(index, nextBlock)}
              onMoveUp={() => moveBlock(index, "up")}
              onMoveDown={() => moveBlock(index, "down")}
              onDuplicate={() => duplicateBlock(index)}
              onRemove={() => removeBlock(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockEditor({
  block,
  index,
  total,
  disabled,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: {
  block: LessonContentBlock;
  index: number;
  total: number;
  disabled: boolean;
  onChange: (block: LessonContentBlock) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      <header className="flex flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-[var(--primary-soft)] px-2 text-[10px] font-black text-[var(--primary)]">{index + 1}</span>
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)]">{getBlockLabel(block)}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Content block</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <SmallButton label="Up" onClick={onMoveUp} disabled={disabled || index === 0} />
          <SmallButton label="Down" onClick={onMoveDown} disabled={disabled || index === total - 1} />
          <SmallButton label="Duplicate" onClick={onDuplicate} disabled={disabled} />
          <SmallButton label="Delete" onClick={onRemove} disabled={disabled} danger />
        </div>
      </header>

      <div className="p-4 sm:p-5">
        <BlockFields block={block} disabled={disabled} onChange={onChange} />
      </div>
    </article>
  );
}

function BlockFields({ block, disabled, onChange }: { block: LessonContentBlock; disabled: boolean; onChange: (block: LessonContentBlock) => void }) {
  if (block.type === "heading") {
    return <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
      <Field label="Level"><select value={block.level} disabled={disabled} onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 | 4 })} className={inputClassName}><option value={2}>Heading 2</option><option value={3}>Heading 3</option><option value={4}>Heading 4</option></select></Field>
      <Field label="Heading text"><input value={block.text} disabled={disabled} onChange={(e) => onChange({ ...block, text: e.target.value })} className={inputClassName} /></Field>
    </div>;
  }

  if (block.type === "paragraph") {
    return <Field label="Paragraph"><textarea rows={6} value={block.text} disabled={disabled} onChange={(e) => onChange({ ...block, text: e.target.value })} className={textareaClassName} /></Field>;
  }

  if (block.type === "callout") {
    return <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <Field label="Callout style"><select value={block.tone} disabled={disabled} onChange={(e) => onChange({ ...block, tone: e.target.value as LessonCalloutBlock["tone"] })} className={inputClassName}><option value="key">Key concept</option><option value="tip">Tip</option><option value="warning">Warning</option></select></Field>
        <Field label="Title"><input value={block.title} disabled={disabled} onChange={(e) => onChange({ ...block, title: e.target.value })} className={inputClassName} /></Field>
      </div>
      <Field label="Body"><textarea rows={5} value={block.body} disabled={disabled} onChange={(e) => onChange({ ...block, body: e.target.value })} className={textareaClassName} /></Field>
    </div>;
  }

  if (block.type === "list") {
    return <ListEditor block={block} disabled={disabled} onChange={onChange} />;
  }

  if (block.type === "example") {
    return <div className="space-y-4"><Field label="Example title"><input value={block.title} disabled={disabled} onChange={(e) => onChange({ ...block, title: e.target.value })} className={inputClassName} /></Field><Field label="Example body"><textarea rows={6} value={block.body} disabled={disabled} onChange={(e) => onChange({ ...block, body: e.target.value })} className={textareaClassName} /></Field></div>;
  }

  if (block.type === "image") {
    return <ImageEditor block={block} disabled={disabled} onChange={onChange} />;
  }

  if (block.type === "table") {
    return <TableEditor block={block} disabled={disabled} onChange={onChange} />;
  }

  if (block.type === "knowledge_check") {
    return <KnowledgeCheckEditor block={block} disabled={disabled} onChange={onChange} />;
  }

  return <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-5 text-center text-xs text-[var(--text-muted)]">Section divider. No additional content is required.</div>;
}

function ListEditor({ block, disabled, onChange }: { block: LessonListBlock; disabled: boolean; onChange: (block: LessonContentBlock) => void }) {
  function updateItem(index: number, value: string) { const items = [...block.items]; items[index] = value; onChange({ ...block, items }); }
  function removeItem(index: number) { const items = block.items.filter((_, i) => i !== index); onChange({ ...block, items: items.length ? items : [""] }); }
  return <div className="space-y-4">
    <Field label="List style"><select value={block.style} disabled={disabled} onChange={(e) => onChange({ ...block, style: e.target.value as LessonListBlock["style"] })} className={inputClassName}><option value="bullet">Bulleted</option><option value="numbered">Numbered</option></select></Field>
    <div className="space-y-2">{block.items.map((item, index) => <div key={index} className="flex gap-2"><span className="flex h-11 w-8 shrink-0 items-center justify-center text-xs font-bold text-[var(--text-muted)]">{block.style === "numbered" ? `${index + 1}.` : "•"}</span><input value={item} disabled={disabled} onChange={(e) => updateItem(index, e.target.value)} className={inputClassName}/><button type="button" disabled={disabled} onClick={() => removeItem(index)} className={removeButtonClassName}>Remove</button></div>)}</div>
    <button type="button" disabled={disabled} onClick={() => onChange({ ...block, items: [...block.items, ""] })} className={secondaryButtonClassName}>Add list item</button>
  </div>;
}

function ImageEditor({ block, disabled, onChange }: { block: LessonImageBlock; disabled: boolean; onChange: (block: LessonContentBlock) => void }) {
  return <div className="space-y-4"><Field label="Image URL" hint="Use a public HTTPS image URL."><input type="url" value={block.url} disabled={disabled} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://..." className={inputClassName}/></Field><Field label="Alternative text" hint="Describe the image for accessibility."><input value={block.alt} disabled={disabled} onChange={(e) => onChange({ ...block, alt: e.target.value })} className={inputClassName}/></Field><Field label="Caption"><input value={block.caption} disabled={disabled} onChange={(e) => onChange({ ...block, caption: e.target.value })} className={inputClassName}/></Field>{block.url ? <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3"><img src={block.url} alt={block.alt || "Lesson preview"} className="max-h-72 w-full rounded-lg object-contain" /></div> : null}</div>;
}

function TableEditor({ block, disabled, onChange }: { block: LessonTableBlock; disabled: boolean; onChange: (block: LessonContentBlock) => void }) {
  function resizeColumns(nextCount: number) { const count = Math.max(1, Math.min(6, nextCount)); const headers = Array.from({ length: count }, (_, i) => block.headers[i] ?? `Column ${i + 1}`); const rows = block.rows.map((row) => Array.from({ length: count }, (_, i) => row[i] ?? "")); onChange({ ...block, headers, rows }); }
  function updateHeader(index: number, value: string) { const headers = [...block.headers]; headers[index] = value; onChange({ ...block, headers }); }
  function updateCell(rowIndex: number, columnIndex: number, value: string) { const rows = block.rows.map((row) => [...row]); rows[rowIndex][columnIndex] = value; onChange({ ...block, rows }); }
  return <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-[1fr_140px]"><Field label="Table caption"><input value={block.caption} disabled={disabled} onChange={(e) => onChange({ ...block, caption: e.target.value })} className={inputClassName}/></Field><Field label="Columns"><input type="number" min={1} max={6} value={block.headers.length} disabled={disabled} onChange={(e) => resizeColumns(Number(e.target.value))} className={inputClassName}/></Field></div><div className="overflow-x-auto"><table className="min-w-full border-separate border-spacing-2"><thead><tr>{block.headers.map((header, columnIndex) => <th key={columnIndex}><input aria-label={`Header ${columnIndex + 1}`} value={header} disabled={disabled} onChange={(e) => updateHeader(columnIndex, e.target.value)} className={inputClassName}/></th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{block.headers.map((_, columnIndex) => <td key={columnIndex}><input aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`} value={row[columnIndex] ?? ""} disabled={disabled} onChange={(e) => updateCell(rowIndex, columnIndex, e.target.value)} className={inputClassName}/></td>)}<td><button type="button" disabled={disabled} onClick={() => onChange({ ...block, rows: block.rows.filter((_, i) => i !== rowIndex) })} className={removeButtonClassName}>Remove</button></td></tr>)}</tbody></table></div><button type="button" disabled={disabled} onClick={() => onChange({ ...block, rows: [...block.rows, block.headers.map(() => "")] })} className={secondaryButtonClassName}>Add table row</button></div>;
}

function KnowledgeCheckEditor({ block, disabled, onChange }: { block: LessonKnowledgeCheckBlock; disabled: boolean; onChange: (block: LessonContentBlock) => void }) {
  function updateOption(index: number, value: string) { const options = [...block.options]; options[index] = value; onChange({ ...block, options }); }
  function removeOption(index: number) { if (block.options.length <= 2) return; const options = block.options.filter((_, i) => i !== index); let correctIndex = block.correctIndex; if (index < correctIndex) correctIndex -= 1; else if (index === correctIndex) correctIndex = 0; onChange({ ...block, options, correctIndex }); }
  return <div className="space-y-4"><Field label="Question"><textarea rows={3} value={block.question} disabled={disabled} onChange={(e) => onChange({ ...block, question: e.target.value })} className={textareaClassName}/></Field><div className="space-y-2"><p className="text-sm font-semibold text-[var(--text-primary)]">Answer options</p>{block.options.map((option, index) => <div key={index} className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 sm:flex-row sm:items-center"><label className="flex shrink-0 items-center gap-2 text-xs font-bold text-[var(--text-secondary)]"><input type="radio" name={`correct-${block.id}`} checked={block.correctIndex === index} disabled={disabled} onChange={() => onChange({ ...block, correctIndex: index })} className="accent-[var(--primary)]"/>Correct</label><input value={option} disabled={disabled} onChange={(e) => updateOption(index, e.target.value)} className={inputClassName}/><button type="button" disabled={disabled || block.options.length <= 2} onClick={() => removeOption(index)} className={removeButtonClassName}>Remove</button></div>)}</div><button type="button" disabled={disabled} onClick={() => onChange({ ...block, options: [...block.options, ""] })} className={secondaryButtonClassName}>Add answer option</button><Field label="Explanation" hint="Shown after the learner reveals the answer."><textarea rows={4} value={block.explanation} disabled={disabled} onChange={(e) => onChange({ ...block, explanation: e.target.value })} className={textareaClassName}/></Field></div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) { return <label className="block"><span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>{hint ? <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{hint}</span> : null}<span className="mt-2 block">{children}</span></label>; }
function SmallButton({ label, onClick, disabled, danger = false }: { label: string; onClick: () => void; disabled: boolean; danger?: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} className={danger ? "min-h-8 rounded-lg border border-red-200 bg-red-50 px-2.5 text-[11px] font-bold text-red-700 disabled:opacity-40 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200" : "min-h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2.5 text-[11px] font-bold text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] disabled:opacity-40"}>{label}</button>; }

function createBlock(type: AddBlockType): LessonContentBlock {
  const id = createId();
  switch (type) {
    case "heading": return { id, type: "heading", level: 2, text: "" };
    case "paragraph": return { id, type: "paragraph", text: "" };
    case "key_concept": return { id, type: "callout", tone: "key", title: "Key concept", body: "" };
    case "tip": return { id, type: "callout", tone: "tip", title: "Tip", body: "" };
    case "warning": return { id, type: "callout", tone: "warning", title: "Important", body: "" };
    case "bulleted_list": return { id, type: "list", style: "bullet", items: [""] };
    case "numbered_list": return { id, type: "list", style: "numbered", items: [""] };
    case "example": return { id, type: "example", title: "Example", body: "" };
    case "image": return { id, type: "image", url: "", alt: "", caption: "" };
    case "table": return { id, type: "table", caption: "", headers: ["Column 1", "Column 2"], rows: [["", ""]] };
    case "knowledge_check": return { id, type: "knowledge_check", question: "", options: ["", ""], correctIndex: 0, explanation: "" };
    case "divider": return { id, type: "divider" };
  }
}
function cloneBlockWithNewId(block: LessonContentBlock): LessonContentBlock { return { ...structuredClone(block), id: createId() } as LessonContentBlock; }
function createId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function getBlockLabel(block: LessonContentBlock) { if (block.type === "callout") return block.tone === "key" ? "Key concept" : block.tone === "tip" ? "Tip" : "Warning"; if (block.type === "list") return block.style === "numbered" ? "Numbered list" : "Bulleted list"; if (block.type === "knowledge_check") return "Knowledge check"; return block.type.charAt(0).toUpperCase() + block.type.slice(1); }

const inputClassName = "min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-60";
const textareaClassName = `${inputClassName} min-h-28 resize-y py-3 leading-6`;
const secondaryButtonClassName = "inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] disabled:opacity-50";
const removeButtonClassName = "min-h-10 shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-40 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200";
