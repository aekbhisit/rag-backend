"use client";

import React from "react";

interface MarkdownEditorProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	hint?: string;
	error?: string;
	rows?: number;
}

export function MarkdownEditor({
	label,
	value,
	onChange,
	placeholder,
	hint,
	error,
	rows = 5,
}: MarkdownEditorProps) {
	const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
	const [showPreview, setShowPreview] = React.useState(false);

	const applyWrap = (prefix: string, suffix?: string) => {
		suffix = suffix ?? prefix;
		const el = textareaRef.current;
		if (!el) return;
		const start = el.selectionStart ?? 0;
		const end = el.selectionEnd ?? 0;
		const before = value.slice(0, start);
		const selected = value.slice(start, end) || "text";
		const after = value.slice(end);
		onChange(before + prefix + selected + suffix + after);
		requestAnimationFrame(() => {
			const cursor = start + prefix.length + selected.length + (suffix?.length ?? 0);
			el.setSelectionRange(cursor, cursor);
			el.focus();
		});
	};

	const insert = (snippet: string) => {
		const el = textareaRef.current;
		if (!el) return;
		const start = el.selectionStart ?? 0;
		const end = el.selectionEnd ?? 0;
		const before = value.slice(0, start);
		const after = value.slice(end);
		onChange(before + snippet + after);
		requestAnimationFrame(() => {
			const cursor = start + snippet.length;
			el.setSelectionRange(cursor, cursor);
			el.focus();
		});
	};

	const renderPreview = () => {
		// Minimal markdown preview without external deps (bold, italic, code, headings, lists, links)
		const escaped = value
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");

		const html = escaped
			.replace(/^######\s?(.*)$/gm, "<h6>$1</h6>")
			.replace(/^#####\s?(.*)$/gm, "<h5>$1</h5>")
			.replace(/^####\s?(.*)$/gm, "<h4>$1</h4>")
			.replace(/^###\s?(.*)$/gm, "<h3>$1</h3>")
			.replace(/^##\s?(.*)$/gm, "<h2>$1</h2>")
			.replace(/^#\s?(.*)$/gm, "<h1>$1</h1>")
			.replace(/^\s*[-*]\s+(.*)$/gm, "<li>$1</li>")
			.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
			.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.*?)\*/g, "<em>$1</em>")
			.replace(/`([^`]+)`/g, "<code>$1</code>")
			.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1<\/a>')
			.replace(/\n\n+/g, "</p><p>")
			.replace(/\n/g, "<br/>");

		return (
			<div
				className="prose prose-sm max-w-none text-[color:var(--text)]"
				dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
			/>
		);
	};

	return (
		<div className="space-y-1.5">
			<label className="block text-sm font-medium text-[color:var(--text)]">{label}</label>
			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={() => applyWrap("**")}
					className="px-2 py-1 text-xs border rounded hover:bg-[color:var(--surface-hover)]"
				>
					B
				</button>
				<button
					type="button"
					onClick={() => applyWrap("*")}
					className="px-2 py-1 text-xs border rounded hover:bg-[color:var(--surface-hover)]"
				>
					I
				</button>
				<button
					type="button"
					onClick={() => applyWrap("`")}
					className="px-2 py-1 text-xs border rounded hover:bg-[color:var(--surface-hover)]"
				>
					Code
				</button>
				<button
					type="button"
					onClick={() => insert("- ")}
					className="px-2 py-1 text-xs border rounded hover:bg-[color:var(--surface-hover)]"
				>
					• List
				</button>
				<button
					type="button"
					onClick={() => insert("# ")}
					className="px-2 py-1 text-xs border rounded hover:bg-[color:var(--surface-hover)]"
				>
					H1
				</button>
				<button
					type="button"
					onClick={() => insert("[text](https://)")}
					className="px-2 py-1 text-xs border rounded hover:bg-[color:var(--surface-hover)]"
				>
					Link
				</button>
				<div className="flex-1" />
				<button
					type="button"
					onClick={() => setShowPreview((s) => !s)}
					className="px-2 py-1 text-xs border rounded hover:bg-[color:var(--surface-hover)]"
				>
					{showPreview ? "Edit" : "Preview"}
				</button>
			</div>

			{showPreview ? (
				<div className="mt-2 border border-[color:var(--border)] rounded-md p-3 bg-[color:var(--surface)] min-h-[6rem]">
					{renderPreview()}
				</div>
			) : (
				<textarea
					ref={textareaRef}
					className="w-full px-3 py-2 border border-[color:var(--border)] rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					rows={rows}
				></textarea>
			)}

			{hint && (
				<div className="flex items-center gap-1.5 mt-1">
					<svg className="h-4 w-4 text-[color:var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
					<p className="text-sm text-[color:var(--text-muted)]">{hint}</p>
				</div>
			)}
			{error && <p className="text-sm text-red-600 mt-1">{error}</p>}
		</div>
	);
}


