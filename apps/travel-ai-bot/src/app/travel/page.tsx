"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
// Removed import from deleted agents/index.ts - now using database-driven agents
const allAgentSets = {}; // Fallback empty object
const defaultAgentSetKey = 'default';
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { EventProvider } from "@/app/contexts/EventContext";
import { MapPinIcon, QuestionMarkCircleIcon, ExclamationTriangleIcon, BuildingOfficeIcon, MapIcon } from "@heroicons/react/24/outline";
import { usePersistedLanguage } from "@/app/hooks/usePersistedLanguage";
import { usePersistedChannel } from "@/app/hooks/usePersistedChannel";
import { useTravelTheme, type TravelTheme } from "@/app/hooks/useTravelTheme";
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
  Icon: React.ComponentType<any>;
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

function TravelIndexPageContent() {
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
  // Persisted chat channel (defaults to text)
  const [activeChannel, setActiveChannel] = usePersistedChannel('normal');
  const searchParams = useSearchParams();
  const [embeddedPath, setEmbeddedPath] = useState<string | null>(null);
  const { theme, setTheme } = useTravelTheme("warm");

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
        id = crypto.randomUUID();
        try { localStorage.setItem(key, id); } catch {}
      }
      setFrontendSessionId(id);
    } catch {
      setFrontendSessionId(crypto.randomUUID());
    }
  }, []);

  // Apply theme classes to <html> to avoid flashes/resets during hydration
  useEffect(() => {
    try {
      const root = document.documentElement;
      // Ensure base theme class
      if (!root.classList.contains('ta-theme')) root.classList.add('ta-theme');
      // Remove previous ta-theme-* classes
      const toRemove: string[] = [];
      root.classList.forEach((c) => { if (c.startsWith('ta-theme-')) toRemove.push(c); });
      toRemove.forEach((c) => root.classList.remove(c));
      // Add current theme
      root.classList.add(`ta-theme-${theme}`);
    } catch {}
  }, [theme]);

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


  const themeClass = `ta-theme ta-theme-${theme}`;

  return (
    <main className={`min-h-screen ta-page ${themeClass}`} style={{ background: '#ffffff' }} data-testid="ta-page" suppressHydrationWarning>
      {/* Header */}
      <div className="sticky top-0 z-40 ta-topbar" style={{ background: 'var(--ta-primary)', color: 'var(--ta-on-primary)', borderBottom: '1px solid var(--ta-border)' }} data-testid="ta-topbar">
        <div className="max-w-full px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md" style={{ background: 'var(--ta-on-primary)' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--ta-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold ta-app-title" style={{ color: 'var(--ta-on-primary)' }} data-testid="ta-app-title">Travel Discovery</h1>
                  <p className="text-xs font-medium" style={{ color: 'var(--ta-on-primary)', opacity: 0.9 }}>Your intelligent travel companion</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 ta-lang-switcher" data-testid="ta-lang-switcher">
              <div className="flex items-center rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
                <button
                  onClick={() => setCurrentLanguage('en')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentLanguage === 'en' 
                      ? 'text-[color:var(--ta-primary)] bg-white shadow-md'
                      : ''
                  }`}
                  style={ currentLanguage === 'en' 
                    ? {}
                    : { color: 'var(--ta-on-primary)' } }
                  title="English"
                >
                  🇺🇸 EN
                </button>
                <button
                  onClick={() => setCurrentLanguage('th')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    currentLanguage === 'th' 
                      ? 'text-[color:var(--ta-primary)] bg-white shadow-md'
                      : ''
                  }`}
                  style={ currentLanguage === 'th' 
                    ? {}
                    : { color: 'var(--ta-on-primary)' } }
                  title="ไทย"
                >
                  🇹🇭 TH
                </button>
              </div>
              {/* Theme switcher */}
              <div className="ml-2">
                <select
                  aria-label="Theme"
                  className="text-sm rounded-md px-2 py-1 border"
                  style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'var(--ta-on-primary)', background: 'rgba(255,255,255,0.15)' }}
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as TravelTheme)}
                >
                  <option value="warm">Warm Professional</option>
                  <option value="pro">Professional</option>
                  <option value="island">Island</option>
                  <option value="sunset">Sunset</option>
                  <option value="tropical">Tropical</option>
                  <option value="ocean">Ocean</option>
                  <option value="forest">Forest</option>
                  <option value="desert">Desert</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen ta-layout" style={{ height: 'calc(100vh - 68px)' }} data-testid="ta-layout">
        {/* Left Panel – Menu */}
        <div className="flex-1 flex flex-col backdrop-blur-sm ta-left-panel min-h-0" style={{ width: `calc(100% - ${chatWidth}px)`, background: 'var(--ta-surface)' }} data-testid="ta-left-panel">
          {/* Header Section */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--ta-border)', backgroundImage: 'linear-gradient(to right, var(--ta-panel-from), var(--ta-panel-to))' }}>
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--ta-text)' }}>{currentLanguage === 'th' ? 'สำรวจคุณสมบัติ' : 'Explore Features'}</h2>
            <p className="text-sm font-medium" style={{ color: 'var(--ta-muted)' }}>{currentLanguage === 'th' ? 'เลือกหมวดด้านล่างเพื่อเริ่มต้นการเดินทาง' : 'Choose a category below to start your journey'}</p>
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
                    className={`group block h-full rounded-xl backdrop-blur-sm p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2`}
                    style={{ backgroundImage: 'linear-gradient(to bottom right, var(--ta-card-from), var(--ta-card-to))', border: '1px solid var(--ta-card-border)' }}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300`} style={{ backgroundImage: 'linear-gradient(to bottom right, var(--ta-icon-from), var(--ta-icon-to))' }}>
                          <Icon className="w-6 h-6" style={{ color: 'var(--ta-on-accent)' }} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-bold transition-colors leading-tight" style={{ color: 'var(--ta-text)' }}>{title}</h3>
                        </div>
                      </div>
                      
                      <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: 'var(--ta-muted)' }}>{description}</p>
                      
                      <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.5)' }}>
                        <span className={`text-xs font-semibold group-hover:opacity-80 transition-opacity`} style={{ color: 'var(--ta-link)' }}>
                          {currentLanguage === 'th' ? 'เรียนรู้เพิ่มเติม' : 'Learn more'}
                        </span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center group-hover:bg-white/80 transition-all duration-200`} style={{ background: 'rgba(255,255,255,0.6)', color: 'var(--ta-link)' }}>
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
          className="w-px cursor-col-resize transition-all duration-200 relative group"
          onMouseDown={() => setIsResizing(true)}
          title="Drag to resize chat"
          style={{ background: 'var(--ta-border)' }}
        >
          
        </div>

        {/* Right Panel – Chat */}
        <div className="backdrop-blur-sm ta-right-panel" style={{ width: `${chatWidth}px`, borderLeft: '1px solid var(--ta-border)', backgroundImage: 'linear-gradient(to bottom, var(--ta-panel-from), var(--ta-panel-to))' }} data-testid="ta-right-panel">
          <div className="h-full flex flex-col">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--ta-border)', backgroundImage: 'linear-gradient(to right, var(--ta-panel-from), var(--ta-panel-to))' }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundImage: 'linear-gradient(to bottom right, var(--ta-btn-from), var(--ta-btn-to))' }}>
                  <svg className="w-4 h-4" style={{ color: 'var(--ta-on-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold" style={{ color: 'var(--ta-text)' }}>AI Assistant</h3>
                <div className="ml-auto relative">
                  <button
                    type="button"
                    onClick={() => setIsAgentPickerOpen((v) => !v)}
                    className="inline-flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 shadow-sm hover:bg-white focus:outline-none"
                    style={{ border: '1px solid var(--ta-border)', color: 'var(--ta-muted)', background: 'var(--ta-panel-from)' }}
                    aria-haspopup="listbox"
                    aria-expanded={isAgentPickerOpen}
                    title="Select agent"
                  >
                    <span className="truncate max-w-[180px]">{agentSetKey} / {agentName}</span>
                    <ChevronDownIcon className="w-4 h-4" style={{ color: 'var(--ta-link)' }} />
                  </button>
                  {isAgentPickerOpen && (
                    <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-auto rounded-lg shadow-lg backdrop-blur-sm z-10" style={{ border: '1px solid var(--ta-border)', background: 'rgba(255,255,255,0.95)' }}>
                      <div className="p-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ta-muted)' }}>Choose Agent</div>
                      <div className="py-1">
                        {Object.entries(allAgentSets).map(([setKey, agents]) => (
                          <div key={setKey} className="px-2 py-1">
                            <div className="px-2 py-1 text-[11px] font-semibold" style={{ color: 'var(--ta-muted)' }}>{setKey}</div>
                            <ul className="space-y-0.5">
                              {(agents as any[]).map((a) => {
                                const selected = setKey === agentSetKey && a.name === agentName;
                                return (
                                  <li key={`${setKey}::${a.name}`}>
                                    <button
                                      type="button"
                                      onClick={() => { setAgentSetKey(setKey); setAgentName(a.name); setIsAgentPickerOpen(false); }}
                                      className={`w-full text-left px-2 py-1.5 rounded-md transition-colors`}
                                      style={ selected ? { background: 'rgba(254,215,170,0.35)', color: 'var(--ta-text)' } : { color: 'var(--ta-muted)' } }
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm">{a.name}</span>
                                        {selected && <CheckIcon className="w-4 h-4" style={{ color: 'var(--ta-link)' }} />}
                                      </div>
                                      {a.publicDescription && (
                                        <div className="text-[11px] line-clamp-2" style={{ color: 'var(--ta-muted)' }}>{a.publicDescription}</div>
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
              <p className="text-xs font-medium" style={{ color: 'var(--ta-muted)' }}>Ask me anything about your travel plans</p>
            </div>
            <div className="flex-1 min-h-0">
              <EventProvider>
                <ChatInterface
                  sessionId={frontendSessionId || crypto.randomUUID()}
                  activeChannel={activeChannel}
                  onChannelSwitch={setActiveChannel}
                  isProcessing={false}
                  agentSetKey={agentSetKey}
                  agentName={agentName}
                  baseLanguage={currentLanguage}
                  onAgentSelected={(setKey, name) => { setAgentSetKey(setKey); setAgentName(name); }}
                />
              </EventProvider>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Main wrapper component with Suspense
export default function TravelIndexPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-lg font-medium">Loading Travel Page...</p>
        </div>
      </div>
    }>
      <TravelIndexPageContent />
    </Suspense>
  );
}


