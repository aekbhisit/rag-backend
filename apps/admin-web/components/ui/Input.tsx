import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Input({ 
  label, 
  error, 
  hint, 
  leftIcon, 
  rightIcon, 
  size = "md",
  className = "", 
  ...props 
}: InputProps) {
  const inputId = React.useId();
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base"
  };
  
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[color:var(--text)]">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-[color:var(--text-muted)]">
              {leftIcon}
            </div>
          </div>
        )}
        <input
          id={inputId}
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
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-[color:var(--error)] focus:ring-[color:var(--error)] focus:border-[color:var(--error)]' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="text-[color:var(--text-muted)]">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
      
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
