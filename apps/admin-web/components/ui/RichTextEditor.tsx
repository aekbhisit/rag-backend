"use client";

import React from "react";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  hint?: string;
  rows?: number;
}

export function RichTextEditor({ 
  label, 
  value, 
  onChange, 
  error, 
  placeholder, 
  hint,
  rows = 6 
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = React.useState(false);

  const handleFormat = (command: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    
    let newText = '';
    let newValue = '';
    
    switch (command) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        break;
      case 'link':
        const url = value || 'https://example.com';
        newText = `[${selectedText || 'link text'}](${url})`;
        break;
      case 'list':
        newText = `\n- ${selectedText || 'list item'}`;
        break;
      case 'heading':
        newText = `\n## ${selectedText || 'heading'}\n`;
        break;
      default:
        return;
    }

    newValue = editor.value.substring(0, start) + newText + editor.value.substring(end);
    onChange(newValue);
    
    // Focus back to editor
    setTimeout(() => {
      editor.focus();
      const newPos = start + newText.length;
      editor.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const renderPreview = (text: string) => {
    // Simple markdown-like preview
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 underline">$1</a>')
      .replace(/^## (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[color:var(--text)]">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {isPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {!isPreview && (
        <div className="border border-[color:var(--border)] rounded-md overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-1 p-2 border-b border-[color:var(--border)] bg-gray-50">
            <button
              type="button"
              onClick={() => handleFormat('bold')}
              className="px-2 py-1 text-xs font-bold border rounded hover:bg-gray-200"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => handleFormat('italic')}
              className="px-2 py-1 text-xs italic border rounded hover:bg-gray-200"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => handleFormat('heading')}
              className="px-2 py-1 text-xs border rounded hover:bg-gray-200"
              title="Heading"
            >
              H
            </button>
            <button
              type="button"
              onClick={() => handleFormat('list')}
              className="px-2 py-1 text-xs border rounded hover:bg-gray-200"
              title="List"
            >
              •
            </button>
            <button
              type="button"
              onClick={() => {
                const url = prompt('Enter URL:');
                if (url) handleFormat('link', url);
              }}
              className="px-2 py-1 text-xs border rounded hover:bg-gray-200"
              title="Link"
            >
              🔗
            </button>
          </div>

          {/* Editor */}
          <textarea
            ref={editorRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full p-3 resize-none focus:outline-none"
          />
        </div>
      )}

      {isPreview && (
        <div 
          className="border border-[color:var(--border)] rounded-md p-3 min-h-[200px] bg-white"
          dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
        />
      )}

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}
      
      {hint && !error && (
        <div className="text-[color:var(--text-muted)] text-xs">{hint}</div>
      )}
    </div>
  );
}
