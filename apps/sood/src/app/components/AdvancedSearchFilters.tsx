"use client";

import React, { useState } from 'react';
import { 
  FunnelIcon as Filter, 
  XMarkIcon as X, 
  CalendarIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  StarIcon,
  TicketIcon,
  UserIcon,
  AdjustmentsHorizontalIcon as Sliders,
  MagnifyingGlassIcon as Search,
  ClockIcon
} from '@heroicons/react/24/outline';

export interface FilterOptions {
  search: string;
  category: string;
  location: string;
  priceRange: [number, number];
  dateRange: {
    start: string;
    end: string;
  };
  minRating: number;
  verified: boolean;
  deliveryMethod: string[];
  sortBy: string;
  seatTypes: string[];
  venues: string[];
}

interface AdvancedSearchFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onClose?: () => void;
  isModal?: boolean;
}

const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onClose,
  isModal = false
}) => {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const categories = [
    { id: 'all', name: 'All Categories', count: 2847 },
    { id: 'concerts', name: 'Concerts', count: 1205 },
    { id: 'sports', name: 'Sports', count: 892 },
    { id: 'theater', name: 'Theater', count: 456 },
    { id: 'comedy', name: 'Comedy', count: 234 },
    { id: 'festivals', name: 'Festivals', count: 178 },
    { id: 'family', name: 'Family Events', count: 145 },
    { id: 'arts', name: 'Arts & Culture', count: 123 }
  ];

  const locations = [
    { id: 'all', name: 'All Locations' },
    { id: 'new-york', name: '🗽 New York, NY' },
    { id: 'los-angeles', name: '🌴 Los Angeles, CA' },
    { id: 'chicago', name: '🏙️ Chicago, IL' },
    { id: 'miami', name: '🏖️ Miami, FL' },
    { id: 'london', name: '🇬🇧 London, UK' },
    { id: 'tokyo', name: '🇯🇵 Tokyo, Japan' },
    { id: 'paris', name: '🇫🇷 Paris, France' }
  ];

  const venues = [
    'Madison Square Garden',
    'MetLife Stadium',
    'Crypto.com Arena',
    'Chase Center',
    'Richard Rodgers Theatre',
    'Minskoff Theatre',
    'Hollywood Bowl',
    'Red Rocks Amphitheatre'
  ];

  const seatTypes = [
    { id: 'floor', name: 'Floor/Pit', description: 'Standing or floor seating' },
    { id: 'lower', name: 'Lower Level', description: 'Lower bowl seating' },
    { id: 'upper', name: 'Upper Level', description: 'Upper deck seating' },
    { id: 'vip', name: 'VIP/Premium', description: 'Premium seating with perks' },
    { id: 'box', name: 'Box/Suite', description: 'Private boxes and suites' },
    { id: 'orchestra', name: 'Orchestra', description: 'Theater orchestra seating' },
    { id: 'mezzanine', name: 'Mezzanine', description: 'Theater mezzanine level' },
    { id: 'balcony', name: 'Balcony', description: 'Theater balcony seating' }
  ];

  const deliveryMethods = [
    { id: 'electronic', name: 'Electronic Delivery', icon: '📧' },
    { id: 'physical', name: 'Physical Mail', icon: '📮' },
    { id: 'pickup', name: 'Venue Pickup', icon: '🏢' },
    { id: 'transfer', name: 'Mobile Transfer', icon: '📱' }
  ];

  const sortOptions = [
    { id: 'relevance', name: 'Best Match' },
    { id: 'price-low', name: 'Price: Low to High' },
    { id: 'price-high', name: 'Price: High to Low' },
    { id: 'date-soon', name: 'Date: Soonest First' },
    { id: 'date-far', name: 'Date: Latest First' },
    { id: 'rating', name: 'Highest Rated' },
    { id: 'popularity', name: 'Most Popular' },
    { id: 'newest', name: 'Newest Listings' }
  ];

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handlePriceRangeChange = (index: 0 | 1, value: number) => {
    const newRange: [number, number] = [...localFilters.priceRange];
    newRange[index] = value;
    handleFilterChange('priceRange', newRange);
  };

  const handleArrayFilterChange = (key: 'deliveryMethod' | 'seatTypes' | 'venues', value: string) => {
    const currentArray = localFilters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    handleFilterChange(key, newArray);
  };

  const clearAllFilters = () => {
    const defaultFilters: FilterOptions = {
      search: '',
      category: 'all',
      location: 'all',
      priceRange: [0, 1000],
      dateRange: { start: '', end: '' },
      minRating: 0,
      verified: false,
      deliveryMethod: [],
      sortBy: 'relevance',
      seatTypes: [],
      venues: []
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.category !== 'all') count++;
    if (localFilters.location !== 'all') count++;
    if (localFilters.priceRange[0] > 0 || localFilters.priceRange[1] < 1000) count++;
    if (localFilters.dateRange.start || localFilters.dateRange.end) count++;
    if (localFilters.minRating > 0) count++;
    if (localFilters.verified) count++;
    if (localFilters.deliveryMethod.length > 0) count++;
    if (localFilters.seatTypes.length > 0) count++;
    if (localFilters.venues.length > 0) count++;
    return count;
  };

  const FilterSection: React.FC<{ title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }> = ({ 
    title, 
    icon: Icon, 
    children 
  }) => (
    <div className="border-b border-gray-200 pb-6 mb-6 last:border-b-0 last:pb-0 last:mb-0">
      <div className="flex items-center space-x-2 mb-4">
        <Icon className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Filter className="w-6 h-6 text-gray-600" />
          <h2 className="text-xl font-bold text-gray-900">Advanced Filters</h2>
          {getActiveFilterCount() > 0 && (
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
              {getActiveFilterCount()} active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear All
          </button>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <FilterSection title="Search" icon={Search}>
        <input
          type="text"
          value={localFilters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          placeholder="Search events, artists, venues..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
        />
      </FilterSection>

      {/* Sort By */}
      <FilterSection title="Sort By" icon={Sliders}>
        <select
          value={localFilters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        >
          {sortOptions.map(option => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </select>
      </FilterSection>

      {/* Category */}
      <FilterSection title="Category" icon={TicketIcon}>
        <div className="grid grid-cols-2 gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => handleFilterChange('category', category.id)}
              className={`p-3 text-left rounded-lg border transition-colors ${
                localFilters.category === category.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-medium text-sm">{category.name}</div>
              <div className="text-xs text-gray-500">{category.count} events</div>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Location */}
      <FilterSection title="Location" icon={MapPinIcon}>
        <select
          value={localFilters.location}
          onChange={(e) => handleFilterChange('location', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        >
          {locations.map(location => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range" icon={CurrencyDollarIcon}>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Min Price</label>
              <input
                type="number"
                value={localFilters.priceRange[0]}
                onChange={(e) => handlePriceRangeChange(0, parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                min="0"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Max Price</label>
              <input
                type="number"
                value={localFilters.priceRange[1]}
                onChange={(e) => handlePriceRangeChange(1, parseInt(e.target.value) || 1000)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                min="0"
              />
            </div>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="1000"
              value={localFilters.priceRange[1]}
              onChange={(e) => handlePriceRangeChange(1, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>$0</span>
              <span>$1000+</span>
            </div>
          </div>
        </div>
      </FilterSection>

      {/* Date Range */}
      <FilterSection title="Date Range" icon={CalendarIcon}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={localFilters.dateRange.start}
              onChange={(e) => handleFilterChange('dateRange', { ...localFilters.dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={localFilters.dateRange.end}
              onChange={(e) => handleFilterChange('dateRange', { ...localFilters.dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
        </div>
      </FilterSection>

      {/* Rating */}
      <FilterSection title="Minimum Rating" icon={StarIcon}>
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4, 5].map(rating => (
            <button
              key={rating}
              onClick={() => handleFilterChange('minRating', rating === localFilters.minRating ? 0 : rating)}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg border transition-colors ${
                localFilters.minRating >= rating
                  ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <StarIcon className="w-4 h-4" />
              <span className="text-sm">{rating}+</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Seat Types */}
      <FilterSection title="Seat Types" icon={TicketIcon}>
        <div className="space-y-2">
          {seatTypes.map(seatType => (
            <label key={seatType.id} className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.seatTypes.includes(seatType.id)}
                onChange={() => handleArrayFilterChange('seatTypes', seatType.id)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{seatType.name}</div>
                <div className="text-xs text-gray-500">{seatType.description}</div>
              </div>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Delivery Method */}
      <FilterSection title="Delivery Method" icon={ClockIcon}>
        <div className="grid grid-cols-2 gap-2">
          {deliveryMethods.map(method => (
            <label key={method.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300">
              <input
                type="checkbox"
                checked={localFilters.deliveryMethod.includes(method.id)}
                onChange={() => handleArrayFilterChange('deliveryMethod', method.id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-lg">{method.icon}</span>
              <span className="text-sm font-medium text-gray-900">{method.name}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Verified Only */}
      <FilterSection title="Verification" icon={UserIcon}>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={localFilters.verified}
            onChange={(e) => handleFilterChange('verified', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div>
            <div className="text-sm font-medium text-gray-900">Verified Sellers Only</div>
            <div className="text-xs text-gray-500">Show only tickets from verified sellers</div>
          </div>
        </label>
      </FilterSection>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-10">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {content}
    </div>
  );
};

export default AdvancedSearchFilters;