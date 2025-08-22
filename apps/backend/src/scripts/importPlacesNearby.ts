/*
  Import nearby places into contexts via /api/admin/contexts/import

  Usage examples:
    BACKEND_URL=http://localhost:3001 \
    TENANT_ID=00000000-0000-0000-0000-000000000000 \
    GOOGLE_PLACES_API_KEY=YOUR_KEY \
    pnpm tsx src/scripts/importPlacesNearby.ts --lat 13.7563 --lng 100.5018 --radius 1500 --keyword cafe --limit 10

    BACKEND_URL=https://rag.haahii.com \
    TENANT_ID=00000000-0000-0000-0000-000000000000 \
    GOOGLE_PLACES_API_KEY=YOUR_KEY \
    pnpm tsx src/scripts/importPlacesNearby.ts --lat 13.736 --lng 100.523 --type restaurant --limit 5
*/

type CliOptions = {
  lat: number;
  lng: number;
  radius?: number; // meters
  type?: string;   // Google Places type (category)
  keyword?: string;
  limit?: number;
  dryRun?: boolean;
};

type PlaceNearby = {
  place_id: string;
  name: string;
  vicinity?: string;
  geometry?: { location?: { lat: number; lng: number } };
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{ photo_reference: string; width: number; height: number }>;
};

type PlaceDetails = {
  result?: {
    place_id: string;
    name: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    url?: string;
    geometry?: { location?: { lat: number; lng: number } };
    opening_hours?: { weekday_text?: string[] };
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
    photos?: Array<{ photo_reference: string; width: number; height: number }>;
  };
};

function parseArgs(argv: string[]): CliOptions {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  const lat = Number(args.lat);
  const lng = Number(args.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error('Missing or invalid --lat and --lng');
  }
  const radius = args.radius !== undefined ? Number(args.radius) : undefined;
  const limit = args.limit !== undefined ? Number(args.limit) : 20;
  const type = typeof args.type === 'string' ? String(args.type) : undefined;
  const keyword = typeof args.keyword === 'string' ? String(args.keyword) : undefined;
  const dryRun = args.dryRun === true || String(args.dryRun).toLowerCase() === 'true';
  return { lat, lng, radius, type, keyword, limit, dryRun };
}

async function nearbySearch(opts: CliOptions, apiKey: string): Promise<PlaceNearby[]> {
  const base = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  const params = new URLSearchParams();
  params.set('location', `${opts.lat},${opts.lng}`);
  if (opts.radius && opts.radius > 0) params.set('radius', String(opts.radius));
  if (!opts.radius) params.set('rankby', 'distance');
  if (opts.type) params.set('type', opts.type);
  if (opts.keyword) params.set('keyword', opts.keyword);
  params.set('key', apiKey);
  const url = `${base}?${params.toString()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`NearbySearch failed: ${r.status} ${r.statusText}`);
  const j = await r.json();
  const status: string = j.status;
  const errorMessage: string | undefined = j.error_message;
  if (status && status !== 'OK') {
    if (status === 'ZERO_RESULTS') {
      console.log('Google Places returned ZERO_RESULTS for given location/filters');
      return [];
    }
    throw new Error(`Google Places error: ${status}${errorMessage ? ` - ${errorMessage}` : ''}`);
  }
  const results: PlaceNearby[] = Array.isArray(j.results) ? j.results : [];
  return results.slice(0, opts.limit || 20);
}

async function getDetails(placeId: string, apiKey: string): Promise<PlaceDetails['result'] | undefined> {
  const base = 'https://maps.googleapis.com/maps/api/place/details/json';
  const params = new URLSearchParams();
  params.set('place_id', placeId);
  params.set('fields', [
    'place_id', 'name', 'formatted_address', 'formatted_phone_number',
    'international_phone_number', 'website', 'url', 'geometry/location',
    'opening_hours/weekday_text', 'rating', 'user_ratings_total', 'types', 'photos'
  ].join(','));
  params.set('key', apiKey);
  const url = `${base}?${params.toString()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`PlaceDetails failed: ${r.status} ${r.statusText}`);
  const j: PlaceDetails = await r.json();
  return j.result;
}

function toContextPayload(p: NonNullable<PlaceDetails['result']>): any {
  const lat = p.geometry?.location?.lat;
  const lng = p.geometry?.location?.lng;
  const title = p.name || 'Place';
  const address = p.formatted_address || '';
  const phone = p.international_phone_number || p.formatted_phone_number || '';
  const website = p.website || p.url || '';
  const rating = p.rating !== undefined ? `Rating: ${p.rating} (${p.user_ratings_total || 0} reviews)` : '';
  const types = p.types || [];
  const photo = p.photos && p.photos.length > 0 ? p.photos[0].photo_reference : undefined;
  const openingHours = p.opening_hours?.weekday_text || [];

  const lines: string[] = [];
  if (address) lines.push(`Address: ${address}`);
  if (phone) lines.push(`Phone: ${phone}`);
  if (website) lines.push(`Website: ${website}`);
  if (rating) lines.push(rating);
  if (lat !== undefined && lng !== undefined) lines.push(`Location: ${lat},${lng}`);
  if (types.length) lines.push(`Categories: ${types.join(', ')}`);

  return {
    type: 'place',
    title,
    body: lines.join('\n'),
    instruction: 'Use the provided details as reference when answering related queries.',
    // Also provide root latitude/longitude for the import endpoint
    latitude: typeof lat === 'number' ? lat : undefined,
    longitude: typeof lng === 'number' ? lng : undefined,
    attributes: {
      address,
      // Ensure keys match backend extractor: lat / longitude (or lng)
      lat,
      longitude: lng,
      phone,
      opening_hours: openingHours,
      rating: p.rating,
      source_uri: website,
      google_place_id: p.place_id,
      imported_at: new Date().toISOString()
    },
    trust_level: 4,
    language: 'en',
    status: 'active',
    keywords: types
  };
}

async function importOneContext(ctx: any, backendUrl: string, tenantId: string): Promise<void> {
  const url = `${backendUrl.replace(/\/$/, '')}/api/admin/contexts/import`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId,
    },
    body: JSON.stringify(ctx)
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Import failed: ${r.status} ${r.statusText} - ${text}`);
  }
}

async function main() {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  const TENANT_ID = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000000';
  const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  if (!API_KEY) {
    throw new Error('GOOGLE_PLACES_API_KEY (or GOOGLE_MAPS_API_KEY) is required');
  }

  const opts = parseArgs(process.argv.slice(2));
  console.log('Searching nearby places with options:', opts);

  const nearby = await nearbySearch(opts, API_KEY);
  console.log(`Found ${nearby.length} nearby candidates`);

  let imported = 0;
  for (const n of nearby) {
    try {
      const det = await getDetails(n.place_id, API_KEY);
      if (!det) continue;
      const payload = toContextPayload(det);
      if (opts.dryRun) {
        console.log('DRY-RUN import payload:', payload);
      } else {
        await importOneContext(payload, BACKEND_URL, TENANT_ID);
        imported++;
        console.log(`Imported: ${payload.title}`);
      }
    } catch (e: any) {
      console.warn(`Skip place ${n.place_id}: ${e?.message || e}`);
    }
  }

  console.log(`Done. Imported ${imported} places.`);
}

main().catch((e) => {
  console.error('❌ Import failed:', e);
  process.exit(1);
});


