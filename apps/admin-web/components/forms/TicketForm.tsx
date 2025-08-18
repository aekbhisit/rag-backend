"use client";

import React from "react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

interface TicketFormProps {
  attributes: Record<string, any>;
  errors: Record<string, string>;
  onUpdate: (key: string, value: any) => void;
}

const TICKET_STATUSES = [
  { value: "on_sale", label: "On Sale" },
  { value: "sold_out", label: "Sold Out" },
  { value: "canceled", label: "Canceled" },
  { value: "past", label: "Past Event" }
];

const CURRENCIES = [
  { value: "THB", label: "Thai Baht (฿)" },
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" }
];

const TICKET_TYPES = [
  { value: "e_ticket", label: "E‑Ticket" },
  { value: "paper", label: "Paper" }
];

export function TicketForm({ attributes, errors, onUpdate }: TicketFormProps) {
  const [eventDateTime, setEventDateTime] = React.useState(() => {
    if (attributes.event_time) {
      // Convert ISO string to datetime-local format
      return new Date(attributes.event_time).toISOString().slice(0, 16);
    }
    return "";
  });

  const handleDateTimeChange = (value: string) => {
    setEventDateTime(value);
    if (value) {
      onUpdate("event_time", new Date(value).toISOString());
    } else {
      onUpdate("event_time", "");
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Information */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-[color:var(--text)] border-b border-[color:var(--border)] pb-2">
          Event Information
        </h4>
        <Input
          label="Event Source URL"
          type="url"
          value={attributes.source_url || ""}
          onChange={(e) => onUpdate("source_url", e.target.value)}
          placeholder="https://facebook.com/events/... or official page"
          hint="Original event page for verification"
        />
        <Input
          label="Event Location *"
          value={attributes.location || ""}
          onChange={(e) => onUpdate("location", e.target.value)}
          error={errors["attributes.location"]}
          placeholder="Impact Arena, Bangkok"
        />
        <div className="space-y-2">
          <label className="text-sm font-medium text-[color:var(--text)]">Event Date & Time *</label>
          <input
            type="datetime-local"
            value={eventDateTime}
            onChange={(e) => handleDateTimeChange(e.target.value)}
            className="w-full px-3 py-2 border border-[color:var(--border)] rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors["attributes.event_time"] && (
            <div className="text-red-600 text-sm">{errors["attributes.event_time"]}</div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Event Category" value={attributes.category || ""} onChange={(e) => onUpdate("category", e.target.value)} placeholder="Concert, Conference, Sports, etc." />
          <Input label="Event Type" value={attributes.event_type || ""} onChange={(e) => onUpdate("event_type", e.target.value)} placeholder="Indoor, Outdoor, Virtual, etc." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Organizer Name" value={attributes.organizer_name || ""} onChange={(e) => onUpdate("organizer_name", e.target.value)} placeholder="Event Organizer Ltd." />
          <Input label="Organizer Contact" value={attributes.organizer_contact || ""} onChange={(e) => onUpdate("organizer_contact", e.target.value)} placeholder="contact@organizer.com" />
        </div>
      </div>

      {/* Ticket Information */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-[color:var(--text)] border-b border-[color:var(--border)] pb-2">
          Ticket Information
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <Input label="Price" type="number" step="0.01" min="0" value={attributes.price || ""} onChange={(e) => onUpdate("price", e.target.value ? parseFloat(e.target.value) : undefined)} error={errors["attributes.price"]} placeholder="1500.00" />
          <Select label="Currency" value={attributes.currency || "THB"} onChange={(e) => onUpdate("currency", e.target.value)} options={CURRENCIES} />
          <Select label="Status" value={attributes.status || "on_sale"} onChange={(e) => onUpdate("status", e.target.value)} options={TICKET_STATUSES} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Select label="Ticket Type" value={attributes.ticket_type || "e_ticket"} onChange={(e) => onUpdate("ticket_type", e.target.value)} options={TICKET_TYPES} />
          <Input label="Zone" value={attributes.zone || ""} onChange={(e) => onUpdate("zone", e.target.value)} placeholder="A, B, VIP, etc." />
          <Input label="Seat" value={attributes.seat || ""} onChange={(e) => onUpdate("seat", e.target.value)} placeholder="Row 5, Seat 12" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Total Tickets" type="number" min="0" value={attributes.total_tickets || ""} onChange={(e) => onUpdate("total_tickets", e.target.value ? parseInt(e.target.value) : undefined)} placeholder="1000" />
          <Input label="Available Tickets" type="number" min="0" value={attributes.available_tickets || ""} onChange={(e) => onUpdate("available_tickets", e.target.value ? parseInt(e.target.value) : undefined)} placeholder="250" />
        </div>
        <Input label="Booking URL" type="url" value={attributes.booking_url || ""} onChange={(e) => onUpdate("booking_url", e.target.value)} placeholder="https://tickets.example.com/event/123" />
        <Textarea label="Other Details" value={attributes.other_details || ""} onChange={(e) => onUpdate("other_details", e.target.value)} rows={2} placeholder="Perks, inclusions, conditions, etc." />
        <Textarea label="Remark" value={attributes.remark || ""} onChange={(e) => onUpdate("remark", e.target.value)} rows={2} placeholder="Additional notes for this ticket" />
      </div>
    </div>
  );
}
