"use client";

import React from "react";
import { Badge } from "./Badge";

interface KeywordEditorProps {
  label: string;
  value: string[];
  onChange: (keywords: string[]) => void;
  placeholder?: string;
  hint?: string;
}

export function KeywordEditor({ 
  label, 
  value = [], 
  onChange, 
  placeholder = "Type keywords and press Enter", 
  hint 
}: KeywordEditorProps) {
  const [input, setInput] = React.useState("");
  const [suggestions] = React.useState([
    "location", "shopping", "restaurant", "entertainment", "travel", "business",
    "technology", "health", "education", "finance", "news", "sports"
  ]);

  const addKeyword = (keyword: string) => {
    const trimmed = keyword.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const removeKeyword = (keyword: string) => {
    onChange(value.filter(k => k !== keyword));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword(input);
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      // Remove last keyword if input is empty and backspace is pressed
      onChange(value.slice(0, -1));
    }
  };

  const filteredSuggestions = suggestions.filter(s => 
    s.includes(input.toLowerCase()) && !value.includes(s) && input.length > 0
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[color:var(--text)]">
        {label}
      </label>

      {/* Input with keywords display */}
      <div className="border border-[color:var(--border)] rounded-md p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <div className="flex flex-wrap gap-1 mb-2">
          {value.map((keyword) => (
            <Badge 
              key={keyword} 
              variant="info" 
              className="cursor-pointer hover:bg-blue-200"
              onClick={() => removeKeyword(keyword)}
            >
              {keyword} ×
            </Badge>
          ))}
        </div>
        
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={value.length === 0 ? placeholder : "Add more keywords..."}
          className="w-full outline-none text-sm"
        />
      </div>

      {/* Suggestions */}
      {filteredSuggestions.length > 0 && (
        <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
          <div className="text-xs text-gray-600 mb-1">Suggestions:</div>
          <div className="flex flex-wrap gap-1">
            {filteredSuggestions.slice(0, 6).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addKeyword(suggestion)}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {hint && (
        <div className="text-[color:var(--text-muted)] text-xs">{hint}</div>
      )}
    </div>
  );
}
