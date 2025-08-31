"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";
import { MapPinIcon, QuestionMarkCircleIcon, ExclamationTriangleIcon, BuildingOfficeIcon, MapIcon } from "@heroicons/react/24/outline";

type FeatureItem = {
  key: string;
  href: string;
  title: string;
  description: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const FEATURES: FeatureItem[] = [
  { key: "our-hotel", href: "/travel/our-hotel", title: "Our Resort", description: "Property info and services", Icon: BuildingOfficeIcon },
  { key: "attractions", href: "/travel/places?category=Attraction", title: "Attractions", description: "Discover top attractions", Icon: MapPinIcon },
  { key: "nearby", href: "/travel/places?category=Nearby", title: "Place Nearby", description: "Explore places around you", Icon: MapPinIcon },
    { key: "taxi", href: "/travel/taxi", title: "Taxi & Transportation", description: "How to get around, fares, and apps", Icon: MapPinIcon },
    { key: "rent", href: "/travel/rent", title: "Car & Motorbike Rent", description: "Browse vehicle types and prices", Icon: MapPinIcon },
  { key: "tours", href: "/travel/tours", title: "Tours", description: "Popular tours and bookings", Icon: MapIcon },
  { key: "emergency", href: "/travel/emergency", title: "Emergency", description: "Important contacts and safety", Icon: ExclamationTriangleIcon },
  { key: "help", href: "/travel/help", title: "Help", description: "How to use the app and common questions", Icon: QuestionMarkCircleIcon },
];

export default function TravelIndexPage() {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setChatWidth(Math.max(320, Math.min(720, newWidth)));
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);


  return (
    <main className="min-h-screen bg-stone-50 ta-page" data-testid="ta-page">
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm ta-topbar" data-testid="ta-topbar">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-stone-900 ta-app-title" data-testid="ta-app-title">🗺️ Travel Discovery</h1>
            </div>
            <div className="flex items-center space-x-2 ta-lang-switcher" data-testid="ta-lang-switcher">
              <button
                onClick={() => setCurrentLanguage('en')}
                className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                  currentLanguage === 'en' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-stone-800 border-stone-300 hover:border-emerald-400'
                }`}
                title="English"
              >
                🇺🇸 EN
              </button>
              <button
                onClick={() => setCurrentLanguage('th')}
                className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                  currentLanguage === 'th' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-stone-800 border-stone-300 hover:border-emerald-400'
                }`}
                title="ไทย"
              >
                🇹🇭 TH
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen ta-layout" style={{ height: 'calc(100vh - 80px)' }} data-testid="ta-layout">
        {/* Left Panel – Menu */}
        <div className="flex-1 flex flex-col bg-white ta-left-panel min-h-0" style={{ width: `calc(100% - ${chatWidth}px)` }} data-testid="ta-left-panel">
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage === 'th' ? 'เมนูคุณสมบัติ' : 'Features'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage === 'th' ? 'เลือกหมวดด้านล่างเพื่อเริ่มต้น' : 'Pick a section below to get started.'}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-5" data-testid="ta-menu-list">
              {FEATURES.map(({ key, href, title, description, Icon }) => (
                <Link
                  key={key}
                  href={href}
                  aria-label={title}
                  className="group block h-full rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center ring-1 ring-emerald-100">
                      <Icon className="w-7 h-7" />
                      </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold text-stone-900 truncate">{title}</div>
                      <div className="mt-1 text-sm text-stone-600 line-clamp-2">{description}</div>
                      <div className="mt-4 inline-flex items-center text-emerald-700 text-sm font-medium group-hover:underline">
                        {currentLanguage === 'th' ? 'ไปที่หน้า' : 'Open'}
                        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          </div>

          {/* Divider */}
          <div
            className="w-1 bg-stone-300 hover:bg-emerald-400 cursor-col-resize transition-colors"
            onMouseDown={() => setIsResizing(true)}
            title="Drag to resize chat"
          />

        {/* Right Panel – Chat */}
        <div className="bg-white border-l border-stone-200 ta-right-panel" style={{ width: `${chatWidth}px` }} data-testid="ta-right-panel">
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0">
              <EventProvider>
                <ChatInterface
                  sessionId={`sess_${Date.now()}`}
                  activeChannel={"normal"}
                  onChannelSwitch={() => {}}
                  isProcessing={false}
                />
              </EventProvider>
              </div>
            </div>
          </div>
      </div>
    </main>
  );
}


