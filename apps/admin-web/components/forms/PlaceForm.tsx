"use client";

import React from "react";
import { Input } from "../ui/Input";
import { MapPicker } from "../ui/MapPicker";
import { ImageUploader } from "../ui/ImageUploader";

interface PlaceFormProps {
  attributes: Record<string, any>;
  errors: Record<string, string>;
  onUpdate: (key: string, value: any) => void;
}

interface OpeningHours {
  [key: string]: string;
}

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" }
];

export function PlaceForm({ attributes, errors, onUpdate }: PlaceFormProps) {
  const [showMap, setShowMap] = React.useState(false);
  const [hours, setHours] = React.useState<OpeningHours>(() => {
    return attributes.hours || {};
  });

  const updateHours = (day: string, time: string) => {
    const newHours = { ...hours, [day]: time };
    setHours(newHours);
    onUpdate("hours", Object.keys(newHours).length > 0 ? newHours : undefined);
  };

  const handleCoordinatesChange = (lat: number, lng: number) => {
    onUpdate("lat", lat);
    onUpdate("lon", lng);
  };

  const handleAddressChange = (address: string) => {
    onUpdate("address", address);
  };

  return (
    <div className="space-y-4">
      <Input
        label="Address *"
        value={attributes.address || ""}
        onChange={(e) => onUpdate("address", e.target.value)}
        onBlur={(e) => onUpdate("address", e.target.value)}
        error={errors["attributes.address"]}
        placeholder="123 Main St, Bangkok, Thailand"
      />

      {/* Coordinates Section with Map Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[color:var(--text)]">
            Location Coordinates
          </label>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showMap ? "Hide Map" : "Show Map Picker"}
          </button>
        </div>

        {showMap && (
          <div className="border border-[color:var(--border)] rounded-lg p-4 bg-gray-50">
            <MapPicker
              lat={attributes.lat || 13.7563}
              lng={attributes.lon || 100.5018}
              onCoordinatesChange={handleCoordinatesChange}
              onAddressChange={handleAddressChange}
              height="400px"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Latitude"
            type="number"
            step="any"
            value={attributes.lat || ""}
            onChange={(e) => onUpdate("lat", e.target.value ? parseFloat(e.target.value) : undefined)}
            onBlur={(e) => onUpdate("lat", e.target.value ? parseFloat(e.target.value) : undefined)}
            error={errors["attributes.lat"]}
            placeholder="13.7563"
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            value={attributes.lon || ""}
            onChange={(e) => onUpdate("lon", e.target.value ? parseFloat(e.target.value) : undefined)}
            onBlur={(e) => onUpdate("lon", e.target.value ? parseFloat(e.target.value) : undefined)}
            error={errors["attributes.lon"]}
            placeholder="100.5018"
          />
        </div>
      </div>

      <Input
        label="Phone"
        value={attributes.phone || ""}
        onChange={(e) => onUpdate("phone", e.target.value)}
        onBlur={(e) => onUpdate("phone", e.target.value)}
        placeholder="+66 2 123 4567"
      />

      {/* Enhanced Opening Hours */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-[color:var(--text)]">
          Opening Hours
        </label>
        
        <div className="space-y-2">
          {DAYS.map((day) => (
            <div key={day.key} className="grid grid-cols-3 gap-3 items-center">
              <label className="text-sm text-[color:var(--text)]">
                {day.label}
              </label>
              <input
                type="time"
                value={hours[day.key]?.split("-")[0] || ""}
                onChange={(e) => {
                  const endTime = hours[day.key]?.split("-")[1] || "";
                  const newTime = e.target.value ? `${e.target.value}-${endTime}` : "";
                  updateHours(day.key, newTime);
                }}
                className="px-3 py-2 border border-[color:var(--border)] rounded-md text-sm"
                placeholder="09:00"
              />
              <input
                type="time"
                value={hours[day.key]?.split("-")[1] || ""}
                onChange={(e) => {
                  const startTime = hours[day.key]?.split("-")[0] || "";
                  const newTime = e.target.value ? `${startTime}-${e.target.value}` : "";
                  updateHours(day.key, newTime);
                }}
                className="px-3 py-2 border border-[color:var(--border)] rounded-md text-sm"
                placeholder="18:00"
              />
            </div>
          ))}
        </div>

        <div className="text-xs text-[color:var(--text-muted)]">
          Leave empty for closed days. Use 24-hour format (e.g., 09:00-18:00)
        </div>
      </div>

      {/* Additional Place Attributes */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Website"
          type="url"
          value={attributes.website || ""}
          onChange={(e) => onUpdate("website", e.target.value)}
          onBlur={(e) => onUpdate("website", e.target.value)}
          placeholder="https://example.com"
        />
        <Input
          label="Category"
          value={attributes.category || ""}
          onChange={(e) => onUpdate("category", e.target.value)}
          onBlur={(e) => onUpdate("category", e.target.value)}
          placeholder="Restaurant, Shopping Mall, etc."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Price Range"
          value={attributes.price_range || ""}
          onChange={(e) => onUpdate("price_range", e.target.value)}
          onBlur={(e) => onUpdate("price_range", e.target.value)}
          placeholder="$ or $$ or $$$ or $$$$"
        />
        <Input
          label="Rating"
          type="number"
          step="0.1"
          min="0"
          max="5"
          value={attributes.rating || ""}
          onChange={(e) => onUpdate("rating", e.target.value ? parseFloat(e.target.value) : undefined)}
          onBlur={(e) => onUpdate("rating", e.target.value ? parseFloat(e.target.value) : undefined)}
          placeholder="4.5"
        />
      </div>

      {/* Image Management */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-[color:var(--text)] border-b border-[color:var(--border)] pb-2">
          Images
        </h4>
        
        <ImageUploader
          images={attributes.images || []}
          onImagesChange={(images) => onUpdate("images", images)}
          maxImages={10}
          allowUrlInput={true}
        />
      </div>
    </div>
  );
}
