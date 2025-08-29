"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { allAgentSets, defaultAgentSetKey } from "@/app/agents";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { EventProvider } from "@/app/contexts/EventContext";
import { MapPinIcon, QuestionMarkCircleIcon, ExclamationTriangleIcon, BuildingOfficeIcon, MapIcon } from "@heroicons/react/24/outline";
import { usePersistedLanguage } from "@/app/hooks/usePersistedLanguage";
import { useSearchParams } from "next/navigation";
import TaxiTransportPage from "@/app/travel/taxi/page";
import TravelPlacesPage from "@/app/travel/places/page";
import OurHotelPage from "@/app/travel/our-hotel/page";
import RentPage from "@/app/travel/rent/page";
import ToursPage from "@/app/travel/tours/page";
import HelpPage from "@/app/travel/help/page";
import EmergencyPage from "@/app/travel/emergency/page";
import TourDetail from "@/app/travel/tours/TourDetail";
import { useCallback } from "react";

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
  // Persist language selection using custom hook
  const [currentLanguage, setCurrentLanguage] = usePersistedLanguage('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [agentSetKey, setAgentSetKey] = useState<string>(defaultAgentSetKey);
  const defaultAgentName = (allAgentSets[defaultAgentSetKey]?.[0]?.name) || 'welcomeAgent';
  const [agentName, setAgentName] = useState<string>(defaultAgentName);
  const [isAgentPickerOpen, setIsAgentPickerOpen] = useState(false);
  // Stable conversation session id persisted across reloads
  const [frontendSessionId, setFrontendSessionId] = useState<string>('');
  const searchParams = useSearchParams();
  const [embeddedPath, setEmbeddedPath] = useState<string | null>(null);

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

  // Initialize a stable conversation id from localStorage
  useEffect(() => {
    try {
      const key = 'conversation_session_id';
      let id = localStorage.getItem(key) || '';
      if (!id) {
        id = `sess_${Date.now()}`;
        try { localStorage.setItem(key, id); } catch {}
      }
      setFrontendSessionId(id);
    } catch {
      setFrontendSessionId(`sess_${Date.now()}`);
    }
  }, []);

  // React to URL ?content param to show embedded travel page (preserve chat)
  useEffect(() => {
    try {
      const c = searchParams.get('content');
      let p: string | null = c || null;
      try { if (p) p = decodeURIComponent(p); } catch {}
      if (p && p.startsWith('/travel')) {
        setEmbeddedPath(p);
      } else {
        setEmbeddedPath(null);
      }
    } catch {
      setEmbeddedPath(null);
    }
  }, [searchParams]);

  // Fallback: listen to popstate in case searchParams doesn't refresh in this tree
  useEffect(() => {
    const updateFromLocation = () => {
      try {
        const url = new URL(window.location.href);
        let p: string | null = url.searchParams.get('content');
        try { if (p) p = decodeURIComponent(p); } catch {}
        if (p && p.startsWith('/travel')) setEmbeddedPath(p); else setEmbeddedPath(null);
      } catch {}
    };
    updateFromLocation();
    window.addEventListener('popstate', updateFromLocation);
    return () => window.removeEventListener('popstate', updateFromLocation);
  }, []);

  // Click handler: set raw ?content=/travel/... and mirror key params (e.g., category)
  const handleCardClick = useCallback((href: string) => {
    try {
      const [path, qs] = href.split('?');
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);
      // Mirror supported params from card href (e.g., category)
      if (qs) {
        const qp = new URLSearchParams(qs);
        // Currently support category param for places
        if (qp.get('category')) params.set('category', String(qp.get('category')));
      } else {
        // If clicking plain places card without qs, clear category
        params.delete('category');
      }
      // Set content to the path
      params.set('content', path);
      const query = params.toString();
      const next = `${url.origin}${url.pathname}${query ? `?${query}` : ''}${url.hash || ''}`;
      window.history.pushState({}, '', next);
      // Trigger listeners
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {}
  }, []);


  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 ta-page" data-testid="ta-page">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-sm bg-white/90 border-b border-orange-200/60 shadow-sm ta-topbar" data-testid="ta-topbar">
        <div className="max-w-full px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-800 to-red-900 flex items-center justify-center shadow-md shadow-orange-700/25">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-orange-900 to-red-900 bg-clip-text text-transparent ta-app-title" data-testid="ta-app-title">Travel Discovery</h1>
                  <p className="text-xs text-orange-900 font-medium">Your intelligent travel companion</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 ta-lang-switcher" data-testid="ta-lang-switcher">
              <div className="flex items-center bg-orange-50 rounded-lg p-0.5 border border-orange-200">
                <button
                  onClick={() => setCurrentLanguage('en')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentLanguage === 'en' 
                      ? 'bg-gradient-to-r from-orange-800 to-red-800 text-white shadow-md shadow-orange-700/25' 
                      : 'text-orange-900 hover:text-red-900 hover:bg-orange-100/70'
                  }`}
                  title="English"
                >
                  🇺🇸 EN
                </button>
                <button
                  onClick={() => setCurrentLanguage('th')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentLanguage === 'th' 
                      ? 'bg-gradient-to-r from-orange-800 to-red-800 text-white shadow-md shadow-orange-700/25' 
                      : 'text-orange-900 hover:text-red-900 hover:bg-orange-100/70'
                  }`}
                  title="ไทย"
                >
                  🇹🇭 TH
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen ta-layout" style={{ height: 'calc(100vh - 68px)' }} data-testid="ta-layout">
        {/* Left Panel – Menu */}
        <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-sm ta-left-panel min-h-0" style={{ width: `calc(100% - ${chatWidth}px)` }} data-testid="ta-left-panel">
          {/* Header Section */}
          <div className="border-b border-orange-200/60 bg-gradient-to-r from-orange-50/90 to-red-50/90 px-4 py-3">
            <h2 className="text-lg font-bold text-gray-800 mb-1">{currentLanguage === 'th' ? 'สำรวจคุณสมบัติ' : 'Explore Features'}</h2>
            <p className="text-sm text-orange-900 font-medium">{currentLanguage === 'th' ? 'เลือกหมวดด้านล่างเพื่อเริ่มต้นการเดินทาง' : 'Choose a category below to start your journey'}</p>
          </div>

          {/* Content Area */}
          <div className={`flex-1 min-h-0 overflow-y-auto ${embeddedPath ? 'p-0' : 'p-4'}`}>
            {embeddedPath ? (
              embeddedPath === '/travel/taxi' ? (
                <TaxiTransportPage embedded />
              ) : embeddedPath.startsWith('/travel/places') ? (
                <TravelPlacesPage embedded defaultCategory="Nearby" />
              ) : embeddedPath === '/travel/our-hotel' ? (
                <OurHotelPage embedded />
              ) : embeddedPath === '/travel/rent' ? (
                <RentPage embedded />
              ) : embeddedPath === '/travel/tours' ? (
                <ToursPage embedded />
              ) : embeddedPath.startsWith('/travel/tours/') ? (
                <TourDetail embedded tourIdOrSlug={embeddedPath.replace('/travel/tours/','')} />
              ) : embeddedPath === '/travel/help' ? (
                <HelpPage embedded />
              ) : embeddedPath === '/travel/emergency' ? (
                <EmergencyPage embedded />
              ) : (
                <div className="text-sm text-gray-700">Unsupported embedded path: {embeddedPath}</div>
              )
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4" data-testid="ta-menu-list">
              {FEATURES.map(({ key, href, title, description, Icon }, index) => {
                // Define travel-themed color schemes for different features
                const getColorScheme = (featureKey: string) => {
                  switch (featureKey) {
                    case 'our-hotel':
                      return { bg: 'from-orange-50 to-red-100', icon: 'from-orange-800 to-red-900', hover: 'hover:shadow-orange-400/50', border: 'hover:border-orange-600', text: 'text-orange-950' }; // Rich mahogany hotel
                    case 'attractions':
                      return { bg: 'from-amber-50 to-orange-100', icon: 'from-amber-800 to-orange-900', hover: 'hover:shadow-amber-400/50', border: 'hover:border-amber-600', text: 'text-amber-950' }; // Coffee bean attractions
                    case 'nearby':
                      return { bg: 'from-red-50 to-orange-100', icon: 'from-red-800 to-orange-900', hover: 'hover:shadow-red-400/50', border: 'hover:border-red-600', text: 'text-red-950' }; // Dark cherry wood
                    case 'taxi':
                      return { bg: 'from-amber-50 to-red-100', icon: 'from-amber-800 to-red-900', hover: 'hover:shadow-amber-400/50', border: 'hover:border-amber-600', text: 'text-amber-950' }; // Warm coffee taxi
                    case 'rent':
                      return { bg: 'from-stone-50 to-orange-100', icon: 'from-stone-800 to-orange-900', hover: 'hover:shadow-stone-400/50', border: 'hover:border-stone-600', text: 'text-stone-950' }; // Deep cocoa brown
                    case 'tours':
                      return { bg: 'from-orange-50 to-amber-100', icon: 'from-orange-900 to-amber-900', hover: 'hover:shadow-orange-400/50', border: 'hover:border-orange-600', text: 'text-orange-950' }; // Rich espresso adventures
                    case 'emergency':
                      return { bg: 'from-red-50 to-red-100', icon: 'from-red-800 to-red-950', hover: 'hover:shadow-red-400/50', border: 'hover:border-red-600', text: 'text-red-950' }; // Deep burgundy emergency
                    case 'help':
                      return { bg: 'from-neutral-50 to-orange-100', icon: 'from-neutral-800 to-orange-900', hover: 'hover:shadow-neutral-400/50', border: 'hover:border-neutral-600', text: 'text-neutral-950' }; // Mocha support
                    default:
                      return { bg: 'from-gray-50 to-slate-100', icon: 'from-gray-500 to-slate-600', hover: 'hover:shadow-gray-200/50', border: 'hover:border-gray-400', text: 'text-gray-700' };
                  }
                };
                const scheme = getColorScheme(key);
                
                return (
                  <Link
                    key={key}
                    href={href}
                    onClick={(e) => { e.preventDefault(); handleCardClick(href); }}
                    aria-label={title}
                    className={`group block h-full rounded-xl border border-gray-200/60 bg-gradient-to-br ${scheme.bg} backdrop-blur-sm p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 ${scheme.border} hover:shadow-lg ${scheme.hover} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${scheme.icon} text-white flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-gray-800 group-hover:text-gray-900 transition-colors leading-tight">{title}</h3>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">{description}</p>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-white/50">
                        <span className={`text-xs font-semibold ${scheme.text} group-hover:opacity-80 transition-opacity`}>
                          {currentLanguage === 'th' ? 'เรียนรู้เพิ่มเติม' : 'Learn more'}
                        </span>
                        <div className={`w-6 h-6 rounded-full bg-white/60 flex items-center justify-center group-hover:bg-white/80 transition-all duration-200 ${scheme.text}`}>
                          <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-1.5 bg-gradient-to-b from-orange-300 to-red-400 hover:from-orange-400 hover:to-red-500 cursor-col-resize transition-all duration-200 relative group"
          onMouseDown={() => setIsResizing(true)}
          title="Drag to resize chat"
        >
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
        </div>

        {/* Right Panel – Chat */}
        <div className="bg-gradient-to-b from-white/90 to-orange-50/30 backdrop-blur-sm border-l border-orange-200/60 ta-right-panel" style={{ width: `${chatWidth}px` }} data-testid="ta-right-panel">
          <div className="h-full flex flex-col">
            <div className="bg-gradient-to-r from-orange-50/90 to-red-50/90 border-b border-orange-200/60 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-800 to-red-900 flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-800">AI Assistant</h3>
                <div className="ml-3 relative">
                  <button
                    type="button"
                    onClick={() => setIsAgentPickerOpen((v) => !v)}
                    className="inline-flex items-center gap-2 border border-orange-300 text-sm rounded-lg px-3 py-1.5 bg-white/90 text-orange-900 shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-400"
                    aria-haspopup="listbox"
                    aria-expanded={isAgentPickerOpen}
                    title="Select agent"
                  >
                    <span className="truncate max-w-[180px]">{agentSetKey} / {agentName}</span>
                    <ChevronDownIcon className="w-4 h-4 text-orange-700" />
                  </button>
                  {isAgentPickerOpen && (
                    <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-auto rounded-lg border border-orange-200 bg-white/95 shadow-lg backdrop-blur-sm z-10">
                      <div className="p-2 text-[11px] uppercase tracking-wide text-amber-700">Choose Agent</div>
                      <div className="py-1">
                        {Object.entries(allAgentSets).map(([setKey, agents]) => (
                          <div key={setKey} className="px-2 py-1">
                            <div className="px-2 py-1 text-[11px] font-semibold text-amber-800/90">{setKey}</div>
                            <ul className="space-y-0.5">
                              {agents.map((a) => {
                                const selected = setKey === agentSetKey && a.name === agentName;
                                return (
                                  <li key={`${setKey}::${a.name}`}>
                                    <button
                                      type="button"
                                      onClick={() => { setAgentSetKey(setKey); setAgentName(a.name); setIsAgentPickerOpen(false); }}
                                      className={`w-full text-left px-2 py-1.5 rounded-md transition-colors ${selected ? 'bg-orange-100 text-orange-900' : 'hover:bg-orange-50 text-orange-900'}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm">{a.name}</span>
                                        {selected && <CheckIcon className="w-4 h-4 text-orange-700" />}
                                      </div>
                                      {a.publicDescription && (
                                        <div className="text-[11px] text-amber-700/90 line-clamp-2">{a.publicDescription}</div>
                                      )}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-orange-900 font-medium">Ask me anything about your travel plans</p>
            </div>
            <div className="flex-1 min-h-0">
              <EventProvider>
                <ChatInterface
                  sessionId={frontendSessionId || 'sess_pending'}
                  activeChannel={"normal"}
                  onChannelSwitch={() => {}}
                  isProcessing={false}
                  agentSetKey={agentSetKey}
                  agentName={agentName}
                  baseLanguage={currentLanguage}
                />
              </EventProvider>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


