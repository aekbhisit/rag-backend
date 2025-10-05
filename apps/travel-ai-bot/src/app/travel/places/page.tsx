"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { getApiUrl } from '@/app/lib/apiHelper';
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";
import { useRouter, useSearchParams } from "next/navigation";
import { usePersistedLanguage } from "@/app/hooks/usePersistedLanguage";

type NearbyItem = {
  placeId: string;
  name: string;
  rating?: number;
  priceLevel?: number;
  distanceMeters?: number;
  openNow?: boolean;
  tags?: string[];
  address?: string;
  phone?: string;
  photos?: string[];
  description?: string; // short summary for card
  detail?: string; // additional short detail line
  longDescription?: string; // paragraph-style description
  openingHours?: Array<{day: number; open: string; close: string}>;
};

type Place = {
  id: string;
  name: string;
  categories?: string[];
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  address?: string;
  phone?: string;
  website?: string;
  facebookUrl?: string; // optional social
  lineId?: string; // optional social
  photos?: string[];
  openingHours?: Array<{day: number; open: string; close: string}>;
  coordinates?: {lat: number; lng: number};
  attributes?: {
    acceptsReservations?: boolean;
    hasDelivery?: boolean;
    hasTakeout?: boolean;
    wheelchairAccessible?: boolean;
  };
  longDescription?: string;
  distanceMeters?: number; // new: used for top-right distance card
};

type FilterState = {
  category: string;
  openNow: boolean;
  minRating: number;
  maxPrice: number;
  maxDistance: number;
  searchQuery: string;
};

// Helper: basic UUID detection (for contexts id)
function isUuidLike(id: string): boolean {
  return /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(id);
}

// Map context row to NearbyItem
function contextToNearbyItem(row: any): NearbyItem {
  const a = row?.attributes || {};
  const rating = a.rating_pricing?.rating ?? a.rating;
  const priceLevel = a.rating_pricing?.price_level ?? a.price_level;
  const tags = Array.isArray(a.tags) ? a.tags : (Array.isArray(row.keywords) ? row.keywords : []);
  const distanceMeters = typeof a.distance_meters === 'number' ? a.distance_meters : undefined;
  const address = a.address || '';
  const photoList: string[] = Array.isArray(a.images) ? a.images : [];
  return {
    placeId: row.id,
    name: row.title || 'Place',
    rating: typeof rating === 'number' ? rating : undefined,
    priceLevel: typeof priceLevel === 'number' ? priceLevel : undefined,
    distanceMeters,
    openNow: undefined,
    tags,
    address,
    phone: a.phone,
    photos: photoList,
    description: (row.body || '').slice(0, 160),
    detail: undefined,
    longDescription: row.body || '',
    openingHours: undefined,
  } as NearbyItem;
}

// Map context row to Place detail
function contextToPlace(row: any): Place {
  const a = row?.attributes || {};
  const rating = a.rating_pricing?.rating ?? a.rating;
  const priceLevel = a.rating_pricing?.price_level ?? a.price_level;
  const reviewCount = a.rating_pricing?.review_count ?? a.review_count;
  const photos: string[] = Array.isArray(a.images) ? a.images : [];
  const coords = (typeof a.lat === 'number' && typeof a.lon === 'number') ? { lat: a.lat, lng: a.lon } : undefined;
  return {
    id: row.id,
    name: row.title || 'Place',
    categories: Array.isArray(a.tags) ? a.tags : (Array.isArray(row.keywords) ? row.keywords : []),
    rating: typeof rating === 'number' ? rating : undefined,
    reviewCount: typeof reviewCount === 'number' ? reviewCount : undefined,
    priceLevel: typeof priceLevel === 'number' ? priceLevel : undefined,
    address: a.address,
    phone: a.phone,
    website: a.website,
    photos,
    openingHours: undefined,
    coordinates: coords,
    attributes: {
      acceptsReservations: a.amenities?.accepts_reservations,
      hasDelivery: a.amenities?.has_delivery,
      hasTakeout: a.amenities?.has_takeout,
      wheelchairAccessible: a.amenities?.wheelchair_accessible,
    },
    longDescription: row.body || '',
    distanceMeters: undefined,
  } as Place;
}

function TravelPlacesPageInner(props?: { embedded?: boolean; defaultCategory?: string }) {
  const embedded = !!(props && props.embedded);
  const [sessionId] = useState<string>(() => crypto.randomUUID());
  const [activeChannel, setActiveChannel] = useState<"normal" | "realtime" | "human">("normal");
  const [isProcessing] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Left panel state
  const [placeIdInput] = useState("1");
  const [place, setPlace] = useState<Place | null>(null);
  const [nearby, setNearby] = useState<NearbyItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showPlaceDetails, setShowPlaceDetails] = useState(false);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingSelectedPlace, setLoadingSelectedPlace] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>({
    category: "Restaurant",
    openNow: false,
    minRating: 0,
    maxPrice: 4,
    maxDistance: 1000,
    searchQuery: "",
  });

  // Dummy mode and pagination when place 404
  const [useDummy, setUseDummy] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Language toggle with persistence
  const [currentLanguage, setCurrentLanguage] = usePersistedLanguage('en');
  const handleLanguageChange = (lang: 'en' | 'th') => setCurrentLanguage(lang);

  // Resizable panel state
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  const categories = useMemo(() => ["Restaurant", "Attraction", "Nearby", "Hotel", "Cafe", "Shopping", "Entertainment"], []);
  const priceLabels = useMemo(() => ["$", "$$", "$$$", "$$$$"], []);

  const getPlaceholderImage = (seed: string) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/400`;
  const getShortDescription = (item: Partial<NearbyItem>): string => {
    const parts: string[] = [];
    if (item.tags && item.tags.length) parts.push(item.tags.slice(0, 2).join(", "));
    if (typeof item.distanceMeters === 'number') parts.push(`${(item.distanceMeters / 1000).toFixed(1)} km away`);
    if (!parts.length) parts.push("Popular spot");
    return parts.join(" • ");
  };
  const getShortDetail = (item: Partial<NearbyItem>): string => {
    if (item.address) return item.address;
    if ((item as any).categories && Array.isArray((item as any).categories) && (item as any).categories.length) {
      return (item as any).categories.slice(0, 3).join(" • ");
    }
    return "Recommended place";
  };
  const buildLongDescription = (name: string, item: Partial<NearbyItem>): string => {
    const parts: string[] = [];
    if ((item as any).categories && Array.isArray((item as any).categories) && (item as any).categories.length) {
      parts.push((item as any).categories.slice(0, 3).join(", "));
    } else if (item.tags && item.tags.length) {
      parts.push(item.tags.slice(0, 3).join(", "));
    }
    if (typeof item.priceLevel === 'number') {
      const priceMap = ['$', '$$', '$$$', '$$$$'];
      parts.push(`price: ${priceMap[(item.priceLevel || 1) - 1] || '$'}`);
    }
    if (typeof item.rating === 'number') {
      parts.push(`rated ${item.rating.toFixed(1)}`);
    }
    const meta = parts.join(" · ");
    const distance = typeof item.distanceMeters === 'number' ? `${(item.distanceMeters / 1000).toFixed(1)} km away` : undefined;
    return `${name} ${meta ? `(${meta})` : ''}. ${distance ? `${distance}. ` : ''}${item.address ? item.address : ''}`.trim();
  };

  const fetchPlace = useCallback(async (pid: string) => {
    try {
      setLoadingPlace(true);
      setError("");
      setUseDummy(false);
        const res = await fetch("/services/contexts/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: pid }),
      });
      if (!res.ok) {
        throw new Error(`place ${res.status}`);
      }
      const data = await res.json();
      setPlace(data.place as Place);
    } catch (e: any) {
      const msg = `Failed to load place: ${e?.message || e}`;
      setError(msg);
      setPlace(null);
      // Do not enable dummy mode; keep API-only behavior
    } finally {
      setLoadingPlace(false);
    }
  }, []);

  const fetchNearby = useCallback(async (pid: string, filterState: FilterState) => {
    try {
      setLoadingNearby(true);
      setError("");
      let results: NearbyItem[] = [];
      const isAttraction = (filterState.category || '').toLowerCase().includes('attraction');
      if (isAttraction) {
        // Load from backend contexts by category=Attraction
        const url = `/services/contexts?type=place&category=Attraction&page_size=50`;
        const resCtx = await fetch(url, { headers: { 'x-tenant-id': (process as any)?.env?.TENANT_ID || '' } as any });
        if (!resCtx.ok) throw new Error(`contexts ${resCtx.status}`);
        const payload = await resCtx.json();
        const items = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
        results = items.map((row: any, idx: number) => {
          const ni = contextToNearbyItem(row);
          if (!ni.photos || ni.photos.length === 0) ni.photos = [getPlaceholderImage(ni.placeId || String(idx))];
          if (!ni.description) ni.description = getShortDescription(ni);
          if (!ni.detail) ni.detail = getShortDetail(ni);
          return ni;
        });
      } else {
        const res = await fetch("/services/contexts/nearby", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            placeId: pid, 
            category: filterState.category, 
            radiusMeters: filterState.maxDistance 
          }),
        });
        if (!res.ok) throw new Error(`nearby ${res.status}`);
        const data = await res.json();
        results = data.results as NearbyItem[];
      }
      // Apply client filters
      if (filterState.openNow) results = results.filter(item => item.openNow);
      if (filterState.minRating > 0) results = results.filter(item => (item.rating || 0) >= filterState.minRating);
      if (filterState.maxPrice < 4) results = results.filter(item => (item.priceLevel || 0) <= filterState.maxPrice);
      if (filterState.searchQuery) {
        const q = filterState.searchQuery.toLowerCase();
        results = results.filter(item => item.name.toLowerCase().includes(q) || item.tags?.some(tag => tag.toLowerCase().includes(q)));
      }
      // Ensure each item has at least one photo and a description
      results = results.map((item, idx) => ({
        ...item,
        photos: item.photos && item.photos.length > 0 ? item.photos : [getPlaceholderImage(item.placeId || String(idx))],
        description: item.description || getShortDescription(item),
        detail: item.detail || getShortDetail(item),
        longDescription: (item as any).longDescription || buildLongDescription(item.name, item)
      }));
      setNearby(results);
    } catch (e: any) {
      setError(`Failed to load nearby: ${e?.message || e}`);
      setNearby([]);
    } finally {
      setLoadingNearby(false);
    }
  }, []);

  const fetchPlaceDetails = useCallback(async (placeId: string) => {
    try {
      setIsDetailLoading(true);
      setShowPlaceDetails(true);
      setLoadingSelectedPlace(true);
      let placeData: Place | null = null;
      if (isUuidLike(placeId)) {
        // Load a single context and map to Place
        const resCtx = await fetch(`/services/contexts/${encodeURIComponent(placeId)}`, { headers: { 'x-tenant-id': (process as any)?.env?.TENANT_ID || '' } as any });
        if (!resCtx.ok) throw new Error(`context ${resCtx.status}`);
        const row = await resCtx.json();
        placeData = contextToPlace(row);
      } else {
        const res = await fetch("/services/contexts/place", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeId }),
        });
        if (!res.ok) throw new Error(`place details ${res.status}`);
        const data = await res.json();
        placeData = data.place as Place;
      }
      if (!placeData.photos || placeData.photos.length === 0) {
        placeData.photos = [getPlaceholderImage(placeId)];
      }
      // Ensure at least 3 photos for carousel
      if (placeData.photos.length < 3) {
        const needed = 3 - placeData.photos.length;
        for (let i = 1; i <= needed; i++) {
          placeData.photos.push(getPlaceholderImage(`${placeId}-${i + 1}`));
        }
      }
      if (!placeData.categories || placeData.categories.length === 0) {
        placeData.categories = ["General"];
      }
      if (typeof placeData.distanceMeters !== 'number') {
        placeData.distanceMeters = 1200;
      }
      if (!placeData.longDescription) {
        (placeData as any).longDescription = buildLongDescription(placeData.name, {
          distanceMeters: placeData.distanceMeters,
          priceLevel: placeData.priceLevel,
          rating: placeData.rating,
          address: placeData.address,
          tags: placeData.categories
        });
      }
      setSelectedPlace(placeData);
      setPhotoIndex(0);
    } catch (e: any) {
      const synthetic: Place = {
        id: placeId,
        name: `Place ${placeId}`,
        categories: ["Featured", "Popular"],
        rating: 4.4,
        reviewCount: 120,
        priceLevel: 2,
        address: "Unknown address",
        phone: undefined,
        website: undefined,
        photos: [
          getPlaceholderImage(`${placeId}-1`),
          getPlaceholderImage(`${placeId}-2`),
          getPlaceholderImage(`${placeId}-3`),
        ],
        openingHours: [
          { day: 1, open: "10:00", close: "20:00" },
          { day: 2, open: "10:00", close: "20:00" },
          { day: 3, open: "10:00", close: "20:00" },
          { day: 4, open: "10:00", close: "20:00" },
          { day: 5, open: "10:00", close: "22:00" },
          { day: 6, open: "11:00", close: "22:00" },
          { day: 0, open: "11:00", close: "22:00" },
        ],
        distanceMeters: 1200,
        longDescription: buildLongDescription(`Place ${placeId}`, {
          tags: ["Featured", "Popular"],
          distanceMeters: 1200,
          priceLevel: 2,
          rating: 4.4,
          address: "Unknown address",
        })
      };
      setSelectedPlace(synthetic);
      setPhotoIndex(0);
    } finally {
      setLoadingSelectedPlace(false);
      setIsDetailLoading(false);
    }
  }, []);

  // Apply category preset from query and deep-link placeId if present
  useEffect(() => {
    // If embedded and no explicit category, default to Nearby (or provided)
    const defaultCat = (embedded && !searchParams.get("category")) ? (props?.defaultCategory || 'Nearby') : undefined;
    const presetCategory = searchParams.get("category") || defaultCat;
    if (presetCategory && categories.includes(presetCategory)) {
      const next = { ...filters, category: presetCategory } as FilterState;
      setFilters(next);
      // If preset is Attraction, immediately load from contexts and disable dummy mode
      if (presetCategory.toLowerCase() === 'attraction') {
        setUseDummy(false);
        fetchNearby('ignored', next);
      }
    }
    const qpId = searchParams.get("placeId");
    if (qpId) {
      setShowPlaceDetails(true);
      setIsDetailLoading(true);
      fetchPlaceDetails(qpId);
    } else {
      setShowPlaceDetails(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, categories]);

  // Fallback on first mount for environments where searchParams isn't populated immediately
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pid = new URLSearchParams(window.location.search).get('placeId');
      if (pid) {
        setShowPlaceDetails(true);
        setIsDetailLoading(true);
        fetchPlaceDetails(pid);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateQueryParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(next).forEach(([k, v]) => {
      if (v === null) params.delete(k); else params.set(k, v);
    });
    const qs = params.toString();
    router.push(qs ? `?${qs}` : `?`, { scroll: false });
  };

  useEffect(() => {
    const cat = (filters.category || '').toLowerCase();
    if (cat !== 'attraction' && isUuidLike(placeIdInput)) {
      fetchPlace(placeIdInput);
    }
  }, [fetchPlace, placeIdInput, filters.category]);

  // Resize divider
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

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (place) fetchNearby(place.id, newFilters);
  };

  const handlePlaceClick = (placeId: string) => {
    updateQueryParam({ placeId });
    fetchPlaceDetails(placeId);
  };

  const handleBackToResults = () => {
    setShowPlaceDetails(false);
    updateQueryParam({ placeId: null });
  };

  // Dummy places
  const dummyPlaces: NearbyItem[] = useMemo(() => {
    const tagsPool = ['Family', 'Cozy', 'Rooftop', 'Local', 'Fast', 'Vegan', 'Spicy', 'Seafood'];
    return Array.from({ length: 40 }, (_, idx) => {
      const rating = 3 + ((idx % 8) / 10) + (idx % 2 === 0 ? 0.2 : 0);
      const id = `dummy-${idx + 1}`;
      const distance = 200 + (idx * 75);
      const tags = [tagsPool[idx % tagsPool.length], tagsPool[(idx + 3) % tagsPool.length]];
      const cat = categories[(idx + 1) % categories.length];
      const detail = `${cat} • ${(distance / 1000).toFixed(1)} km`;
      const longDescription = `${`Sample Place #${idx + 1}`} (${cat}). ${(distance/1000).toFixed(1)} km away. A favorite for ${tags[0].toLowerCase()} and ${tags[1].toLowerCase()}.`;
      return {
        placeId: id,
        name: `Sample Place #${idx + 1}`,
        rating: Math.min(5, Number(rating.toFixed(1))),
        priceLevel: (idx % 4) + 1,
        distanceMeters: distance,
        openNow: idx % 3 !== 0,
        tags,
        photos: [
          getPlaceholderImage(`${id}-1`),
          getPlaceholderImage(`${id}-2`),
          getPlaceholderImage(`${id}-3`),
        ],
        description: getShortDescription({ tags, distanceMeters: distance }),
        detail,
        longDescription
      } as NearbyItem;
    });
  }, []);

  const applyClientFilters = useCallback((items: NearbyItem[], filterState: FilterState): NearbyItem[] => {
    let results = items;
    if (filterState.openNow) results = results.filter(item => item.openNow);
    if (filterState.minRating > 0) results = results.filter(item => (item.rating || 0) >= filterState.minRating);
    if (filterState.maxPrice < 4) results = results.filter(item => (item.priceLevel || 0) <= filterState.maxPrice);
    if (filterState.searchQuery) {
      const q = filterState.searchQuery.toLowerCase();
      results = results.filter(item => item.name.toLowerCase().includes(q) || item.tags?.some(tag => tag.toLowerCase().includes(q)));
    }
    return results;
  }, []);

  const filteredNearby = useMemo(() => applyClientFilters(nearby, filters), [nearby, filters, applyClientFilters]);

  const filteredDummy = useMemo(() => applyClientFilters(dummyPlaces, filters), [dummyPlaces, filters, applyClientFilters]);
  const totalDummy = filteredDummy.length;
  const totalPages = Math.max(1, Math.ceil(totalDummy / pageSize));
  const currentPageClamped = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedDummy = useMemo(() => {
    const start = (currentPageClamped - 1) * pageSize;
    return filteredDummy.slice(start, start + pageSize);
  }, [filteredDummy, currentPageClamped]);

  const displayNearby = filteredNearby.map((item, idx) => ({
    ...item,
    photos: item.photos && item.photos.length > 0 ? item.photos : [getPlaceholderImage(item.placeId || String(idx))]
  }));
  const totalDisplay = filteredNearby.length;

  const renderStars = (rating: number) => (
    <span className="inline-flex items-center">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "text-yellow-400" : "text-gray-300"}>★</span>
      ))}
    </span>
  );

  const renderPriceLevel = (priceLevel: number) => (
    <span className="text-orange-900 font-medium">{priceLabels[priceLevel - 1] || "N/A"}</span>
  );

  const dayLabel = (d: number) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d] || "";

  // Detail UI state
  // No toggle needed; details always visible
  const [photoIndex, setPhotoIndex] = useState(0);

  return (
    <main className={`${embedded ? 'p-0' : 'min-h-screen'} bg-stone-50 ta-page`} data-testid="ta-page">
      {/* Top Navigation Bar (hidden when embedded) */}
      {!embedded && (
        <div className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm ta-topbar" data-testid="ta-topbar">
          <div className="max-w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-stone-900 ta-app-title" data-testid="ta-app-title">🗺️ Travel Discovery</h1>
              </div>
              {/* Language Switcher (top-right) */}
              <div className="flex items-center space-x-2 ta-lang-switcher" data-testid="ta-lang-switcher">
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                    currentLanguage === 'en' ? 'bg-gradient-to-r from-orange-700 to-red-800 text-white border-orange-600' : 'bg-white text-orange-900 border-orange-300 hover:border-orange-500'
                  }`}
                  title="English"
                >
                  🇺🇸 EN
                </button>
                <button
                  onClick={() => handleLanguageChange('th')}
                  className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                    currentLanguage === 'th' ? 'bg-gradient-to-r from-orange-700 to-red-800 text-white border-orange-600' : 'bg-white text-orange-900 border-orange-300 hover:border-orange-500'
                  }`}
                  title="ไทย"
                >
                  🇹🇭 TH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex ta-layout p-0" style={{ height: embedded ? 'auto' : 'calc(100vh - 80px)' }} data-testid="ta-layout">
        {/* Left Panel - Places Discovery */}
        <div className="flex-1 flex flex-col bg-white ta-left-panel min-h-0" style={{ width: embedded ? '100%' : `calc(100% - ${chatWidth}px)` }} data-testid="ta-left-panel">
          {/* Breadcrumb */}
          <div className="px-6 py-2 border-b border-stone-200 bg-white">
            <nav className="ta-breadcrumb" aria-label="Breadcrumb">
              <ol className="flex items-center text-sm text-orange-900">
                <li>
                  <Link href="/travel" className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-orange-900 hover:bg-orange-50 hover:text-orange-900 border border-transparent hover:border-orange-200">
                    {currentLanguage === 'th' ? 'การท่องเที่ยว' : 'Travel'}
                  </Link>
                </li>
                <li className="px-2 text-amber-600">/</li>
                <li aria-current="page" className="font-medium">{currentLanguage === 'th' ? 'สถานที่' : 'Places'}</li>
                {filters.category && (
                  <>
                    <li className="px-2 text-amber-600">/</li>
                    <li>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200">
                        {filters.category}
                      </span>
                    </li>
                  </>
                )}
              </ol>
            </nav>
          </div>

          {/* Filters Bar with Search moved here */}
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4 ta-filters-bar" data-testid="ta-filters-bar">
            <div className="flex flex-wrap items-start gap-4 ta-filters" data-testid="ta-filters">
              {/* Search input (fixed height) */}
              <div className="flex-1 relative min-w-[260px] ta-filter-search" data-testid="ta-filter-search">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  placeholder={currentLanguage === 'th' ? 'ค้นหาสถานที่ ชื่อ ประเภท แท็ก...' : 'Search by name, type, or tags...'}
                  className="block w-full h-12 pl-10 pr-4 border border-stone-300 rounded-lg text-stone-900 placeholder-stone-500 focus:ring-2 focus:ring-orange-600 focus:border-orange-600 bg-white ta-filter-input"
                  data-testid="ta-filter-input"
                />
              </div>

              {/* Category */}
              <div className="min-w-[200px] ta-filter-category" data-testid="ta-filter-category">
                <div className="relative w-full h-12 rounded-lg border border-stone-300 bg-white focus-within:ring-2 focus-within:ring-orange-600 focus-within:border-orange-600 hover:bg-orange-50">
                  <span className="absolute top-0.5 left-3 px-1 text-[10px] font-medium text-stone-600 bg-white">Category</span>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="absolute inset-0 w-full h-full appearance-none bg-transparent px-3 pr-10 pt-4 text-sm text-stone-900 ta-select"
                    data-testid="ta-select-category"
                  >
                    {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Distance */}
              <div className="min-w-[180px] ta-filter-distance" data-testid="ta-filter-distance">
                <div className="relative w-full h-12 rounded-lg border border-stone-300 bg-white focus-within:ring-2 focus-within:ring-orange-600 focus-within:border-orange-600 hover:bg-orange-50">
                  <span className="absolute top-0.5 left-3 px-1 text-[10px] font-medium text-stone-600 bg-white">Distance</span>
                  <select
                    value={filters.maxDistance}
                    onChange={(e) => handleFilterChange('maxDistance', parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full appearance-none bg-transparent px-3 pr-10 pt-4 text-sm text-stone-900 ta-select"
                    data-testid="ta-select-distance"
                  >
                    <option value={500}>500m</option>
                    <option value={1000}>1km</option>
                    <option value={2000}>2km</option>
                    <option value={5000}>5km</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div className="min-w-[160px] ta-filter-rating" data-testid="ta-filter-rating">
                <div className="relative w-full h-12 rounded-lg border border-stone-300 bg-white focus-within:ring-2 focus-within:ring-orange-600 focus-within:border-orange-600 hover:bg-orange-50">
                  <span className="absolute top-0.5 left-3 px-1 text-[10px] font-medium text-stone-600 bg-white">Rating</span>
                  <select
                    value={filters.minRating}
                    onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full appearance-none bg-transparent px-3 pr-10 pt-4 text-sm text-stone-900 ta-select"
                    data-testid="ta-select-rating"
                  >
                    <option value={0}>Any</option>
                    <option value={3}>3+</option>
                    <option value={4}>4+</option>
                    <option value={4.5}>4.5+</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="min-w-[160px] ta-filter-price" data-testid="ta-filter-price">
                <div className="relative w-full h-12 rounded-lg border border-stone-300 bg-white focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 hover:bg-stone-50">
                  <span className="absolute top-0.5 left-3 px-1 text-[10px] font-medium text-stone-600 bg-white">Price</span>
                  <select
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full appearance-none bg-transparent px-3 pr-10 pt-4 text-sm text-stone-900 ta-select"
                    data-testid="ta-select-price"
                  >
                    <option value={1}>$</option>
                    <option value={2}>$$</option>
                    <option value={3}>$$$</option>
                    <option value={4}>$$$$</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Open Now */}
              <div className="min-w-[150px] h-12 flex items-center ta-filter-open" data-testid="ta-filter-open">
                <label className="inline-flex items-center space-x-2">
                  <input type="checkbox" className="w-4 h-4 text-orange-700 border-stone-300 rounded focus:ring-orange-600" checked={filters.openNow} onChange={(e) => handleFilterChange('openNow', e.target.checked)} />
                  <span className="text-sm font-medium text-stone-900">Open now</span>
                </label>
              </div>

              {/* Search button */}
              <div className="ml-auto h-12 flex items-center ta-filter-submit" data-testid="ta-filter-submit">
                <button
                  onClick={() => {
                    if (useDummy) {
                      // In dummy mode, just reapply filters and reset pagination
                      setCurrentPage(1);
                      return;
                    }
                    if (place) {
                      fetchNearby(place.id, filters);
                    }
                  }}
                  disabled={loadingNearby}
                  className="px-4 h-12 bg-gradient-to-r from-orange-700 to-red-800 text-white rounded-lg hover:from-orange-800 hover:to-red-900 disabled:bg-stone-300 text-sm"
                  >
                  {loadingNearby ? (currentLanguage === 'th' ? 'กำลังค้นหา...' : 'Searching...') : (currentLanguage === 'th' ? 'ค้นหา' : 'Search')}
                </button>
              </div>
            </div>
          </div>

          {/* Breadcrumb duplicate removed */}

          {/* Current Location/Anchor */}
          {place && !useDummy && (
            <div className="bg-orange-50 border-b border-orange-200 px-6 py-3 ta-anchor" data-testid="ta-anchor">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-700 rounded-full"></div>
                    <span className="text-sm font-medium text-orange-900">{currentLanguage === 'th' ? 'ค้นหาใกล้:' : 'Searching near:'}</span>
                  </div>
                  <span className="font-semibold text-stone-900">{place.name}</span>
                  <div className="flex items-center space-x-3 text-sm text-stone-700">
                    {place.rating && (
                      <span className="flex items-center">
                        {renderStars(place.rating)}
                        <span className="ml-1">{place.rating}</span>
                      </span>
                    )}
                    <span>{place.reviewCount || 0} reviews</span>
                    {place.priceLevel && renderPriceLevel(place.priceLevel)}
                  </div>
                </div>
                <div className="text-xs text-stone-600">
                  {place.categories?.join(' • ')}
                </div>
              </div>
            </div>
          )}

          {/* Results - Responsive Image Grid */}
          <div className="flex-1 overflow-hidden ta-results" data-testid="ta-results">
            <div className="h-full flex flex-col ta-results-inner">
              {/* Header area with either breadcrumb or results meta */}
              <div className="px-6 py-3 border-b border-stone-200 ta-results-header" data-testid="ta-results-header">
                {showPlaceDetails && selectedPlace ? (
                  <div className="flex items-center justify-between" data-testid="ta-detail-header">
                    <h2 className="text-lg font-semibold text-stone-900 truncate max-w-[50vw]">{selectedPlace.name}</h2>
                    <button onClick={handleBackToResults} className="text-sm px-3 py-1.5 border border-orange-300 rounded-md hover:border-orange-500 text-orange-900">{currentLanguage === 'th' ? 'ย้อนกลับ' : 'Back'}</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-stone-900">
                      {currentLanguage === 'th' ? 'สถานที่ทั้งหมด' : 'Places'} ({totalDisplay})
                    </h2>
                    {useDummy ? (
                      <div className="flex items-center space-x-2 ta-pager" data-testid="ta-pager">
                        <button
                          className="px-3 py-1.5 text-sm border border-orange-300 text-orange-900 rounded-md disabled:opacity-50 hover:border-orange-500"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPageClamped <= 1}
                        >
                          {currentLanguage === 'th' ? 'ก่อนหน้า' : 'Prev'}
                        </button>
                        <span className="text-sm text-stone-700">{currentPageClamped} / {totalPages}</span>
                        <button
                          className="px-3 py-1.5 text-sm border border-orange-300 text-orange-900 rounded-md disabled:opacity-50 hover:border-orange-500"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPageClamped >= totalPages}
                        >
                          {currentLanguage === 'th' ? 'ถัดไป' : 'Next'}
                        </button>
                      </div>
                    ) : (
                      error && (
                        <div className="text-sm text-red-700 bg-red-100 px-3 py-1 rounded">{error}</div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Inline Detail View */}
                {showPlaceDetails && selectedPlace ? (
                  <div className="p-6 space-y-8 ta-detail-root" data-testid="ta-detail-root">
                    {/* Top 2-column section per UX */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ta-detail-top" data-testid="ta-detail-top">
                      {/* Left: general info */}
                      <div className="ta-detail-left" data-testid="ta-detail-left">
                        <div className="relative w-full h-72 md:h-80 bg-stone-100 rounded-lg border border-stone-200 overflow-hidden">
                          <img
                            src={(selectedPlace.photos && selectedPlace.photos[photoIndex]) || getPlaceholderImage(selectedPlace.id)}
                            alt={selectedPlace.name}
                            className="w-full h-full object-cover"
                          />
                          {/* Carousel controls */}
                          {selectedPlace.photos && selectedPlace.photos.length > 1 && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); setPhotoIndex((idx) => (idx - 1 + selectedPlace.photos!.length) % selectedPlace.photos!.length); }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/60 leading-none p-0 ta-carousel-prev"
                                aria-label="Previous image"
                              >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setPhotoIndex((idx) => (idx + 1) % selectedPlace.photos!.length); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/60 leading-none p-0 ta-carousel-next"
                                aria-label="Next image"
                              >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 ta-carousel-dots" data-testid="ta-carousel-dots">
                                {selectedPlace.photos!.map((_, i) => (
                                  <span key={i} className={`w-2 h-2 rounded-full ${i === photoIndex ? 'bg-white' : 'bg-white/50'}`} />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <h3 className="mt-3 text-2xl font-bold text-stone-900">{selectedPlace.name}</h3>
                        {/* Short description – concise, 4 lines max */}
                        {(() => {
                          const about = selectedPlace.longDescription || buildLongDescription(selectedPlace.name, selectedPlace as any);
                          return <p className="mt-2 text-stone-800 text-sm line-clamp-4 ta-detail-description" data-testid="ta-detail-description">{about}</p>;
                        })()}
                        {selectedPlace.categories && selectedPlace.categories.length > 0 && (
                          <div className="mt-2 ta-detail-tags" data-testid="ta-detail-tags">
                            <span className="text-xs font-medium text-stone-700 mr-2">Tags:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {selectedPlace.categories.slice(0, 8).map((c, i) => (
                                <span key={i} className="px-2 py-0.5 bg-stone-200 text-stone-900 text-xs rounded">{c}</span>
                              ))}
                              {selectedPlace.categories.length > 8 && (
                                <span className="text-xs text-stone-700">+{selectedPlace.categories.length - 8}</span>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-sm text-stone-700">
                          <span className="inline-flex items-center">{renderStars(selectedPlace.rating || 0)}<span className="ml-1 font-medium">{selectedPlace.rating || 'N/A'}</span></span>
                          <span>{selectedPlace.reviewCount || 0} reviews</span>
                          <span>{renderPriceLevel(selectedPlace.priceLevel || 0)}</span>
                        </div>
                      </div>

                      {/* Right: location UX – map top, then hours, then address + QR */}
                      <div className="ta-detail-right" data-testid="ta-detail-right">
                        {/* Map on top */}
                        <div className="w-full h-72 md:h-80 bg-stone-100 rounded-lg border border-stone-300 overflow-hidden ta-detail-map" data-testid="ta-detail-map">
                          <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            className="rounded-lg"
                            src={selectedPlace.coordinates
                              ? `https://maps.google.com/maps?q=${selectedPlace.coordinates.lat},${selectedPlace.coordinates.lng}&z=15&output=embed`
                              : `https://maps.google.com/maps?q=${encodeURIComponent(selectedPlace.name)}&z=15&output=embed`}
                            allowFullScreen
                            title={`Map of ${selectedPlace.name}`}
                          />
                        </div>

                        {/* Short opening hours (today) with small button aligned right */}
                        {selectedPlace.openingHours && selectedPlace.openingHours.length > 0 && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-5 items-center gap-2 ta-detail-hours" data-testid="ta-detail-hours">
                            {/* Left: hours + badge */}
                            <div className="md:col-span-4 flex items-center">
                              {(() => {
                                const today = new Date().getDay();
                                const todayHours = selectedPlace.openingHours!.find(h => h.day === today);
                                const label = todayHours ? `${dayLabel(today)} ${todayHours.open} - ${todayHours.close}` : (currentLanguage === 'th' ? 'ไม่ทราบเวลาเปิด' : 'Hours unavailable');
                                const openNow = ((selectedPlace as any).isOpenNow === true);
                                return (
                                  <>
                                    <div className="text-sm text-stone-800">{label}</div>
                                    <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${openNow ? 'bg-orange-100 text-orange-900' : 'bg-red-100 text-red-800'}`}> 
                                      {openNow ? (currentLanguage === 'th' ? 'เปิดอยู่' : 'Open now') : (currentLanguage === 'th' ? 'ปิดอยู่' : 'Closed')}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                            {/* Right: small maps button aligned over QR column */}
                            <div className="md:col-span-1">
                              {(() => {
                                const mapsUrl = selectedPlace.coordinates
                                  ? `https://www.google.com/maps?q=${selectedPlace.coordinates.lat},${selectedPlace.coordinates.lng}`
                                  : `https://www.google.com/maps/search/${encodeURIComponent(selectedPlace.name)}`;
                                return (
                                  <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full inline-flex items-center justify-center px-2 py-1 text-xs bg-gradient-to-r from-orange-700 to-red-800 text-white rounded-md hover:from-orange-800 hover:to-red-900 ta-detail-maps-btn"
                                    >
                                    {currentLanguage === 'th' ? 'แผนที่' : 'Maps'}
                                  </a>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Bottom: 80/20 address+distance vs QR */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-start ta-detail-address-qr" data-testid="ta-detail-address-qr">
                          {/* Left 80%: address and distance */}
                          <div className="md:col-span-4 ta-detail-address" data-testid="ta-detail-address">
                            <div className="text-sm text-stone-800">
                              <div className="font-semibold text-stone-900 mb-1">{currentLanguage === 'th' ? 'ที่ตั้ง' : 'Address'}</div>
                              <div>{selectedPlace.address || (currentLanguage === 'th' ? 'ไม่ทราบที่อยู่' : 'Unknown address')}</div>
                            </div>
                            <div className="mt-2 inline-flex items-center text-stone-900 text-base font-medium ta-detail-distance" data-testid="ta-detail-distance">
                              <svg className="w-5 h-5 mr-2 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                              {typeof selectedPlace.distanceMeters === 'number' ? `${(selectedPlace.distanceMeters / 1000).toFixed(1)} km` : '—'}
                            </div>
                            {/* Social/action icons */}
                            <div className="mt-3 flex items-center gap-2">
                              {/* Website */}
                              <a
                                href={selectedPlace.website || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center justify-center w-9 h-9 rounded-md border ${selectedPlace.website ? 'border-orange-300 text-orange-900 hover:border-orange-500 hover:bg-orange-50' : 'border-stone-200 text-stone-400 cursor-not-allowed pointer-events-none'}`}
                                title="Website"
                              >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 0c1.657 0 3 3.582 3 8s-1.343 8-3 8-3-3.582-3-8 1.343-8 3-8zm-8 8h16"/></svg>
                              </a>
                              {/* Facebook */}
                              <a
                                href={selectedPlace.facebookUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center justify-center w-9 h-9 rounded-md border ${selectedPlace.facebookUrl ? 'border-orange-300 text-orange-900 hover:border-orange-500 hover:bg-orange-50' : 'border-stone-200 text-stone-400 cursor-not-allowed pointer-events-none'}`}
                                title="Facebook"
                              >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.2 10.44 22v-7.02H7.9v-2.92h2.54V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.25c-1.23 0-1.61.77-1.61 1.56v1.87h2.74l-.44 2.92h-2.3V22C18.34 21.2 22 17.08 22 12.06z"/></svg>
                              </a>
                              {/* Tel */}
                              <a
                                href={selectedPlace.phone ? `tel:${selectedPlace.phone}` : '#'}
                                className={`inline-flex items-center justify-center w-9 h-9 rounded-md border ${selectedPlace.phone ? 'border-orange-300 text-orange-900 hover:border-orange-500 hover:bg-orange-50' : 'border-stone-200 text-stone-400 cursor-not-allowed pointer-events-none'}`}
                                title="Call"
                              >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h1.28a2 2 0 011.94 1.45l.57 2.03a2 2 0 01-.5 1.93l-1.22 1.22a16 16 0 006.36 6.36l1.22-1.22a2 2 0 011.93-.5l2.03.57A2 2 0 0121 17.72V19a2 2 0 01-2 2h-1C9.82 21 3 14.18 3 6V5z"/></svg>
                              </a>
                              {/* LINE */}
                              <a
                                href={selectedPlace.lineId ? `https://line.me/R/ti/p/~${selectedPlace.lineId}` : '#'}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center justify-center w-9 h-9 rounded-md border ${selectedPlace.lineId ? 'border-orange-300 text-orange-900 hover:border-orange-500 hover:bg-orange-50' : 'border-stone-200 text-stone-400 cursor-not-allowed pointer-events-none'}`}
                                title="LINE"
                              >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.8 5.2A9.76 9.76 0 0012 2C6.48 2 2 6 2 10.95c0 4.02 3.06 7.44 7.26 8.64.28.08.66.23.76.52.09.28.06.71.03.99l-.13 1.25c-.04.33.24.59.56.49 1.52-.5 6.57-3 9.01-5.23 2.1-1.92 3.29-4.44 3.29-7.19 0-3.03-1.18-5.4-3.78-6.92z"/></svg>
                              </a>
                            </div>
                          </div>
                          {/* Right 20%: QR code (button removed from here) */}
                          <div className="md:col-span-1 flex flex-col items-center justify-start ta-detail-qr" data-testid="ta-detail-qr">
                            {(() => {
                              const origin = typeof window !== 'undefined' ? window.location.origin : '';
                              const shareUrl = `${origin}/travel/places?placeId=${encodeURIComponent(selectedPlace.id)}`;
                              const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(shareUrl)}`;
                              return (
                                <>
                                  <img src={qrSrc} alt="QR code" className="w-20 h-20 md:w-24 md:h-24 border border-stone-300 rounded" />
                                  <a href={shareUrl} className="mt-2 text-orange-900 text-xs md:text-sm hover:underline text-center" target="_blank" rel="noreferrer">
                                    {currentLanguage === 'th' ? 'สแกนเพื่อเปิดบนมือถือ' : 'Scan to open on mobile'}
                                  </a>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: details & actions */}
                    <div className="space-y-4 ta-detail-bottom" data-testid="ta-detail-bottom">
                      <hr className="border-stone-200" />
                      <h4 className="font-semibold text-stone-900 ta-detail-heading" data-testid="ta-detail-heading">รายละเอียดสถานที่</h4>
                      {/* Avoid repeating the same description text here to prevent duplication. Add more structured details here if needed in future. */}

                      {/* Actions removed per request; details only */}
                    </div>
                  </div>
                ) : showPlaceDetails && isDetailLoading ? (
                  <div className="p-6 space-y-4">
                    <div className="h-6 w-64 bg-stone-200 rounded" />
                    <div className="h-4 w-96 bg-stone-200 rounded" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-40 bg-stone-200 rounded" />
                      <div className="h-40 bg-stone-200 rounded" />
                    </div>
                    <div className="h-4 w-80 bg-stone-200 rounded" />
                    <div className="h-64 bg-stone-200 rounded" />
                  </div>
                ) : (
                  // Grid View
                  (displayNearby.length === 0 && !loadingNearby ? (
                    <div className="flex flex-col items-center justify-center h-full text-stone-600">
                      <div className="text-6xl mb-4">🏙️</div>
                      <h3 className="text-lg font-medium mb-2">{currentLanguage === 'th' ? 'ไม่พบสถานที่' : 'No places found'}</h3>
                      <p className="text-sm text-center max-w-md">
                        {currentLanguage === 'th' ? 'โปรดลองปรับตัวกรองหรือเปลี่ยนตำแหน่งการค้นหา' : 'Try adjusting your search filters or entering a different location.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-6 ta-results-grid" data-testid="ta-results-grid">
                      {displayNearby.map((item, idx) => {
                        const imageUrl = (item.photos && item.photos[0]) || getPlaceholderImage(item.placeId || String(idx));
                        return (
                          <div
                            key={item.placeId}
                            className="bg-white border border-stone-200 rounded-lg overflow-hidden hover:shadow-md hover:border-orange-300 cursor-pointer transition ta-result-card"
                            onClick={() => handlePlaceClick(item.placeId)}
                          >
                            <div className="relative aspect-video bg-stone-100 ta-result-image" data-testid="ta-result-image">
                              <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              {item.openNow !== undefined && (
                                <span className={`absolute top-2 left-2 px-2 py-0.5 text-xs rounded-full font-medium ${item.openNow ? 'bg-orange-700 text-white' : 'bg-red-600 text-white'}`}> 
                                  {item.openNow ? (currentLanguage === 'th' ? 'เปิด' : 'Open') : (currentLanguage === 'th' ? 'ปิด' : 'Closed')}
                                </span>
                              )}
                            </div>
                            <div className="p-4 ta-result-body">
                              <h3 className="font-semibold text-stone-900 leading-tight mb-1 ta-result-title" data-testid="ta-result-title">{item.name}</h3>
                              {item.longDescription ? (
                                <p className="text-sm text-stone-800 mb-2 line-clamp-3 ta-result-description">{item.longDescription}</p>
                              ) : item.description ? (
                                <p className="text-sm text-stone-800 mb-2 line-clamp-2 ta-result-description">{item.description}</p>
                              ) : null}
                              {item.detail && (
                                <p className="text-xs text-stone-600 mb-2 line-clamp-1 ta-result-detail">{item.detail}</p>
                              )}
                              {item.tags && item.tags.length > 0 && (
                                <div className="mb-2 ta-result-tags" data-testid="ta-result-tags">
                                  <span className="text-xs font-medium text-stone-700 mr-2">Tags:</span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {item.tags.slice(0, 4).map((tag, tIdx) => (
                                      <span key={tIdx} className="px-2 py-0.5 bg-stone-200 text-stone-900 text-xs rounded">{tag}</span>
                                    ))}
                                    {item.tags.length > 4 && (
                                      <span className="text-xs text-stone-700">+{item.tags.length - 4}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-sm text-stone-800 mb-2">
                                <div className="flex items-center space-x-2">
                                  {item.rating && (
                                    <span className="inline-flex items-center">{renderStars(item.rating)}<span className="ml-1 font-medium">{item.rating}</span></span>
                                  )}
                                  {item.priceLevel && (<span>{renderPriceLevel(item.priceLevel)}</span>)}
                                </div>
                                {item.distanceMeters !== undefined && (
                                  <span className="inline-flex items-center">
                                    <svg className="w-4 h-4 mr-1 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                    {(item.distanceMeters / 1000).toFixed(1)} km
                                  </span>
                                )}
                              </div>
                              <button
                                className="mt-3 w-full px-3 py-2 text-sm rounded-md bg-gradient-to-r from-orange-700 to-red-800 text-white hover:from-orange-800 hover:to-red-900"
                                onClick={(e) => { e.stopPropagation(); handlePlaceClick(item.placeId); }}
                              >
                                {currentLanguage === 'th' ? 'ดูรายละเอียด' : 'View details'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Close left panel before adding divider and right panel */}
          </div>

          {!embedded && (
            <>
              {/* Divider */}
              <div
                className="w-1 bg-stone-300 hover:bg-orange-400 cursor-col-resize transition-colors"
                onMouseDown={() => setIsResizing(true)}
                title="Drag to resize chat"
              />

              {/* Right Panel - Chat */}
              <div className="bg-white border-l border-stone-200 ta-right-panel" style={{ width: `${chatWidth}px` }} data-testid="ta-right-panel">
                <div className="h-full flex flex-col">
                  <div className="flex-1 min-h-0">
                    <EventProvider>
                      <ChatInterface
                        sessionId={sessionId}
                        activeChannel={activeChannel}
                        onChannelSwitch={setActiveChannel}
                        isProcessing={isProcessing}
                      />
                    </EventProvider>
                  </div>
                </div>
              </div>
            </>
          )}
        
      </div>

      {/* Place Details Modal */}
      {false && showPlaceDetails && selectedPlace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Modal disabled in favor of inline detail view */}
        </div>
      )}
    </main>
  );
}

export default function TravelPlacesPage(props: { embedded?: boolean; defaultCategory?: string }) {
  const { embedded = false, defaultCategory } = props || {} as any;
  return (
    <Suspense fallback={<div />}> 
      <TravelPlacesPageInner embedded={embedded} defaultCategory={defaultCategory} />
    </Suspense>
  );
}


