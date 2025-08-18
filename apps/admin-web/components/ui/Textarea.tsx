import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  size?: "sm" | "md" | "lg";
}

export function Textarea({ 
  label, 
  error, 
  hint, 
  size = "md",
  className = "", 
  ...props 
}: TextareaProps) {
  const textareaId = React.useId();
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base"
  };
  
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-[color:var(--text)]">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          block w-full ${sizeClasses[size]}
          border border-[color:var(--border)] rounded-lg
          bg-[color:var(--surface)] text-[color:var(--text)]
          placeholder-[color:var(--text-muted)]
          shadow-sm transition-all duration-200
          hover:border-[color:var(--border-hover)]
          focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:ring-opacity-20
          focus:border-[color:var(--primary)] focus:shadow-md
          disabled:bg-[color:var(--surface-muted)] disabled:text-[color:var(--text-muted)]
          disabled:cursor-not-allowed disabled:shadow-none
          resize-vertical min-h-[80px]
          ${error ? 'border-[color:var(--error)] focus:ring-[color:var(--error)] focus:border-[color:var(--error)]' : ''}
          ${className}
        `}
        {...props}
      />
      
      {error && (
        <div className="flex items-center gap-1.5">
          <svg className="h-4 w-4 text-[color:var(--error)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-[color:var(--error)]">{error}</p>
        </div>
      )}
      
      {hint && !error && (
        <div className="flex items-center gap-1.5">
          <svg className="h-4 w-4 text-[color:var(--text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-[color:var(--text-muted)]">{hint}</p>
        </div>
      )}
    </div>
  );
}
