"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";
import TravelPlacesContent from "./TravelPlacesContent";

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

export default function TravelPlacesPage() {
  const [sessionId] = useState<string>(() => `sess_${Date.now()}`);
  const [activeChannel, setActiveChannel] = useState<"normal" | "realtime" | "human">("normal");
  const [isProcessing] = useState(false);

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

  // Language toggle
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');

  // Resizable panel state
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  return (
    <EventProvider>
      <div className="flex flex-col h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200 z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/travel/places" className="text-xl font-bold text-gray-900">
                  Travel Places Explorer
                </Link>
              </div>
              <nav className="hidden md:flex space-x-8">
                <Link href="/travel/places" className="text-blue-600 hover:text-blue-800 font-medium">
                  Places
                </Link>
                <Link href="/travel/map" className="text-gray-600 hover:text-gray-900">
                  Map
                </Link>
                <Link href="/travel/recommendations" className="text-gray-600 hover:text-gray-900">
                  Recommendations
                </Link>
              </nav>
              <div className="flex items-center space-x-4">
                <button className="p-2 text-gray-600 hover:text-gray-900">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<div className="p-4">Loading...</div>}>
              <TravelPlacesContent
                sessionId={sessionId}
                activeChannel={activeChannel}
                isProcessing={isProcessing}
                placeIdInput={placeIdInput}
                place={place}
                setPlace={setPlace}
                nearby={nearby}
                setNearby={setNearby}
                selectedPlace={selectedPlace}
                setSelectedPlace={setSelectedPlace}
                showPlaceDetails={showPlaceDetails}
                setShowPlaceDetails={setShowPlaceDetails}
                loadingPlace={loadingPlace}
                setLoadingPlace={setLoadingPlace}
                loadingNearby={loadingNearby}
                setLoadingNearby={setLoadingNearby}
                loadingSelectedPlace={loadingSelectedPlace}
                setLoadingSelectedPlace={setLoadingSelectedPlace}
                isDetailLoading={isDetailLoading}
                setIsDetailLoading={setIsDetailLoading}
                error={error}
                setError={setError}
                filters={filters}
                setFilters={setFilters}
                useDummy={useDummy}
                setUseDummy={setUseDummy}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                pageSize={pageSize}
                currentLanguage={currentLanguage}
                setCurrentLanguage={setCurrentLanguage}
                chatWidth={chatWidth}
                setChatWidth={setChatWidth}
                isResizing={isResizing}
                setIsResizing={setIsResizing}
              />
            </Suspense>
          </main>
        </div>
      </div>
    </EventProvider>
  );
}
