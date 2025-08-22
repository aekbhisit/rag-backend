"use client";

import React from "react";
import { BACKEND_URL, getTenantId } from "../../../../components/config";
import { Input } from "../../../../components/ui/Input";
import { Select } from "../../../../components/ui/Select";
import { Button } from "../../../../components/Button";
import { Table } from "../../../../components/ui/Table";
import { Badge } from "../../../../components/ui/Badge";
import { useDialog } from "../../../../components/ui/DialogProvider";
import { useTranslation } from "../../../../hooks/useTranslation";

type NearbyItem = {
  place_id: string;
  name: string;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  location?: { lat?: number; lng?: number };
  photo_ref?: string;
};

type PlaceDetails = {
  place_id: string;
  name: string;
  formatted_address?: string;
  location?: { lat?: number; lng?: number };
  phone?: string;
  website?: string;
  opening_hours?: string[];
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  editorial_summary?: string;
  images?: string[];
};

function toContextPayload(d: PlaceDetails) {
  const lat = d.location?.lat;
  const lng = d.location?.lng;
  const address = d.formatted_address || "";
  const phone = d.phone || "";
  const website = d.website || "";
  const ratingText = typeof d.rating === 'number' ? `Rating: ${d.rating} (${d.user_ratings_total || 0} reviews)` : '';
  const types = d.types || [];
  const lines: string[] = [];
  if (address) lines.push(`Address: ${address}`);
  if (phone) lines.push(`Phone: ${phone}`);
  if (website) lines.push(`Website: ${website}`);
  if (ratingText) lines.push(ratingText);
  if (typeof lat === 'number' && typeof lng === 'number') lines.push(`Location: ${lat},${lng}`);
  if (types.length) lines.push(`Categories: ${types.join(', ')}`);
  return {
    type: 'place',
    title: d.name || 'Place',
    body: lines.join('\n'),
    instruction: 'Use the provided details as reference when answering related queries.',
    latitude: typeof lat === 'number' ? lat : undefined,
    longitude: typeof lng === 'number' ? lng : undefined,
    attributes: {
      address,
      lat,
      longitude: lng,
      phone,
      opening_hours: d.opening_hours || [],
      rating: d.rating,
      source_uri: website,
      google_place_id: d.place_id,
      imported_at: new Date().toISOString(),
      images: d.images || [],
    },
    trust_level: 4,
    language: 'en',
    status: 'active',
    keywords: types,
  } as any;
}

export default function ImportPlacesPage() {
  const { t, mounted: translationMounted } = useTranslation();
  const dialog = useDialog();

  const [lat, setLat] = React.useState<number>(19.894998549109282);
  const [lng, setLng] = React.useState<number>(99.8170047793448);
  const [radius, setRadius] = React.useState<number>(3000);
  const [type, setType] = React.useState<string>("restaurant");
  const [keyword, setKeyword] = React.useState<string>("");
  const [limit, setLimit] = React.useState<number>(20);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [items, setItems] = React.useState<NearbyItem[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [isImporting, setIsImporting] = React.useState<boolean>(false);
  const [mapsUrl, setMapsUrl] = React.useState<string>("");
  const [hoverPreview, setHoverPreview] = React.useState<{ src: string; x: number; y: number } | null>(null);
  const [importingById, setImportingById] = React.useState<Record<string, boolean>>({});
  const [notif, setNotif] = React.useState<{ type: 'success'|'error'; message: string } | null>(null);
  const PREVIEW_W = 260;
  const PREVIEW_H = 180;
  const hoverTimerRef = React.useRef<number | null>(null);

  const tenantId = React.useMemo(() => getTenantId(), []);

  const searchNearby = async () => {
    try {
      setLoading(true);
      setItems([]);
      setSelected({});
      const params = new URLSearchParams();
      params.set('lat', String(lat));
      params.set('lng', String(lng));
      if (radius) params.set('radius', String(radius));
      if (type) params.set('type', type);
      if (keyword) params.set('keyword', keyword);
      params.set('limit', String(limit));
      const url = `${BACKEND_URL}/api/admin/import/places/nearby?${params.toString()}`;
      const res = await fetch(url, {
        headers: { 'X-Tenant-ID': tenantId },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      await dialog.alert({ title: translationMounted ? t('error') : 'Error', description: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (placeId: string): Promise<PlaceDetails | null> => {
    try {
      const url = `${BACKEND_URL}/api/admin/import/places/details?place_id=${encodeURIComponent(placeId)}`;
      const res = await fetch(url, { headers: { 'X-Tenant-ID': tenantId }, cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const d = await res.json();
      return d as PlaceDetails;
    } catch (e) {
      return null;
    }
  };

  const quickImport = async (placeId: string) => {
    try {
      setImportingById((m) => ({ ...m, [placeId]: true }));
      const d = await fetchDetails(placeId);
      if (!d) throw new Error('Failed to load place details');
      const payload = toContextPayload(d);
      const res = await fetch(`${BACKEND_URL}/api/admin/contexts/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setNotif({ type: 'success', message: translationMounted ? t('imported') : 'Imported successfully' });
    } catch (e: any) {
      setNotif({ type: 'error', message: String(e?.message || e) });
    } finally {
      setImportingById((m) => ({ ...m, [placeId]: false }));
    }
  };

  const previewAndImport = async (placeId: string) => {
    try {
      setImportingById((m) => ({ ...m, [placeId]: true }));
      const d = await fetchDetails(placeId);
      if (!d) throw new Error('Failed to load place details');
      const payload = toContextPayload(d);
      // Simple inline edit via prompt-style modal
      const ok = await dialog.confirm({
        title: translationMounted ? t('confirm') : 'Confirm Import',
        description: `${translationMounted ? t('import') : 'Import'}: ${payload.title}\n\n${payload.body.substring(0, 200)}${payload.body.length > 200 ? '...' : ''}`,
        confirmText: translationMounted ? t('import') : 'Import'
      });
      if (!ok) return;
      const res = await fetch(`${BACKEND_URL}/api/admin/contexts/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setNotif({ type: 'success', message: translationMounted ? t('imported') : 'Imported successfully' });
    } catch (e: any) {
      setNotif({ type: 'error', message: String(e?.message || e) });
    } finally {
      setImportingById((m) => ({ ...m, [placeId]: false }));
    }
  };

  const bulkImportSelected = async () => {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (ids.length === 0) return;
    const ok = await dialog.confirm({ title: translationMounted ? t('confirm') : 'Confirm', description: `${translationMounted ? t('import') : 'Import'} ${ids.length} places?`, confirmText: translationMounted ? t('import') : 'Import' });
    if (!ok) return;
    setIsImporting(true);
    let success = 0; let fail = 0;
    for (const pid of ids) {
      try { await quickImport(pid); success++; } catch { fail++; }
    }
    setIsImporting(false);
    await dialog.alert({ title: translationMounted ? t('done') : 'Done', description: `${translationMounted ? t('imported') : 'Imported'}: ${success}, ${translationMounted ? 'Failed' : 'Failed'}: ${fail}` });
  };

  const importFromUrl = async () => {
    if (!mapsUrl.trim()) return;
    try {
      setIsImporting(true);
      // Ask backend to parse & prepare data from URL, then create context via /contexts
      const res = await fetch(`${BACKEND_URL}/api/admin/import/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
        body: JSON.stringify({ url: mapsUrl.trim() })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const payload = {
        type: 'place',
        title: data.title || 'Place',
        body: data.body || '',
        attributes: data.attributes || {},
        trust_level: 4,
        language: 'en',
        status: 'active',
        keywords: [],
      } as any;
      const r2 = await fetch(`${BACKEND_URL}/api/admin/contexts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
        body: JSON.stringify(payload),
      });
      if (!r2.ok) throw new Error(await r2.text());
      await dialog.alert({ title: translationMounted ? t('done') : 'Done', description: translationMounted ? t('imported') : 'Imported successfully' });
    } catch (e: any) {
      await dialog.alert({ title: translationMounted ? t('error') : 'Error', description: String(e?.message || e) });
    } finally {
      setIsImporting(false);
    }
  };

  const columns = [
    {
      key: 'select',
      title: '',
      render: (_: any, row: NearbyItem) => (
        <input
          type="checkbox"
          checked={!!selected[row.place_id]}
          onChange={(e) => setSelected((s) => ({ ...s, [row.place_id]: e.target.checked }))}
        />
      ),
    },
    {
      key: 'photo',
      title: '',
      render: (_: any, row: NearbyItem) => {
        const thumb = row.photo_ref ? `${BACKEND_URL}/api/admin/import/google-photo?ref=${encodeURIComponent(row.photo_ref)}&tenant_id=${encodeURIComponent(tenantId)}&max=220` : '';
        const full = row.photo_ref ? `${BACKEND_URL}/api/admin/import/google-photo?ref=${encodeURIComponent(row.photo_ref)}&tenant_id=${encodeURIComponent(tenantId)}&max=480` : '';
        return (
          <div className="w-16 h-12 rounded overflow-hidden bg-[color:var(--bg-muted)] flex items-center justify-center">
            {row.photo_ref ? (
              // Use img tag to avoid Next image domain restrictions
              <img
                src={thumb}
                alt={row.name}
                className="w-full h-full object-cover"
                onMouseEnter={(e) => {
                  if (hoverTimerRef.current) { window.clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
                  const target = e.currentTarget as HTMLImageElement;
                  const rect = target.getBoundingClientRect();
                  hoverTimerRef.current = window.setTimeout(() => {
                    let px = rect.right + 12;
                    let py = rect.top;
                    if (typeof window !== 'undefined') {
                      if (px + PREVIEW_W > window.innerWidth - 8) px = rect.left - PREVIEW_W - 12;
                      if (py + PREVIEW_H > window.innerHeight - 8) py = Math.max(8, window.innerHeight - PREVIEW_H - 8);
                      if (py < 8) py = 8;
                    }
                    // show thumb immediately near the image
                    setHoverPreview({ src: thumb, x: px, y: py });
                    // preload full and swap
                    const img = new Image();
                    img.onload = () => setHoverPreview((p) => p ? { ...p, src: full } : p);
                    img.src = full;
                  }, 300) as unknown as number;
                }}
                onMouseLeave={() => {
                  if (hoverTimerRef.current) { window.clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
                  setHoverPreview(null);
                }}
                onMouseMove={(e) => {
                  // if preview visible, keep it anchored next to the thumbnail while moving within cell
                  if (!hoverPreview) return;
                  const target = e.currentTarget as HTMLImageElement;
                  const rect = target.getBoundingClientRect();
                  let px = rect.right + 12;
                  let py = rect.top;
                  if (typeof window !== 'undefined') {
                    if (px + PREVIEW_W > window.innerWidth - 8) px = rect.left - PREVIEW_W - 12;
                    if (py + PREVIEW_H > window.innerHeight - 8) py = Math.max(8, window.innerHeight - PREVIEW_H - 8);
                    if (py < 8) py = 8;
                  }
                  setHoverPreview((p) => p ? { ...p, x: px, y: py } : p);
                }}
              />
            ) : (
              <svg className="h-6 w-6 text-[color:var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
            )}
          </div>
        );
      },
    },
    {
      key: 'name',
      title: translationMounted ? t('name') : 'Name',
      sortable: true,
      render: (_: any, row: NearbyItem) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-[color:var(--text-muted)]">{row.vicinity || '—'}</div>
        </div>
      ),
    },
    {
      key: 'rating',
      title: translationMounted ? 'Rating' : 'Rating',
      render: (_: any, row: NearbyItem) => (
        <div className="flex items-center gap-1 text-sm">
          <span>{row.rating ?? '—'}</span>
          {typeof row.user_ratings_total === 'number' && (
            <span className="text-[color:var(--text-muted)]">({row.user_ratings_total})</span>
          )}
        </div>
      ),
    },
    {
      key: 'types',
      title: translationMounted ? t('type') : 'Type',
      render: (_: any, row: NearbyItem) => {
        const toTitle = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
        const labelForType = (key: string) => {
          if (!translationMounted) return toTitle(key);
          const k = `type_${key}`;
          const v = (t as any)(k);
          // If missing translation, t(k) tends to return the key itself; fallback to title
          return (typeof v === 'string' && v.startsWith('type_')) ? toTitle(key) : (v as string);
        };
        return (
          <div className="flex flex-wrap gap-1">
            {(row.types || []).slice(0, 3).map((tp) => (
              <Badge key={tp} size="sm">{labelForType(tp)}</Badge>
            ))}
            {(row.types || []).length > 3 && <Badge size="sm" variant="default">+{(row.types || []).length - 3}</Badge>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      title: translationMounted ? t('actions') : 'Actions',
      render: (_: any, row: NearbyItem) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => previewAndImport(row.place_id)} loading={!!importingById[row.place_id]} disabled={!!importingById[row.place_id]}>
            {translationMounted ? 'Preview' : 'Preview & Import'}
          </Button>
          <Button size="sm" onClick={() => quickImport(row.place_id)} loading={!!importingById[row.place_id]} disabled={!!importingById[row.place_id]}>
            {translationMounted ? t('import') : 'Quick Import'}
          </Button>
        </div>
      ),
    },
  ];

  const allPlaceTypeKeys: string[] = [
    // Popular & commerce
    'restaurant','cafe','bar','bakery','meal_delivery','meal_takeaway','night_club','shopping_mall','store','supermarket','convenience_store',
    'clothing_store','shoe_store','jewelry_store','department_store','electronics_store','furniture_store','hardware_store','home_goods_store','book_store','bicycle_store','liquor_store','pet_store','pharmacy','beauty_salon','hair_care','spa',
    // Services & offices
    'bank','atm','insurance_agency','real_estate_agency','travel_agency','lawyer','accounting','car_rental','car_repair','car_wash','moving_company','storage','post_office','local_government_office','embassy','city_hall','courthouse','police','fire_station',
    // Health & education
    'hospital','doctor','dentist','physiotherapist','veterinary_care','primary_school','secondary_school','school','university','library',
    // Transport & infrastructure
    'airport','bus_station','train_station','subway_station','light_rail_station','transit_station','taxi_stand','parking','gas_station',
    // Leisure & tourism
    'tourist_attraction','museum','art_gallery','zoo','aquarium','amusement_park','stadium','park','campground','rv_park','casino',
    // Religion
    'church','hindu_temple','mosque','synagogue',
    // Home & contractors
    'electrician','plumber','painter','roofing_contractor','locksmith',
    // Media & movies
    'movie_theater','movie_rental',
    // Lodging
    'lodging',
  ];

  const typeOptions = React.useMemo(() => {
    const toTitle = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    const labelForType = (key: string) => {
      if (!translationMounted) return toTitle(key);
      const k = `type_${key}`;
      const v = (t as any)(k);
      return (typeof v === 'string' && v.startsWith('type_')) ? toTitle(key) : (v as string);
    };
    return [
      { value: '', label: translationMounted ? t('allTypes') : 'All Types' },
      ...allPlaceTypeKeys.map((k) => ({ value: k, label: labelForType(k) }))
    ];
  }, [translationMounted, t]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
    });
  };

  return (
    <>
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{translationMounted ? t('import') : 'Import Places'}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={bulkImportSelected} disabled={isImporting}>
            {translationMounted ? t('importSelected') : 'Import Selected'}
          </Button>
        </div>
      </div>

      {notif && (
        <div className={`fixed right-4 top-4 z-50 px-4 py-2 rounded shadow ${notif.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
             onAnimationEnd={() => setNotif(null)}>
          {notif.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <Input type="number" step="any" label={translationMounted ? t('latitude') : 'Latitude'} value={String(lat)} onChange={(e) => setLat(Number(e.target.value))} />
        <Input type="number" step="any" label={translationMounted ? t('longitude') : 'Longitude'} value={String(lng)} onChange={(e) => setLng(Number(e.target.value))} />
        <Input type="number" label={translationMounted ? 'Radius (m)' : 'Radius (m)'} value={String(radius)} onChange={(e) => setRadius(Number(e.target.value))} />
        <Select
          label={translationMounted ? 'Type' : 'Type'}
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={typeOptions}
        />
        <Input label={translationMounted ? t('keyword') : 'Keyword'} placeholder={translationMounted ? t('keyword') : 'Keyword'} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <Input type="number" label={translationMounted ? t('limit') : 'Limit'} value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))} />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={useMyLocation}>
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11a1 1 0 110 2 1 1 0 010-2z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-9-9 9 9 0 019 9z"/></svg>
          {translationMounted ? t('useMyLocation') : 'Use my location'}
        </Button>
        <Button onClick={searchNearby} disabled={loading}>
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          {translationMounted ? t('search') : 'Search Nearby'}
        </Button>
      </div>

      <div className="rounded border border-[color:var(--border)]">
        <Table
          columns={columns}
          data={items}
          loading={loading}
          onSort={() => {}}
          sortKey={"name"}
          sortDirection={"asc"}
          className="w-full"
          empty={
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-[color:var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-[color:var(--text)]">{translationMounted ? t('noData') : 'No results yet'}</h3>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">{translationMounted ? 'Adjust parameters and search nearby places.' : 'Adjust parameters and search nearby places.'}</p>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <Input className="md:col-span-5" placeholder={translationMounted ? t('googleMapsUrl') : 'Google Maps URL'} value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} />
        <Button onClick={importFromUrl} disabled={isImporting || !mapsUrl.trim()}>{translationMounted ? t('import') : 'Import from URL'}</Button>
      </div>
    </main>
    {hoverPreview && (
      <div className="fixed z-60 rounded-lg shadow-lg border border-[color:var(--border)] overflow-hidden bg-[color:var(--surface)]"
           style={{ left: hoverPreview.x, top: hoverPreview.y, width: PREVIEW_W, height: PREVIEW_H, pointerEvents: 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hoverPreview.src} alt="preview" className="w-full h-full object-cover" />
      </div>
    )}
    </>
  );
}


