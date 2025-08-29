"use client";

import React, { createContext, useContext, useState, FC, PropsWithChildren } from "react";
import { v4 as uuidv4 } from "uuid";
import { LoggedEvent } from "@/app/types";

type EventContextValue = {
  loggedEvents: LoggedEvent[];
  logClientEvent: (eventObj: Record<string, any>, eventNameSuffix?: string) => void;
  logServerEvent: (eventObj: Record<string, any>, eventNameSuffix?: string) => void;
  toggleExpand: (id: number | string) => void;
};

const EventContext = createContext<EventContextValue | undefined>(undefined);

export const EventProvider: FC<PropsWithChildren> = ({ children }) => {
  const [loggedEvents, setLoggedEvents] = useState<LoggedEvent[]>([]);

  const MAX_LOG_EVENTS = 400;

  function sanitizeEventData(data: any, depth: number = 0): any {
    if (depth > 3) {
      return "[omitted: max depth reached]";
    }
    if (data === null || data === undefined) return data;
    if (typeof data === "string") {
      return data.length > 500 ? `${data.slice(0, 500)}...[+${data.length - 500} chars]` : data;
    }
    if (typeof data === "number" || typeof data === "boolean") return data;
    if (Array.isArray(data)) {
      if (data.length > 20) {
        return `Array(len=${data.length}) [truncated]`;
      }
      return data.map((item) => sanitizeEventData(item, depth + 1));
    }
    if (typeof data === "object") {
      const obj: Record<string, any> = {};
      const keys = Object.keys(data);
      for (const key of keys) {
        if (
          key.toLowerCase().includes("audio") ||
          key.toLowerCase().includes("pcm") ||
          key.toLowerCase().includes("bytes") ||
          key.toLowerCase().includes("buffer") ||
          key.toLowerCase().includes("blob")
        ) {
          const val = data[key];
          const sizeHint = typeof val === "string" ? val.length : Array.isArray(val) ? val.length : undefined;
          obj[key] = `[omitted binary data${sizeHint ? ` len=${sizeHint}` : ""}]`;
          continue;
        }
        obj[key] = sanitizeEventData(data[key], depth + 1);
      }
      return obj;
    }
    return "[unserializable]";
  }

  function addLoggedEvent(direction: "client" | "server", eventName: string, eventData: Record<string, any>) {
    const id = eventData.event_id || uuidv4();
    const sanitized = sanitizeEventData(eventData);
    setLoggedEvents((prev) => {
      const next = [
        ...prev,
        {
          id,
          direction,
          eventName,
          eventData: sanitized,
          timestamp: new Date().toLocaleTimeString(),
          expanded: false,
        },
      ];
      return next.length > MAX_LOG_EVENTS ? next.slice(next.length - MAX_LOG_EVENTS) : next;
    });
  }

  const logClientEvent: EventContextValue["logClientEvent"] = (eventObj, eventNameSuffix = "") => {
    const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
    addLoggedEvent("client", name, eventObj);
  };

  const logServerEvent: EventContextValue["logServerEvent"] = (eventObj, eventNameSuffix = "") => {
    const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
    addLoggedEvent("server", name, eventObj);
  };

  const toggleExpand: EventContextValue["toggleExpand"] = (id) => {
    setLoggedEvents((prev) =>
      prev.map((log) => {
        if (log.id === id) {
          return { ...log, expanded: !log.expanded };
        }
        return log;
      })
    );
  };


  return (
    <EventContext.Provider
      value={{ loggedEvents, logClientEvent, logServerEvent, toggleExpand }}
    >
      {children}
    </EventContext.Provider>
  );
};

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
}