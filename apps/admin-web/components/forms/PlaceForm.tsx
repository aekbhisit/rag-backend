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
    return attributes.opening_hours || attributes.hours || {};
  });
  const [tagsInput, setTagsInput] = React.useState<string>(() => (attributes.tags || []).join(', '));

  const updateHours = (day: string, time: string) => {
    const newHours = { ...hours, [day]: time };
    setHours(newHours);
    onUpdate("opening_hours", Object.keys(newHours).length > 0 ? newHours : undefined);
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
        label="Place Key"
        value={attributes.place_key || ""}
        onChange={(e) => onUpdate("place_key", e.target.value || undefined)}
        onBlur={(e) => onUpdate("place_key", e.target.value || undefined)}
        placeholder="stable-key-for-multilingual-linking"
      />
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
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          value={attributes.email || ""}
          onChange={(e) => onUpdate("email", e.target.value || undefined)}
          onBlur={(e) => onUpdate("email", e.target.value || undefined)}
          placeholder="contact@example.com"
        />
        <Input
          label="Timezone"
          value={attributes.timezone || ""}
          onChange={(e) => onUpdate("timezone", e.target.value || undefined)}
          onBlur={(e) => onUpdate("timezone", e.target.value || undefined)}
          placeholder="Asia/Bangkok"
        />
      </div>

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

      {/* Additional Place Attributes */
      }
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
          label="Booking URL"
          type="url"
          value={attributes.booking_url || ""}
          onChange={(e) => onUpdate("booking_url", e.target.value || undefined)}
          onBlur={(e) => onUpdate("booking_url", e.target.value || undefined)}
          placeholder="https://example.com/book"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Google Maps URL"
          type="url"
          value={attributes.maps_url || ""}
          onChange={(e) => onUpdate("maps_url", e.target.value || undefined)}
          onBlur={(e) => onUpdate("maps_url", e.target.value || undefined)}
          placeholder="https://www.google.com/maps/place/?q=place_id:..."
        />
        <Input
          label="Google Place ID"
          value={attributes.google_place_id || ""}
          onChange={(e) => onUpdate("google_place_id", e.target.value || undefined)}
          onBlur={(e) => onUpdate("google_place_id", e.target.value || undefined)}
          placeholder="ChIJxxxxxxxxxxxx"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Menu URL"
          type="url"
          value={attributes.menu_url || ""}
          onChange={(e) => onUpdate("menu_url", e.target.value || undefined)}
          onBlur={(e) => onUpdate("menu_url", e.target.value || undefined)}
          placeholder="https://example.com/menu"
        />
        <Input
          label="Timezone Note"
          value={attributes.timezone_note || ""}
          onChange={(e) => onUpdate("timezone_note", e.target.value || undefined)}
          onBlur={(e) => onUpdate("timezone_note", e.target.value || undefined)}
          placeholder="Optional note to explain local time context"
        />
      </div>

      {/* Rating & Pricing */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-[color:var(--text)]">Rating & Pricing</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Input
            label="Rating"
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={(attributes.rating_pricing?.rating ?? attributes.rating) || ""}
            onChange={(e) => onUpdate("rating_pricing", { ...(attributes.rating_pricing || {}), rating: e.target.value ? parseFloat(e.target.value) : undefined })}
            onBlur={(e) => onUpdate("rating_pricing", { ...(attributes.rating_pricing || {}), rating: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="4.5"
          />
          <Input
            label="Review Count"
            type="number"
            min="0"
            value={(attributes.rating_pricing?.review_count ?? attributes.review_count) || ""}
            onChange={(e) => onUpdate("rating_pricing", { ...(attributes.rating_pricing || {}), review_count: e.target.value ? parseInt(e.target.value) : undefined })}
            onBlur={(e) => onUpdate("rating_pricing", { ...(attributes.rating_pricing || {}), review_count: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="120"
          />
          <Input
            label="Rating Source"
            value={(attributes.rating_pricing?.rating_source ?? attributes.rating_source) || ""}
            onChange={(e) => onUpdate("rating_pricing", { ...(attributes.rating_pricing || {}), rating_source: e.target.value || undefined })}
            onBlur={(e) => onUpdate("rating_pricing", { ...(attributes.rating_pricing || {}), rating_source: e.target.value || undefined })}
            placeholder="Google, Tripadvisor, ..."
          />
          <Input
            label="Price Level (1-4)"
            type="number"
            min="1"
            max="4"
            value={(attributes.rating_pricing?.price_level ?? attributes.price_level) || ""}
            onChange={(e) => onUpdate("rating_pricing", { ...(attributes.rating_pricing || {}), price_level: e.target.value ? parseInt(e.target.value) : undefined })}
            onBlur={(e) => onUpdate("rating_pricing", { ...(attributes.rating_pricing || {}), price_level: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="2"
          />
          <Input
            label="Price Range"
            value={(attributes.rating_pricing?.price_range ?? attributes.price_range) || ""}
            onChange={(e) => onUpdate("rating_pricing", { ...(attributes.rating_pricing || {}), price_range: e.target.value || undefined })}
            onBlur={(e) => onUpdate("rating_pricing", { ...(attributes.rating_pricing || {}), price_range: e.target.value || undefined })}
            placeholder="$, $$, $$$, $$$$"
          />
          <Input
            label="Currency"
            value={(attributes.rating_pricing?.currency ?? attributes.currency) || ""}
            onChange={(e) => onUpdate("rating_pricing", { ...(attributes.rating_pricing || {}), currency: e.target.value || undefined })}
            onBlur={(e) => onUpdate("rating_pricing", { ...(attributes.rating_pricing || {}), currency: e.target.value || undefined })}
            placeholder="THB"
          />
        </div>
      </div>

      {/* Social & Links */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-[color:var(--text)]">Social & Links</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Input
            label="Facebook"
            value={attributes.social?.facebook || ""}
            onChange={(e) => onUpdate("social", { ...(attributes.social || {}), facebook: e.target.value || undefined })}
            onBlur={(e) => onUpdate("social", { ...(attributes.social || {}), facebook: e.target.value || undefined })}
            placeholder="https://facebook.com/..."
          />
          <Input
            label="Instagram"
            value={attributes.social?.instagram || ""}
            onChange={(e) => onUpdate("social", { ...(attributes.social || {}), instagram: e.target.value || undefined })}
            onBlur={(e) => onUpdate("social", { ...(attributes.social || {}), instagram: e.target.value || undefined })}
            placeholder="https://instagram.com/..."
          />
          <Input
            label="LINE"
            value={attributes.social?.line || ""}
            onChange={(e) => onUpdate("social", { ...(attributes.social || {}), line: e.target.value || undefined })}
            onBlur={(e) => onUpdate("social", { ...(attributes.social || {}), line: e.target.value || undefined })}
            placeholder="@yourlineid"
          />
          <Input
            label="WhatsApp"
            value={attributes.social?.whatsapp || ""}
            onChange={(e) => onUpdate("social", { ...(attributes.social || {}), whatsapp: e.target.value || undefined })}
            onBlur={(e) => onUpdate("social", { ...(attributes.social || {}), whatsapp: e.target.value || undefined })}
            placeholder="+66 ..."
          />
        </div>
      </div>

      {/* Amenities */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-[color:var(--text)]">Amenities</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { key: 'accepts_reservations', label: 'Accepts reservations' },
            { key: 'has_delivery', label: 'Delivery' },
            { key: 'has_takeout', label: 'Takeout' },
            { key: 'wheelchair_accessible', label: 'Wheelchair accessible' },
            { key: 'parking', label: 'Parking' },
            { key: 'wifi', label: 'Wi‑Fi' },
            { key: 'family_friendly', label: 'Family friendly' },
            { key: 'pet_friendly', label: 'Pet friendly' },
            { key: 'smoking_area', label: 'Smoking area' },
          ].map((opt) => (
            <label key={opt.key} className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!attributes.amenities?.[opt.key]}
                onChange={(e) => onUpdate('amenities', { ...(attributes.amenities || {}), [opt.key]: e.target.checked || undefined })}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Input
          label="Tags (comma separated)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          onBlur={() => {
            const tags = tagsInput
              .split(/[\,\n;]+/)
              .map(s => s.trim())
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i);
            onUpdate('tags', tags.length ? tags : undefined);
          }}
          placeholder="resort, spa, beachfront"
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
