"use client";

import React from "react";

interface SimpleHtmlEditorProps {
	label: string;
	value: string; // HTML value
	onChange: (html: string) => void;
	placeholder?: string;
	hint?: string;
	error?: string;
	rows?: number; // visual height in text rows
  onFocusCapture?: React.FocusEventHandler<any>;
  onBlurCapture?: React.FocusEventHandler<any>;
}

function sanitizeHtml(html: string): string {
	// very small sanitizer: strip script/style tags
	return html
		.replace(/<\/(?:script|style)>/gi, "")
		.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
}

export function SimpleHtmlEditor({
	label,
	value,
	onChange,
	placeholder,
	hint,
	error,
	rows = 5,
  onFocusCapture,
  onBlurCapture,
}: SimpleHtmlEditorProps) {
	const ref = React.useRef<HTMLDivElement | null>(null);
	const [showSource, setShowSource] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const composingRef = React.useRef(false);
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [editingLinkEl, setEditingLinkEl] = React.useState<HTMLAnchorElement | null>(null);
  const selectionRef = React.useRef<Range | null>(null);

  const exec = (cmd: string, arg?: string) => {
    composingRef.current = true;
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    // trigger onChange after command
    setTimeout(() => {
      onChange(sanitizeHtml(ref.current?.innerHTML || ""));
      composingRef.current = false;
    }, 0);
  };

  const setCaretToEnd = (element: HTMLElement) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const handleClear = () => {
    const selection = window.getSelection();
    // If user selected a range, remove formatting on that selection and unlink
    if (selection && !selection.isCollapsed) {
      exec('removeFormat');
      document.execCommand('unlink');
      return;
    }
    // No selection -> clear formatting for entire editor, keep plain text
    if (!ref.current) return;
    composingRef.current = true;
    const plain = ref.current.innerText || '';
    ref.current.innerText = plain;
    onChange(plain);
    setCaretToEnd(ref.current);
    composingRef.current = false;
  };

  const getAnchorFromSelection = (): HTMLAnchorElement | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const node = sel.anchorNode as Node | null;
    const node2 = sel.focusNode as Node | null;
    const findA = (n: Node | null): HTMLAnchorElement | null => {
      let el: Node | null = n;
      while (el) {
        if ((el as HTMLElement).tagName === 'A') return el as HTMLAnchorElement;
        el = el.parentNode;
      }
      return null;
    };
    return findA(node) || findA(node2);
  };

  const ensureLinkAttrs = () => {
    const root = ref.current;
    if (!root) return;
    const links = Array.from(root.querySelectorAll('a')) as HTMLAnchorElement[];
    for (const a of links) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  };

  const openLinkDialog = () => {
    if (!ref.current) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      selectionRef.current = sel.getRangeAt(0).cloneRange();
    }
    const a = getAnchorFromSelection();
    setEditingLinkEl(a);
    setLinkUrl(a?.getAttribute('href') || '');
    setLinkDialogOpen(true);
  };

  const applyLinkSave = () => {
    if (!ref.current) return;
    composingRef.current = true;
    const url = linkUrl.trim();
    if (editingLinkEl) {
      if (url === '') {
        // remove
        const text = editingLinkEl.textContent || '';
        editingLinkEl.replaceWith(document.createTextNode(text));
      } else {
        editingLinkEl.setAttribute('href', url);
        editingLinkEl.target = '_blank';
        editingLinkEl.rel = 'noopener noreferrer';
      }
    } else {
      const sel = window.getSelection();
      if (selectionRef.current && sel) {
        sel.removeAllRanges();
        sel.addRange(selectionRef.current);
      }
      const hasSelection = !!sel && !sel!.isCollapsed;
      if (url) {
        if (hasSelection) {
          document.execCommand('createLink', false, url);
          ensureLinkAttrs();
        } else {
          const text = url;
          document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);
        }
      }
    }
    onChange(sanitizeHtml(ref.current.innerHTML));
    composingRef.current = false;
    setLinkDialogOpen(false);
    setEditingLinkEl(null);
    setLinkUrl('');
  };

  const applyLinkClear = () => {
    if (!ref.current) return;
    composingRef.current = true;
    if (editingLinkEl) {
      const text = editingLinkEl.textContent || '';
      editingLinkEl.replaceWith(document.createTextNode(text));
    } else {
      document.execCommand('unlink');
    }
    onChange(sanitizeHtml(ref.current.innerHTML));
    composingRef.current = false;
    setLinkDialogOpen(false);
    setEditingLinkEl(null);
    setLinkUrl('');
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    composingRef.current = true;
    const html = sanitizeHtml((e.currentTarget as HTMLDivElement).innerHTML);
    onChange(html);
    // allow React state to settle without resetting caret
    setTimeout(() => { composingRef.current = false; }, 0);
  };

  // Keep DOM in sync only when value changes from outside edits to avoid caret jump
  React.useEffect(() => {
    if (!ref.current) return;
    if (composingRef.current) return;
    const domHtml = ref.current.innerHTML;
    const nextHtml = value || "";
    if (domHtml !== nextHtml) {
      ref.current.innerHTML = nextHtml;
    }
  }, [value]);

	const minHeight = Math.max(5, rows) * 22; // ~22px per row

	return (
		<div className="space-y-1.5">
			<label className="block text-sm font-medium text-[color:var(--text)]">{label}</label>
        <div className="relative border border-[color:var(--border)] rounded-md overflow-hidden">
				{/* Compact toolbar */}
				<div className="flex items-center gap-1.5 bg-[color:var(--surface-muted)]/60 px-2 py-1 border-b border-[color:var(--border)]">
					<button type="button" aria-label="Bold" className="h-7 px-2 text-xs rounded hover:bg-[color:var(--surface-hover)]" onClick={() => exec("bold")}>B</button>
					<button type="button" aria-label="Italic" className="h-7 px-2 text-xs rounded hover:bg-[color:var(--surface-hover)]" onClick={() => exec("italic")}>I</button>
					<button type="button" aria-label="Underline" className="h-7 px-2 text-xs rounded hover:bg-[color:var(--surface-hover)]" onClick={() => exec("underline")}>U</button>
					<span className="w-px h-5 bg-[color:var(--border)]" />
					<button type="button" aria-label="Unordered list" className="h-7 px-2 text-xs rounded hover:bg-[color:var(--surface-hover)]" onClick={() => exec("insertUnorderedList")}>•</button>
					<button type="button" aria-label="Ordered list" className="h-7 px-2 text-xs rounded hover:bg-[color:var(--surface-hover)]" onClick={() => exec("insertOrderedList")}>1.</button>
					<span className="w-px h-5 bg-[color:var(--border)]" />
          <button type="button" aria-label="H2" className="h-7 px-2 text-xs rounded hover:bg-[color:var(--surface-hover)]" onClick={() => exec("formatBlock", "<h2>")}>H2</button>
          <button type="button" aria-label="Create or edit link" className="h-7 px-2 text-xs rounded hover:bg-[color:var(--surface-hover)]" onClick={openLinkDialog}>🔗</button>
					<span className="w-px h-5 bg-[color:var(--border)]" />
          <button type="button" aria-label="Clear formatting" className="h-7 px-2 text-xs rounded hover:bg-[color:var(--surface-hover)]" onClick={handleClear}>Clear</button>
					<div className="flex-1" />
					<button type="button" className="h-7 px-2 text-xs rounded hover:bg-[color:var(--surface-hover)]" onClick={() => setShowSource(s => !s)}>
						{showSource ? "Rich" : "HTML"}
					</button>
				</div>

        {/* Editor */}
				{showSource ? (
					<textarea
						className="w-full px-3 py-2 bg-white border-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-none"
						style={{ minHeight }}
						value={value}
						onChange={(e) => onChange(e.target.value)}
						placeholder={placeholder}
            onFocusCapture={onFocusCapture}
            onBlurCapture={onBlurCapture}
					/>
				) : (
            <div className="relative">
						<div
							ref={ref}
                className="w-full px-3 py-2 bg-white outline-none"
							contentEditable
							suppressContentEditableWarning
							style={{ minHeight }}
							onInput={handleInput}
							onFocus={(e) => { setIsFocused(true); onFocusCapture && onFocusCapture(e); }}
							onBlur={(e) => { setIsFocused(false); onBlurCapture && onBlurCapture(e); }}
                // innerHTML is controlled by effect to preserve caret
						/>
						{(!value || value.trim().length === 0) && !isFocused && (
							<div className="pointer-events-none absolute inset-x-3 top-2 text-[color:var(--text-muted)] select-none">
								{placeholder || ""}
							</div>
              )}
 
        {/* Link Dialog */}
        {linkDialogOpen && (
          <div className="absolute z-10 right-2 top-10 bg-white border border-[color:var(--border)] rounded-md shadow-md p-3 w-72">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[color:var(--text)]">Link URL</label>
              <input
                className="w-full px-2 py-1 text-sm border border-[color:var(--border)] rounded"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
              <div className="flex items-center justify-between pt-1">
                <button type="button" className="text-xs px-2 py-1 rounded border hover:bg-[color:var(--surface-hover)]" onClick={applyLinkClear}>Clear link</button>
                <div className="space-x-2">
                  <button type="button" className="text-xs px-2 py-1 rounded border hover:bg-[color:var(--surface-hover)]" onClick={() => { setLinkDialogOpen(false); setEditingLinkEl(null); }}>Cancel</button>
                  <button type="button" className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={applyLinkSave}>Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
            
					</div>
				)}
			</div>

			{hint && (
				<p className="text-sm text-[color:var(--text-muted)] mt-1">{hint}</p>
			)}
			{error && <p className="text-sm text-red-600 mt-1">{error}</p>}
		</div>
	);
}


