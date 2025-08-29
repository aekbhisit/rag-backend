"use client";

import React from "react";
import { Input } from "../ui/Input";
import { ImageUploader } from "../ui/ImageUploader";

interface ProductFormProps {
  attributes: Record<string, any>;
  errors: Record<string, string>;
  onUpdate: (key: string, value: any) => void;
}

export function ProductForm({ attributes, errors, onUpdate }: ProductFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Product Key"
          value={attributes.product_key || ""}
          onChange={(e) => onUpdate("product_key", e.target.value || undefined)}
          onBlur={(e) => onUpdate("product_key", e.target.value || undefined)}
          placeholder="stable-key-for-rent-items"
        />
        <Input
          label="Slug"
          value={attributes.slug || ""}
          onChange={(e) => onUpdate("slug", e.target.value || undefined)}
          onBlur={(e) => onUpdate("slug", e.target.value || undefined)}
          placeholder="economy-car"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Type"
          value={attributes.product_type || attributes.type || ""}
          onChange={(e) => onUpdate("product_type", e.target.value || undefined)}
          onBlur={(e) => onUpdate("product_type", e.target.value || undefined)}
          placeholder="economy, suv, van, bike, scooter"
        />
        <Input
          label="Seats"
          type="number"
          min="0"
          value={attributes.seats ?? ""}
          onChange={(e) => onUpdate("seats", e.target.value ? parseInt(e.target.value) : undefined)}
          onBlur={(e) => onUpdate("seats", e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="4"
        />
        <Input
          label="Transmission"
          value={attributes.transmission || ""}
          onChange={(e) => onUpdate("transmission", e.target.value || undefined)}
          onBlur={(e) => onUpdate("transmission", e.target.value || undefined)}
          placeholder="Auto / Manual"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Price per day"
          type="number"
          step="0.01"
          min="0"
          value={attributes.price_per_day ?? ""}
          onChange={(e) => onUpdate("price_per_day", e.target.value ? parseFloat(e.target.value) : undefined)}
          onBlur={(e) => onUpdate("price_per_day", e.target.value ? parseFloat(e.target.value) : undefined)}
          placeholder="900"
        />
        <Input
          label="Currency"
          value={attributes.currency || "THB"}
          onChange={(e) => onUpdate("currency", e.target.value || undefined)}
          onBlur={(e) => onUpdate("currency", e.target.value || undefined)}
          placeholder="THB"
        />
        <Input
          label="Deposit"
          type="number"
          step="0.01"
          min="0"
          value={attributes.deposit ?? ""}
          onChange={(e) => onUpdate("deposit", e.target.value ? parseFloat(e.target.value) : undefined)}
          onBlur={(e) => onUpdate("deposit", e.target.value ? parseFloat(e.target.value) : undefined)}
          placeholder="2000"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Min Age"
          type="number"
          min="0"
          value={attributes.min_age ?? ""}
          onChange={(e) => onUpdate("min_age", e.target.value ? parseInt(e.target.value) : undefined)}
          onBlur={(e) => onUpdate("min_age", e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="18"
        />
        <Input
          label="License Required"
          value={attributes.license_required || "Yes"}
          onChange={(e) => onUpdate("license_required", e.target.value || undefined)}
          onBlur={(e) => onUpdate("license_required", e.target.value || undefined)}
          placeholder="Yes/No"
        />
      </div>

      <ImageUploader
        images={attributes.images || []}
        onImagesChange={(images) => onUpdate("images", images)}
        maxImages={10}
        allowUrlInput={true}
      />
    </div>
  );
}


