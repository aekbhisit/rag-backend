'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = "Search events, venues, artists...", 
  initialValue = "",
  className = ""
}) => {
  const [searchQuery, setSearchQuery] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Optionally trigger search on each keystroke
    // onSearch(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative w-full ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-800 placeholder-gray-500"
        value={searchQuery}
        onChange={handleChange}
      />
      <button type="submit" className="sr-only">Search</button>
    </form>
  );
};

export default SearchBar;