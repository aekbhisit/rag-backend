import { Router } from 'express';
import { importService } from '../../services/importService.js';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { TenantsRepository } from '../../repositories/tenantsRepository';

const router = Router();
const tenantsRepo = new TenantsRepository(getPostgresPool());

/**
 * Nearby places proxy (Google Places) without exposing API key to frontend
 * GET /api/admin/import/places/nearby?lat=..&lng=..&radius=..&type=..&keyword=..&limit=..
 */
router.get('/places/nearby', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = req.query.radius !== undefined ? Number(req.query.radius) : undefined;
    const type = typeof req.query.type === 'string' ? String(req.query.type) : undefined;
    const keyword = typeof req.query.keyword === 'string' ? String(req.query.keyword) : undefined;
    const limit = req.query.limit !== undefined ? Math.max(1, Math.min(50, Number(req.query.limit))) : 20;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Invalid lat/lng' });
    }

    const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
    const tenant = await tenantsRepo.get(tenantId);
    const apiKey = tenant?.settings?.integrations?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Google Maps API not configured' });

    const base = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const params = new URLSearchParams();
    params.set('location', `${lat},${lng}`);
    if (radius && radius > 0) params.set('radius', String(radius));
    if (!radius) params.set('rankby', 'distance');
    if (type) params.set('type', type);
    if (keyword) params.set('keyword', keyword);
    params.set('key', apiKey);
    const url = `${base}?${params.toString()}`;
    let j: any = null;
    try {
      const r = await fetch(url);
      const text = await r.text();
      try { j = JSON.parse(text); } catch {
        return res.status(502).json({ error: `Google Places returned non-JSON (${r.status})`, details: text?.slice(0, 4000) || null });
      }
      if (!r.ok) {
        return res.status(502).json({ error: `Google Places HTTP ${r.status}`, details: j?.error_message || null, status: j?.status });
      }
    } catch (err: any) {
      return res.status(502).json({ error: 'Failed to call Google Places', details: String(err?.message || err) });
    }
    if (j?.status && j.status !== 'OK' && j.status !== 'ZERO_RESULTS') {
      return res.status(502).json({ error: `Google Places error: ${j?.status}`, details: j?.error_message || null });
    }
    const items = Array.isArray(j?.results) ? j.results : [];
    const mapped = items.slice(0, limit).map((p: any) => ({
      place_id: p.place_id,
      name: p.name,
      vicinity: p.vicinity,
      rating: p.rating,
      user_ratings_total: p.user_ratings_total,
      types: p.types || [],
      location: { lat: p.geometry?.location?.lat, lng: p.geometry?.location?.lng },
      photo_ref: Array.isArray(p.photos) && p.photos[0]?.photo_reference ? p.photos[0].photo_reference : undefined,
    }));
    res.json({ items: mapped });
  } catch (error) {
    next(error);
  }
});

/**
 * Place details proxy (Google Places Details)
 * GET /api/admin/import/places/details?place_id=...
 */
router.get('/places/details', async (req, res, next) => {
  try {
    const placeId = (req.query.place_id as string) || '';
    if (!placeId) return res.status(400).json({ error: 'place_id is required' });
    const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
    const tenant = await tenantsRepo.get(tenantId);
    const apiKey = tenant?.settings?.integrations?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Google Maps API not configured' });

    const base = 'https://maps.googleapis.com/maps/api/place/details/json';
    const fields = [
      'place_id', 'name', 'formatted_address', 'vicinity', 'geometry/location', 'formatted_phone_number', 'international_phone_number',
      'website', 'opening_hours/weekday_text', 'types', 'rating', 'user_ratings_total', 'price_level', 'photos', 'editorial_summary', 'business_status', 'url'
    ].join(',');
    const params = new URLSearchParams({ place_id: placeId, fields, key: apiKey });
    const url = `${base}?${params.toString()}`;
    let j: any = null;
    try {
      const r = await fetch(url);
      const text = await r.text();
      try { j = JSON.parse(text); } catch {
        return res.status(502).json({ error: `Place details returned non-JSON (${r.status})`, details: text?.slice(0, 4000) || null });
      }
      if (!r.ok) {
        return res.status(502).json({ error: `Place details HTTP ${r.status}`, details: j?.error_message || null, status: j?.status });
      }
    } catch (err: any) {
      return res.status(502).json({ error: 'Failed to call Place details', details: String(err?.message || err) });
    }
    if (j?.status && j.status !== 'OK') {
      return res.status(502).json({ error: `Place details error: ${j?.status}`, details: j?.error_message || null });
    }
    const d = j?.result || {};
    const photoReferences: string[] = Array.isArray(d.photos) ? d.photos.slice(0, 5).map((p: any) => p.photo_reference) : [];
    const publicBase = process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
    const proxyBase = publicBase ? publicBase.replace(/\/$/, '') : '';
    const images: string[] = photoReferences.map((ref) => `${proxyBase || ''}/api/admin/import/google-photo?ref=${encodeURIComponent(ref)}`);
    res.json({
      place_id: d.place_id || placeId,
      name: d.name,
      formatted_address: d.formatted_address || d.vicinity,
      location: { lat: d.geometry?.location?.lat, lng: d.geometry?.location?.lng },
      phone: d.formatted_phone_number || d.international_phone_number,
      website: d.website || d.url,
      opening_hours: d.opening_hours?.weekday_text || [],
      types: d.types || [],
      rating: d.rating,
      user_ratings_total: d.user_ratings_total,
      price_level: d.price_level,
      editorial_summary: d.editorial_summary?.overview || '',
      images,
      photo_references: photoReferences,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Import place data from Google Maps URL
 */
router.post('/place', async (req, res, next) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required' 
      });
    }

    // Validate that it's a Google Maps URL
    if (!url.includes('google.com/maps') && !url.includes('goo.gl/maps')) {
      return res.status(400).json({ 
        error: 'Invalid Google Maps URL' 
      });
    }

    const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
    const tenant = await tenantsRepo.get(tenantId);
    const apiKey = tenant?.settings?.integrations?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'Google Maps API key not configured' });
    }
    const imported = await importService.importFromGoogleMaps(url, apiKey);
    res.json(imported);
  } catch (error) {
    console.error('Import place error:', error);
    next(error);
  }
});

/**
 * Proxy Google Photo by reference to avoid exposing API key in frontend
 */
router.get('/google-photo', async (req, res, next) => {
  try {
    const ref = (req.query.ref as string) || '';
    if (!ref) return res.status(400).json({ error: 'Missing ref' });
    // Accept tenant id via query since <img> requests cannot send custom headers
    const tenantId = ((req.query.tenant_id as string) || req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
    const tenant = await tenantsRepo.get(tenantId);
    const apiKey = tenant?.settings?.integrations?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Google Maps API not configured' });
    const reqMax = Number((req.query.max as string) || (req.query.maxwidth as string) || 1200);
    const maxwidth = Number.isFinite(reqMax) ? Math.max(64, Math.min(1600, Math.floor(reqMax))) : 1200;
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${encodeURIComponent(ref)}&key=${apiKey}`;
    try {
      // Follow redirect and return the image bytes
      let r = await fetch(url, { redirect: 'follow' });
      if (r.status >= 300 && r.status < 400) {
        const location = r.headers.get('location');
        if (location) {
          r = await fetch(location);
        }
      }
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        return res.status(502).json({ error: `Google Photo HTTP ${r.status}`, details: text?.slice(0, 2000) || null });
      }
      const ct = r.headers.get('content-type') || 'image/jpeg';
      const ab = await r.arrayBuffer();
      const buffer = Buffer.from(ab);
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.status(200).send(buffer);
    } catch (err: any) {
      return res.status(502).json({ error: 'Failed to fetch Google Photo', details: String(err?.message || err) });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Import website content by scraping
 */
router.post('/website', async (req, res, next) => {
  try {
    const { url, preferFirecrawlFirst, engine } = req.body as { url?: string; preferFirecrawlFirst?: boolean; engine?: 'local' | 'firecrawl' | 'auto_local_first' | 'auto_firecrawl_first' };
    
    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required' 
      });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ 
        error: 'Invalid URL format' 
      });
    }

    const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
    const tenant = await tenantsRepo.get(tenantId);
    const firecrawlKey = tenant?.settings?.integrations?.firecrawlApiKey || process.env.FIRECRAWL_API_KEY;
    const imported = await importService.importFromWebsite(url, firecrawlKey, { preferFirecrawlFirst: !!preferFirecrawlFirst, engine });
    res.json(imported);
  } catch (error) {
    next(error);
  }
});

/**
 * Import document content and metadata
 */
router.post('/doc_chunk', async (req, res, next) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'Document URL is required' 
      });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ 
        error: 'Invalid URL format' 
      });
    }

    const imported = await importService.importFromDocument(url);
    res.json(imported);
  } catch (error) {
    next(error);
  }
});

// Alias for document (backward-compat)
router.post('/document', async (req, res, next) => {
  try {
    (req as any).params = req.params;
    req.url = '/doc_chunk';
    next();
  } catch (e) { next(e); }
});

/**
 * Upload document as base64 data URL
 */
router.post('/doc_upload', async (req, res, next) => {
  try {
    const { fileDataUrl, filename } = req.body as { fileDataUrl?: string; filename?: string };
    if (!fileDataUrl) {
      return res.status(400).json({ error: 'fileDataUrl is required (data URL)' });
    }
    const name = filename || 'document';
    const lower = name.toLowerCase();
    if (!fileDataUrl.includes(',')) {
      return res.status(400).json({ error: 'Invalid data URL format' });
    }
    const base64 = (fileDataUrl.split(',')[1] || '').replace(/\s+/g, '').trim();
    const buffer = Buffer.from(base64, 'base64');

    // Try by extension; convert to markdown where applicable
    if (lower.endsWith('.pdf')) {
      try {
        const { text, pages } = await importService.extractPdfTextPreferPoppler(new Uint8Array(buffer), 20);
        return res.json({
          title: `PDF: ${name}`,
          body: importService.normalizeMarkdownString(text.trim()),
          attributes: { source_uri: name, filename: name, file_type: 'PDF Document', pages, imported_at: new Date().toISOString() }
        });
      } catch (e: any) {
        return res.status(422).json({ error: `Failed to parse PDF: ${e?.message || e}` });
      }
    }
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
      try {
        const mammoth: any = await import('mammoth');
        const converter: any = (mammoth as any).convertToMarkdown || (mammoth as any).default?.convertToMarkdown;
        if (typeof converter !== 'function') throw new Error('mammoth.convertToMarkdown not available');
        const result = await converter({ buffer });
        return res.json({
          title: `DOC: ${name}`,
          body: importService.normalizeMarkdownString((result?.value || '').toString()),
          attributes: { source_uri: name, filename: name, file_type: 'Word Document', warnings: result?.messages || [], imported_at: new Date().toISOString() }
        });
      } catch (e: any) {
        return res.status(422).json({ error: `Failed to parse DOC/DOCX: ${e?.message || e}` });
      }
    }
    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      const html = buffer.toString('utf8');
      return res.json({
        title: `HTML: ${name}`,
        body: importService.toMarkdownFromHtml(html),
        attributes: { source_uri: name, filename: name, file_type: 'HTML Document', imported_at: new Date().toISOString() }
      });
    }
    const text = buffer.toString('utf8');
    return res.json({
      title: `Document: ${name}`,
      body: importService.normalizeMarkdownString(text),
      attributes: { source_uri: name, filename: name, file_type: 'Unknown', imported_at: new Date().toISOString() }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * OCR ticket image (base64 data URL) and extract structured fields
 */
router.post('/ticket-ocr', async (req, res, next) => {
  try {
    const { imageDataUrl, model } = req.body as { imageDataUrl?: string; model?: string };
    if (!imageDataUrl) {
      return res.status(400).json({ error: 'imageDataUrl is required (data URL of the ticket image)' });
    }
    const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
    const tenants = await tenantsRepo.get(tenantId);
    const openaiKey = tenants?.settings?.aiModel?.generating?.apiKey || process.env.OPENAI_API_KEY;
    const chosenModel = model || tenants?.settings?.aiModel?.generating?.model || 'gpt-4o-mini';
    const imported = await importService.importFromTicketImage(imageDataUrl, openaiKey, chosenModel);
    res.json(imported);
  } catch (error) {
    next(error);
  }
});

/**
 * Health check for import services
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      google_maps: 'available',
      website_scraper: 'available', 
      document_parser: 'available',
      ticket_ocr: 'available'
    },
    timestamp: new Date().toISOString()
  });
});

export { router as importRoutes };
