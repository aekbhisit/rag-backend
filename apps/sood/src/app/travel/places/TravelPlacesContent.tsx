"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

const TravelPlacesContent = ({ 
  sessionId,
  activeChannel,
  isProcessing,
  placeIdInput,
  place,
  setPlace,
  nearby,
  setNearby,
  selectedPlace,
  setSelectedPlace,
  showPlaceDetails,
  setShowPlaceDetails,
  loadingPlace,
  setLoadingPlace,
  loadingNearby,
  setLoadingNearby,
  loadingSelectedPlace,
  setLoadingSelectedPlace,
  isDetailLoading,
  setIsDetailLoading,
  error,
  setError,
  filters,
  setFilters,
  useDummy,
  setUseDummy,
  currentPage,
  setCurrentPage,
  pageSize,
  currentLanguage,
  setCurrentLanguage,
  chatWidth,
  setChatWidth,
  isResizing,
  setIsResizing
}: {
  sessionId: string;
  activeChannel: "normal" | "realtime" | "human";
  isProcessing: boolean;
  placeIdInput: string;
  place: Place | null;
  setPlace: (place: Place | null) => void;
  nearby: NearbyItem[];
  setNearby: (nearby: NearbyItem[]) => void;
  selectedPlace: Place | null;
  setSelectedPlace: (place: Place | null) => void;
  showPlaceDetails: boolean;
  setShowPlaceDetails: (show: boolean) => void;
  loadingPlace: boolean;
  setLoadingPlace: (loading: boolean) => void;
  loadingNearby: boolean;
  setLoadingNearby: (loading: boolean) => void;
  loadingSelectedPlace: boolean;
  setLoadingSelectedPlace: (loading: boolean) => void;
  isDetailLoading: boolean;
  setIsDetailLoading: (loading: boolean) => void;
  error: string;
  setError: (error: string) => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  useDummy: boolean;
  setUseDummy: (useDummy: boolean) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  currentLanguage: 'en' | 'th';
  setCurrentLanguage: (lang: 'en' | 'th') => void;
  chatWidth: number;
  setChatWidth: (width: number) => void;
  isResizing: boolean;
  setIsResizing: (resizing: boolean) => void;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

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
      const res = await fetch("/api/travel/place", {
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
      if (e?.message?.includes('place 404')) {
        setUseDummy(true);
        setCurrentPage(1);
      }
    } finally {
      setLoadingPlace(false);
    }
  }, [setLoadingPlace, setError, setPlace, setUseDummy, setCurrentPage]);

  const fetchNearby = useCallback(async (pid: string, filterState: FilterState) => {
    try {
      setLoadingNearby(true);
      setError("");
      const res = await fetch("/api/travel/nearby", {
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
      let results = data.results as NearbyItem[];
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
  }, [setLoadingNearby, setError, setNearby]);

  // ... rest of the implementation would go here

  return (
    <div>Travel Places Content</div>
  );
};

export default TravelPlacesContent;