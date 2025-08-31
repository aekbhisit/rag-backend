'use client';

import React, { useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

interface LocationOption {
  value: string;
  label: string;
  emoji: string;
}

interface LocationSelectorProps {
  onSelect: (location: string) => void;
  initialValue?: string;
  className?: string;
  variant?: 'default' | 'mobile';
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ 
  onSelect, 
  initialValue = 'all',
  className = '',
  variant = 'default'
}) => {
  const [selectedLocation, setSelectedLocation] = useState(initialValue);

  const locationOptions: LocationOption[] = [
    { value: 'all', label: 'All Thailand', emoji: '🏛️' },
    { value: 'bangkok', label: 'Bangkok', emoji: '🌆' },
    { value: 'chiang-mai', label: 'Chiang Mai', emoji: '🏔️' },
    { value: 'phuket', label: 'Phuket', emoji: '🏝️' },
    { value: 'pattaya', label: 'Pattaya', emoji: '🏖️' },
    { value: 'krabi', label: 'Krabi', emoji: '🦀' },
    { value: 'koh-samui', label: 'Koh Samui', emoji: '🌴' },
    { value: 'hua-hin', label: 'Hua Hin', emoji: '🦋' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedLocation(value);
    onSelect(value);
  };

  if (variant === 'mobile') {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-3 hover:border-red-400 transition-colors cursor-pointer group">
          <MapPin className="w-5 h-5 text-gray-500" />
          <select
            value={selectedLocation}
            onChange={handleChange}
            className="appearance-none bg-transparent text-sm text-gray-700 focus:outline-none cursor-pointer flex-1 pr-6"
          >
            {locationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.emoji} {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 pointer-events-none group-hover:text-red-500 transition-colors" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:border-red-400 transition-colors cursor-pointer group">
        <span className="text-lg">🇹🇭</span>
        <select
          value={selectedLocation}
          onChange={handleChange}
          className="appearance-none bg-transparent text-sm text-gray-700 focus:outline-none cursor-pointer min-w-0 pr-6"
        >
          {locationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.emoji} {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 pointer-events-none group-hover:text-red-500 transition-colors" />
      </div>
    </div>
  );
};

export default LocationSelector;