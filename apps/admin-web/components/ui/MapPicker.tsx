"use client";

import React from "react";
import { BACKEND_URL, getTenantId } from "../config";

interface MapPickerProps {
  lat?: number;
  lng?: number;
  onCoordinatesChange: (lat: number, lng: number) => void;
  onAddressChange?: (address: string) => void;
  height?: string;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export function MapPicker({ 
  lat = 13.7563, 
  lng = 100.5018, 
  onCoordinatesChange, 
  onAddressChange,
  height = "300px" 
}: MapPickerProps) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [map, setMap] = React.useState<any>(null);
  const [marker, setMarker] = React.useState<any>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [googleMapsApiKey, setGoogleMapsApiKey] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Load settings to get Google Maps API key, then load script
  React.useEffect(() => {
    let removed = false;
    const load = async () => {
      try {
        if (window.google) {
          setIsLoaded(true);
          return;
        }
        // Fetch tenant settings to get the stored Google Maps API key
        const res = await fetch(`${BACKEND_URL}/api/admin/settings`, {
          headers: { "X-Tenant-ID": getTenantId() }
        });
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        const key = data?.tenant?.settings?.integrations?.googleMapsApiKey || null;
        setGoogleMapsApiKey(key);
        if (!key) {
          setLoadError("Google Maps API key is not configured. Set it in Settings → Integrations.");
          return;
        }

        // Avoid injecting the script multiple times
        if (document.querySelector('script[data-source="google-maps-api"]')) {
          // If script exists but Google not yet initialized, set callback
          if (!window.google) {
            window.initMap = () => {
              if (!removed) setIsLoaded(true);
            };
          }
          return;
        }

        const script = document.createElement('script');
        script.setAttribute('data-source', 'google-maps-api');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=initMap`;
        script.async = true;
        script.defer = true;

        window.initMap = () => {
          if (!removed) setIsLoaded(true);
        };

        document.head.appendChild(script);

        return () => {
          removed = true;
          // Do not remove the script to allow reuse across component mounts
        };
      } catch (e: any) {
        setLoadError(e?.message || "Failed to initialize Google Maps");
      }
    };
    load();
  }, []);

  // Initialize map
  React.useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const markerInstance = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstance,
      draggable: true,
      title: "Drag to set location"
    });

    // Handle marker drag
    markerInstance.addListener('dragend', () => {
      const position = markerInstance.getPosition();
      const newLat = position.lat();
      const newLng = position.lng();
      onCoordinatesChange(newLat, newLng);
      
      // Reverse geocode to get address
      if (onAddressChange) {
        reverseGeocode(newLat, newLng);
      }
    });

    // Handle map click
    mapInstance.addListener('click', (event: any) => {
      const newLat = event.latLng.lat();
      const newLng = event.latLng.lng();
      markerInstance.setPosition({ lat: newLat, lng: newLng });
      onCoordinatesChange(newLat, newLng);
      
      if (onAddressChange) {
        reverseGeocode(newLat, newLng);
      }
    });

    setMap(mapInstance);
    setMarker(markerInstance);
  }, [isLoaded, lat, lng]);

  // Update marker position when coordinates change
  React.useEffect(() => {
    if (marker) {
      marker.setPosition({ lat, lng });
      map?.setCenter({ lat, lng });
    }
  }, [lat, lng, marker, map]);

  const reverseGeocode = (lat: number, lng: number) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { location: { lat, lng } },
      (results: any[], status: string) => {
        if (status === 'OK' && results[0] && onAddressChange) {
          onAddressChange(results[0].formatted_address);
        }
      }
    );
  };

  const searchLocation = () => {
    if (!searchValue.trim() || !window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: searchValue }, (results: any[], status: string) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        const newLat = location.lat();
        const newLng = location.lng();
        
        onCoordinatesChange(newLat, newLng);
        if (onAddressChange) {
          onAddressChange(results[0].formatted_address);
        }
      } else {
        alert('Location not found: ' + status);
      }
    });
  };

  if (!isLoaded) {
    return (
      <div 
        style={{ height }}
        className="bg-gray-100 border border-gray-300 rounded-md flex items-center justify-center"
      >
        <div className="text-center text-gray-500">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <div>{loadError ? loadError : "Loading Google Maps..."}</div>
          {!googleMapsApiKey && (
            <div className="text-xs mt-1">
              Configure API key in Settings → Integrations
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
          placeholder="Search for a location..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <button
          type="button"
          onClick={searchLocation}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {/* Map */}
      <div 
        ref={mapRef}
        style={{ height }}
        className="border border-gray-300 rounded-md"
      />

      {/* Coordinates display */}
      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
        <strong>Coordinates:</strong> {lat.toFixed(6)}, {lng.toFixed(6)}
        <br />
        <em>Click on the map or drag the marker to set location</em>
      </div>
    </div>
  );
}
