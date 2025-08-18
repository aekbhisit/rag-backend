import React from "react";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: "sm" | "md" | "lg";
}

export function Select({ 
  label, 
  error, 
  hint, 
  options, 
  placeholder, 
  size = "md",
  className = "", 
  ...props 
}: SelectProps) {
  const selectId = React.useId();
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base"
  };
  
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-[color:var(--text)]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`
            appearance-none block w-full ${sizeClasses[size]}
            border border-[color:var(--border)] rounded-lg
            bg-[color:var(--surface)] text-[color:var(--text)]
            shadow-sm transition-all duration-200
            hover:border-[color:var(--border-hover)]
            focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:ring-opacity-20 
            focus:border-[color:var(--primary)] focus:shadow-md
            disabled:bg-[color:var(--surface-muted)] disabled:text-[color:var(--text-muted)] 
            disabled:cursor-not-allowed disabled:shadow-none
            ${error ? 'border-[color:var(--error)] focus:ring-[color:var(--error)] focus:border-[color:var(--error)]' : ''}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-[color:var(--text-muted)]">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value} 
              disabled={option.disabled}
              className={`
                py-2 px-3
                ${option.disabled ? 'text-[color:var(--text-muted)]' : 'text-[color:var(--text)]'}
              `}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg 
            className={`
              h-4 w-4 transition-colors duration-200
              ${error ? 'text-[color:var(--error)]' : 'text-[color:var(--text-muted)]'}
            `} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 9l4-4 4 4m0 6l-4 4-4-4" 
            />
          </svg>
        </div>
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
