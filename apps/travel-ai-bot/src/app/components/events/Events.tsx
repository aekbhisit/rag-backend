"use client";

import React, { useRef, useEffect, useState } from "react";
import { useEvent } from "@/app/contexts/EventContext";
import { LoggedEvent } from "@/app/types";
import WebContent from "./WebContent";

export interface EventsProps {
  isExpanded: boolean;
}

function Events({ isExpanded }: EventsProps) {
  const [prevEventLogs, setPrevEventLogs] = useState<LoggedEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"logs" | "webcontent">("logs");
  const eventLogsContainerRef = useRef<HTMLDivElement | null>(null);

  const { loggedEvents, toggleExpand } = useEvent();

  const getDirectionArrow = (direction: string) => {
    if (direction === "client") return { symbol: "▲", color: "#7f5af0" };
    if (direction === "server") return { symbol: "▼", color: "#2cb67d" };
    return { symbol: "•", color: "#555" };
  };

  useEffect(() => {
    const hasNewEvent = loggedEvents.length > prevEventLogs.length;

    if (isExpanded && hasNewEvent && eventLogsContainerRef.current && activeTab === "logs") {
      eventLogsContainerRef.current.scrollTop =
        eventLogsContainerRef.current.scrollHeight;
    }

    setPrevEventLogs(loggedEvents);
  }, [loggedEvents, isExpanded, activeTab]);

  return (
    <div
      className={
        (isExpanded ? "w-1/2 overflow-auto" : "w-0 overflow-hidden opacity-0") +
        " transition-all rounded-xl duration-200 ease-in-out flex-col bg-white"
      }
      ref={eventLogsContainerRef}
    >
      {isExpanded && (
        <div className="flex flex-col h-full">
          {/* Tab Navigation */}
          <div className="flex items-center border-b bg-white rounded-t-xl">
            <button
              className={`px-6 py-3.5 font-semibold text-base ${
                activeTab === "logs" 
                  ? "text-slate-800 border-b-2 border-blue-500" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setActiveTab("logs")}
            >
              Logs
            </button>
            <button
              className={`px-6 py-3.5 font-semibold text-base ${
                activeTab === "webcontent" 
                  ? "text-slate-800 border-b-2 border-blue-500" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setActiveTab("webcontent")}
            >
              Web Content
            </button>
          </div>

          {/* Logs Tab Content */}
          {activeTab === "logs" && (
            <div className="overflow-auto flex-1">
              {loggedEvents.map((log) => {
                const arrowInfo = getDirectionArrow(log.direction);
                const isError =
                  log.eventName.toLowerCase().includes("error") ||
                  log.eventData?.response?.status_details?.error != null;

                return (
                  <div
                    key={log.id}
                    className="border-t border-gray-200 py-2 px-6 font-mono"
                  >
                    <div
                      onClick={() => toggleExpand(log.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center flex-1">
                        <span
                          style={{ color: arrowInfo.color }}
                          className="ml-1 mr-2"
                        >
                        {arrowInfo.symbol}
                        </span>
                        <span
                          className={
                            "flex-1 text-sm " +
                            (isError ? "text-red-600" : "text-gray-800")
                          }
                        >
                          {log.eventName}
                        </span>
                      </div>
                      <div className="text-gray-500 ml-1 text-xs whitespace-nowrap">
                        {log.timestamp}
                      </div>
                    </div>

                    {log.expanded && log.eventData && (
                      <div className="text-gray-800 text-left">
                        <pre className="border-l-2 ml-1 border-gray-200 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2">
                          {JSON.stringify(log.eventData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Web Content Tab */}
          {activeTab === "webcontent" && (
            <div className="overflow-auto flex-1">
              <WebContent />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Events;
