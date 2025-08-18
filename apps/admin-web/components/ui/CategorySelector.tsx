"use client";

import React from "react";
import { BACKEND_URL, getTenantId } from "../config";
import { Badge } from "./Badge";

interface Category {
  id: string;
  name: string;
  slug: string;
  level: number;
  parent_id?: string;
  full_path?: string;
}

interface CategorySelectorProps {
  label: string;
  selectedCategories: string[];
  onCategoriesChange: (categoryIds: string[]) => void;
  maxSelections?: number;
}

export function CategorySelector({
  label,
  selectedCategories = [],
  onCategoriesChange,
  maxSelections = 5
}: CategorySelectorProps) {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  React.useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/categories?hierarchy=true`, {
        headers: {
          'X-Tenant-ID': getTenantId()
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      // Remove category
      onCategoriesChange(selectedCategories.filter(id => id !== categoryId));
    } else if (selectedCategories.length < maxSelections) {
      // Add category
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  const removeCategory = (categoryId: string) => {
    onCategoriesChange(selectedCategories.filter(id => id !== categoryId));
  };

  const getSelectedCategoryNames = () => {
    return categories
      .filter(cat => selectedCategories.includes(cat.id))
      .map(cat => cat.name);
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIndentClass = (level: number) => {
    // Use smaller left padding per level to avoid excessive indentation
    const indents = ['pl-2', 'pl-4', 'pl-6', 'pl-8', 'pl-10'];
    return indents[Math.min(level, 4)] || 'pl-2';
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-[color:var(--text)]">{label}</label>
        <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[color:var(--text)]">
        {label} ({selectedCategories.length}/{maxSelections})
      </label>

      {/* Selected categories display */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {getSelectedCategoryNames().map((name, index) => (
            <Badge 
              key={selectedCategories[index]} 
              variant="info" 
              className="cursor-pointer hover:bg-blue-200"
              onClick={() => removeCategory(selectedCategories[index])}
            >
              {name} ×
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full px-3 py-2 border border-[color:var(--border)] rounded-md text-left bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <span className="text-gray-500">
            {selectedCategories.length === 0 
              ? "Select categories..." 
              : `${selectedCategories.length} selected`}
          </span>
          <span className="float-right">
            {showDropdown ? "▲" : "▼"}
          </span>
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
            {/* Search */}
            <div className="p-2 border-b">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search categories..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>

            {/* Categories list */}
            <div className="max-h-48 overflow-y-auto">
              {filteredCategories.length === 0 ? (
                <div className="p-3 text-gray-500 text-sm">No categories found</div>
              ) : (
                filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className={`flex items-center ${getIndentClass(category.level)} pr-2 py-2 hover:bg-gray-100 cursor-pointer`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => {}} // Handled by parent click
                      className="mr-2"
                    />
                    <span className="text-sm flex-1">
                      {category.name}
                      {category.level > 0 && (
                        <span className="text-xs text-gray-500 ml-1">
                          (Level {category.level})
                        </span>
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t bg-gray-50 text-xs text-gray-600">
              {selectedCategories.length >= maxSelections 
                ? `Maximum ${maxSelections} categories selected`
                : `Select up to ${maxSelections} categories`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
