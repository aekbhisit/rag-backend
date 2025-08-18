import { Router } from 'express';
import { importService } from '../../services/importService.js';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { TenantsRepository } from '../../repositories/tenantsRepository';

const router = Router();
const tenantsRepo = new TenantsRepository(getPostgresPool());

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
    const apiKey = tenant?.settings?.tenant?.integrations?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY;
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
    const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
    const tenant = await tenantsRepo.get(tenantId);
    const apiKey = tenant?.settings?.tenant?.integrations?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Google Maps API not configured' });
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${encodeURIComponent(ref)}&key=${apiKey}`;
    // Follow redirect and return the image bytes
    let r = await fetch(url, { redirect: 'follow' });
    // Some responses may be 302 with Location header and not auto-followed in certain environments
    if (r.status >= 300 && r.status < 400) {
      const location = r.headers.get('location');
      if (location) {
        r = await fetch(location);
      }
    }
    const ct = r.headers.get('content-type') || 'image/jpeg';
    const ab = await r.arrayBuffer();
    const buffer = Buffer.from(ab);
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buffer);
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
    const firecrawlKey = tenant?.settings?.tenant?.integrations?.firecrawlApiKey || process.env.FIRECRAWL_API_KEY;
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
