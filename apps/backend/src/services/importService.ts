import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Service for importing context data from external sources
 */
export interface ImportedData {
  title: string;
  body: string;
  attributes: Record<string, any>;
}

export class ImportService {
  private normalizeMarkdown(md: string): string {
    if (!md) return '';
    const parts = md.split(/```/);
    for (let i = 0; i < parts.length; i += 2) {
      // Outside code blocks: collapse spaces, trim line ends, collapse excessive blank lines
      const cleaned = parts[i]
        .split('\n')
        .map(line => line.replace(/[ \t]+/g, ' ').replace(/[ \t]+$/g, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      parts[i] = cleaned;
    }
    const result = parts.join('```').trim();
    return result;
  }
  /**
   * Import place data from Google Maps URL
   */
  async importFromGoogleMaps(url: string, apiKeyOverride?: string): Promise<ImportedData> {
    try {
      // Extract info from URL
      const placeInfo = this.parseGoogleMapsUrl(url);

      // Try real Google Places API if key is set in env
      const apiKey = apiKeyOverride || process.env.GOOGLE_MAPS_API_KEY;
      if (apiKey && (placeInfo.placeId || (placeInfo.lat && placeInfo.lng))) {
        const details = await this.fetchPlaceDetails(apiKey, placeInfo);
        return details;
      }

      // Fallback: generate mock data
      const mockPlaceData = this.generateMockPlaceData(placeInfo, url);
      return {
        title: mockPlaceData.title,
        body: mockPlaceData.body,
        attributes: {
          address: mockPlaceData.address,
          lat: mockPlaceData.lat,
          lng: mockPlaceData.lng,
          lon: mockPlaceData.lng,
          phone: mockPlaceData.phone,
          website: mockPlaceData.website,
          hours: mockPlaceData.hours,
          category: mockPlaceData.category,
          rating: mockPlaceData.rating,
          price_range: mockPlaceData.price_range,
          google_place_id: placeInfo.placeId,
          source_url: url,
          imported_at: new Date().toISOString(),
          images: mockPlaceData.images || []
        }
      };
    } catch (error) {
      const msg = (error as any)?.message || String(error);
      throw new Error(`Failed to import from Google Maps: ${msg}`);
    }
  }

  private async fetchPlaceDetails(apiKey: string, placeInfo: any): Promise<ImportedData> {
    // Prefer Place Details by place_id; else, reverse geocode coords then text search
    const base = 'https://maps.googleapis.com/maps/api/place';
    let placeId = placeInfo.placeId as string | undefined;
    let localityHint: string | undefined;
    if (!placeId && placeInfo.lat && placeInfo.lng) {
      // Nearby search to get a place id for the coordinate (wider radius)
      const nearbyUrl = `${base}/nearbysearch/json?location=${placeInfo.lat},${placeInfo.lng}&radius=1500&type=restaurant&key=${apiKey}`;
      const nearbyRes = await fetch(nearbyUrl);
      const nearby = await nearbyRes.json();
      const nres: any[] = Array.isArray(nearby?.results) ? nearby.results : [];
      const candidate = nres.find(r => (r.types || []).includes('seafood_restaurant'))
        || nres.find(r => (r.types || []).includes('restaurant'))
        || nres[0];
      placeId = candidate?.place_id;

      // Geocode to get locality hint
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${placeInfo.lat},${placeInfo.lng}&key=${apiKey}`;
      const geoRes = await fetch(geoUrl);
      const geo = await geoRes.json();
      const components: any[] = geo?.results?.[0]?.address_components || [];
      const getComp = (type: string) => components.find(c => (c.types || []).includes(type))?.long_name;
      localityHint = getComp('sublocality') || getComp('locality') || getComp('administrative_area_level_2') || getComp('administrative_area_level_1');
    }

    if (!placeId && placeInfo.name) {
      const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9ก-๙เแโใไ]+/g, ' ').trim();
      const target = normalize(placeInfo.name);
      // Text search with optional location bias and locality hint if available
      const query = localityHint ? `${placeInfo.name} ${localityHint}` : placeInfo.name;
      const bias = placeInfo.lat && placeInfo.lng ? `&location=${placeInfo.lat},${placeInfo.lng}&radius=4000` : '';
      const textUrl = `${base}/textsearch/json?query=${encodeURIComponent(query)}&type=restaurant${bias}&region=th&key=${apiKey}`;
      const textRes = await fetch(textUrl);
      const text = await textRes.json();
      let results: any[] = Array.isArray(text?.results) ? text.results : [];
      // Prefer seafood restaurant, then restaurant, then highest ratings
      let exact = results.find(r => normalize(r.name) === target && (r.types || []).includes('seafood_restaurant'))
        || results.find(r => normalize(r.name) === target && (r.types || []).includes('restaurant'))
        || results.find(r => normalize(r.name) === target);
      let partial = results.find(r => normalize(r.name).includes(target) && (r.types || []).includes('seafood_restaurant'))
        || results.find(r => normalize(r.name).includes(target) && (r.types || []).includes('restaurant'))
        || results.find(r => normalize(r.name).includes(target));
      let best = exact || partial || results.sort((a, b) => (b.user_ratings_total || 0) - (a.user_ratings_total || 0))[0];
      placeId = best?.place_id;

      // Find Place fallback if still not found
      if (!placeId) {
        const biasParam = placeInfo.lat && placeInfo.lng ? `&locationbias=circle:3000@${placeInfo.lat},${placeInfo.lng}` : '';
        const findUrl = `${base}/findplacefromtext/json?input=${encodeURIComponent(placeInfo.name)}&inputtype=textquery&fields=place_id,name,geometry${biasParam}&key=${apiKey}`;
        const findRes = await fetch(findUrl);
        const find = await findRes.json();
        const candidates: any[] = Array.isArray(find?.candidates) ? find.candidates : [];
        let cbest = candidates.find(c => normalize(c.name) === target) || candidates.find(c => normalize(c.name).includes(target)) || candidates[0];
        placeId = cbest?.place_id;
      }
    }

    if (!placeId) {
      throw new Error('Unable to resolve place id');
    }

    const fields = [
      'name', 'formatted_address', 'vicinity', 'geometry/location', 'formatted_phone_number', 'international_phone_number', 'website', 'opening_hours/weekday_text',
      'types', 'rating', 'user_ratings_total', 'price_level', 'photos', 'editorial_summary', 'business_status', 'url'
    ].join(',');
    const detailsUrl = `${base}/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    const details = await detailsRes.json();
    if (!detailsRes.ok || details?.status && details.status !== 'OK') {
      throw new Error(`Place details error: ${details?.status || detailsRes.status}`);
    }
    const r = details?.result || {};

    const photoReferences: string[] = Array.isArray(r.photos) ? r.photos.slice(0, 5).map((p: any) => p.photo_reference) : [];
    const publicBase = process.env.PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const images: string[] = photoReferences.map(ref => `${publicBase}/api/admin/import/google-photo?ref=${encodeURIComponent(ref)}`);

    const hours = (r.opening_hours?.weekday_text || []).reduce((acc: any, line: string) => {
      // Example: "Monday: 9:00 AM – 6:00 PM"
      const [day, time] = line.split(':').map((s) => s.trim());
      if (day && time) acc[day.substring(0,3).toLowerCase()] = time.replace(/\s/g, '').replace('–', '-');
      return acc;
    }, {} as Record<string, string>);

    // Prefer a human-friendly category
    const readableCategory = Array.isArray(r.types)
      ? (r.types.includes('seafood_restaurant') ? 'Seafood restaurant' : r.types.includes('restaurant') ? 'Restaurant' : (r.types[0] || '')).replace(/_/g, ' ')
      : '';

    return {
      title: r.name || 'Place',
      body: r.editorial_summary?.overview || `${r.name || 'Place'} — ${readableCategory}. ${r.formatted_address || r.vicinity || ''}`.trim(),
      attributes: {
        address: r.formatted_address || r.vicinity || '',
        lat: r.geometry?.location?.lat,
        lng: r.geometry?.location?.lng,
        lon: r.geometry?.location?.lng,
        phone: r.formatted_phone_number || r.international_phone_number || '',
        website: r.website || '',
        hours,
        category: readableCategory,
        rating: r.rating || undefined,
        ratings_total: r.user_ratings_total || undefined,
        price_range: typeof r.price_level === 'number' ? '$'.repeat(Math.max(1, Math.min(4, r.price_level))) : undefined,
        google_place_id: placeId,
        source_url: r.url || undefined,
        imported_at: new Date().toISOString(),
        images,
      }
    };
  }

  /**
   * Import website content by scraping
   */
  async importFromWebsite(
    url: string,
    firecrawlApiKey?: string,
    options?: { preferFirecrawlFirst?: boolean; engine?: 'local' | 'firecrawl' | 'auto_local_first' | 'auto_firecrawl_first' }
  ): Promise<ImportedData> {
    try {
      const tryLocal = async (): Promise<ImportedData> => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'RAG-Backend/1.0 Content Importer'
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const html = await response.text();
        const extracted = this.extractWebsiteData(html, url);
        const markdown = this.normalizeMarkdown(this.htmlToMarkdown(html));
        return {
          title: extracted.title || new URL(url).hostname,
          body: markdown || extracted.description || extracted.textContent || `Content from ${url}`,
          attributes: {
            url,
            domain: new URL(url).hostname,
            page_title: extracted.title,
            meta_description: extracted.description,
            meta_keywords: extracted.keywords,
            content_type: response.headers.get('content-type') || '',
            status_code: response.status,
            last_crawled: new Date().toISOString(),
            word_count: extracted.wordCount,
            text_summary: extracted.summary
          }
        };
      };

      const tryFirecrawl = async (primaryErr?: Error): Promise<ImportedData> => {
        if (!firecrawlApiKey) {
          throw primaryErr || new Error('Firecrawl API key not configured');
        }
        const fcRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firecrawlApiKey}`,
          },
          body: JSON.stringify({ url })
        });
        if (!fcRes.ok) {
          const code = fcRes.status;
          throw new Error(`Firecrawl HTTP ${code}${primaryErr ? `; after primary error: ${primaryErr.message}` : ''}`);
        }
        const fc = await fcRes.json();
        const title = fc.title || new URL(url).hostname;
        const description = fc.description || '';
        const textContent = fc.markdown || fc.text || '';
        const summary = this.generateSummary(textContent);
        return {
          title,
          body: textContent || description || `Content from ${url}`,
          attributes: {
            url,
            domain: new URL(url).hostname,
            page_title: title,
            meta_description: description,
            content_type: 'text/markdown',
            status_code: 200,
            last_crawled: new Date().toISOString(),
            word_count: textContent.split(/\s+/).filter(Boolean).length,
            text_summary: summary
          }
        };
      };

      const engine = options?.engine;
      const preferFirecrawlFirst = options?.preferFirecrawlFirst || engine === 'auto_firecrawl_first';

      // Forced engines
      if (engine === 'local') {
        return await tryLocal();
      }
      if (engine === 'firecrawl') {
        return await tryFirecrawl();
      }

      if (preferFirecrawlFirst || (options?.engine === 'auto_firecrawl_first')) {
        try {
          return await tryFirecrawl();
        } catch (fcErr) {
          // Fallback to local
          return await tryLocal();
        }
      }

      // Default: local first, then Firecrawl
      try {
        return await tryLocal();
      } catch (primaryErr) {
        return await tryFirecrawl(primaryErr as Error);
      }
    } catch (error) {
      const msg = (error as any)?.message || String(error);
      throw new Error(`Failed to import from website: ${msg}`);
    }
  }

  /**
   * Import document metadata and content
   */
  async importFromDocument(urlOrPath: string): Promise<ImportedData> {
    try {
      const url = new URL(urlOrPath);
      const filename = url.pathname.split('/').pop() || 'document';
      const lower = filename.toLowerCase();

      // If Google Docs: fetch export as HTML then convert to Markdown
      if (/docs\.google\.com\/document\//.test(url.href)) {
        // Attempt to export as HTML
        const exportUrl = url.href.includes('/export')
          ? url.href
          : url.href.replace(/\/edit.*/, '') + '/export?format=html';
        const res = await fetch(exportUrl, { headers: { 'User-Agent': 'RAG-Backend/1.0' } });
        if (!res.ok) throw new Error(`Google Docs export HTTP ${res.status}`);
        const html = await res.text();
        const md = this.normalizeMarkdown(this.htmlToMarkdown(html));
        return {
          title: `Google Doc: ${filename}`,
          body: md,
          attributes: {
            source_uri: urlOrPath,
            filename,
            file_type: 'Google Docs (HTML export)',
            imported_at: new Date().toISOString()
          }
        };
      }

      // Other URLs: fetch content by extension
      const res = await fetch(urlOrPath, { headers: { 'User-Agent': 'RAG-Backend/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (lower.endsWith('.pdf')) {
        const { text, pages } = await this.extractPdfTextPreferPoppler(new Uint8Array(buffer), 20);
        const md = this.normalizeMarkdown(text.trim());
        return {
          title: `PDF: ${filename}`,
          body: md,
          attributes: {
            source_uri: urlOrPath,
            filename,
            file_type: 'PDF Document',
            pages,
            imported_at: new Date().toISOString()
          }
        };
      }

      if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
        const mammoth = await import('mammoth');
        const result = await (mammoth as any).convertToMarkdown({ buffer });
        const md = this.normalizeMarkdown((result?.value || '').toString());
        return {
          title: `DOC: ${filename}`,
          body: md,
          attributes: {
            source_uri: urlOrPath,
            filename,
            file_type: 'Word Document',
            warnings: result?.messages || [],
            imported_at: new Date().toISOString()
          }
        };
      }

      if (lower.endsWith('.html') || lower.endsWith('.htm')) {
        const html = buffer.toString('utf8');
        const md = this.normalizeMarkdown(this.htmlToMarkdown(html));
        return {
          title: `HTML: ${filename}`,
          body: md,
          attributes: {
            source_uri: urlOrPath,
            filename,
            file_type: 'HTML Document',
            imported_at: new Date().toISOString()
          }
        };
      }

      // Fallback: treat as text
      const text = buffer.toString('utf8');
      const md = this.normalizeMarkdown(text);
      return {
        title: `Document: ${filename}`,
        body: md,
        attributes: {
          source_uri: urlOrPath,
          filename,
          file_type: this.getFileType(filename),
          imported_at: new Date().toISOString()
        }
      };
    } catch (error) {
      const msg = (error as any)?.message || String(error);
      throw new Error(`Failed to import document: ${msg}`);
    }
  }

  /**
   * Parse Google Maps URL to extract place information
   */
  private parseGoogleMapsUrl(url: string): any {
    const urlObj = new URL(url);
    
    // Extract coordinates from URL if present
    const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }

    // Extract candidate name from /maps/place/<name>/ path
    const nameMatch = url.match(/\/maps\/place\/([^\/@?]+)/);
    if (nameMatch) {
      const name = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
      return { name };
    }

    // Extract place ID if present
    const placeIdMatch = url.match(/place_id:([a-zA-Z0-9_-]+)/);
    if (placeIdMatch) {
      return {
        placeId: placeIdMatch[1]
      };
    }

    // Extract from search query
    const searchParams = urlObj.searchParams;
    const query = searchParams.get('q');
    if (query) {
      return {
        name: query,
        address: query
      };
    }

    return {};
  }

  /**
   * Extract data from HTML content
   */
  private extractWebsiteData(html: string, url: string): any {
    // Simple HTML parsing - in production, use a proper HTML parser like cheerio
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i);
    const keywordsMatch = html.match(/<meta[^>]*name=["\']keywords["\'][^>]*content=["\']([^"']+)["\'][^>]*>/i);
    
    // Derive plain text for summary and counts (no truncation)
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = textContent ? textContent.split(/\s+/) : [];
    
    return {
      title: titleMatch ? titleMatch[1].trim() : '',
      description: descMatch ? descMatch[1].trim() : '',
      keywords: keywordsMatch ? keywordsMatch[1].trim() : '',
      textContent,
      wordCount: words.length,
      summary: this.generateSummary(textContent)
    };
  }

  /**
   * Generate a simple summary of text content
   */
  private generateSummary(text: string): string {
    // Very basic summary - take first few sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).join('. ') + (sentences.length > 3 ? '...' : '');
  }

  /**
   * Minimal HTML → Markdown converter for common tags
   * Note: For production quality, use a library like turndown.
   */
  private htmlToMarkdown(html: string): string {
    if (!html) return '';
    let md = html;
    // Remove scripts/styles
    md = md.replace(/<script[\s\S]*?<\/script>/gi, '')
           .replace(/<style[\s\S]*?<\/style>/gi, '');
    // Line breaks and paragraphs
    md = md.replace(/<br\s*\/?>(?=\s*<)/gi, '\n')
           .replace(/<br\s*\/?>(?!\n)/gi, '\n')
           .replace(/<p[^>]*>/gi, '\n\n')
           .replace(/<\/p>/gi, '\n\n');
    // Headings
    md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_m, c) => `\n\n# ${this.stripTags(c).trim()}\n\n`)
           .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_m, c) => `\n\n## ${this.stripTags(c).trim()}\n\n`)
           .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_m, c) => `\n\n### ${this.stripTags(c).trim()}\n\n`)
           .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_m, c) => `\n\n#### ${this.stripTags(c).trim()}\n\n`)
           .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_m, c) => `\n\n##### ${this.stripTags(c).trim()}\n\n`)
           .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_m, c) => `\n\n###### ${this.stripTags(c).trim()}\n\n`);
    // Bold/italic/inline code
    md = md.replace(/<(b|strong)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
           .replace(/<(i|em)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*')
           .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
    // Links
    md = md.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => {
      const t = this.stripTags(text).trim() || href;
      return `[${t}](${href})`;
    });
    // Images
    md = md.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*\/?>(?:<\/img>)?/gi, '![$1]($2)');
    // Lists
    md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, c) => `\n- ${this.stripTags(c).trim()}`)
           .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, c) => `\n${c}\n`)
           .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, c) => {
             // Convert list items inside ordered list to numbered
             const items = c.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m2: unknown, c2: string) => `\n1. ${this.stripTags(c2).trim()}`);
             return `\n${items}\n`;
           });
    // Blockquotes & pre
    md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, c) => `\n> ${this.stripTags(c).trim()}\n`)
           .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, c) => `\n\n\`\`\`\n${this.stripTags(c)}\n\`\`\`\n\n`);
    // Remove remaining tags
    md = this.stripTags(md);
    // Cleanup whitespace
    md = md.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
    return md;
  }

  private stripTags(s: string): string {
    return (s || '').replace(/<[^>]*>/g, '').replace(/\r/g, '').replace(/\t/g, ' ').replace(/\u00A0/g, ' ');
  }

  // Public helpers for routes to reuse markdown conversion/normalization
  public toMarkdownFromHtml(html: string): string {
    return this.normalizeMarkdown(this.htmlToMarkdown(html));
  }

  public normalizeMarkdownString(md: string): string {
    return this.normalizeMarkdown(md);
  }

  /**
   * Extract textual content from a PDF buffer with better spacing (Thai-friendly)
   */
  public async extractPdfText(buffer: Uint8Array, maxPages: number = 20): Promise<{ text: string; pages: number }> {
    const pdfjs: any = await import('pdfjs-dist');
    const getDocument = (pdfjs as any).getDocument;
    if (typeof getDocument !== 'function') throw new Error('pdfjs getDocument not available');
    const task = getDocument({ data: buffer });
    const pdf = await task.promise;
    const numPages = pdf.numPages;
    let full = '';
    const limit = Math.min(numPages, Math.max(1, maxPages));
    for (let i = 1; i <= limit; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      full += `\n\n# Page ${i}\n\n` + this.assembleTextContent(content);
    }
    full = this.fixThaiSpacing(full);
    return { text: full, pages: numPages };
  }

  /**
   * Prefer Poppler pdftotext for Thai PDFs; fallback to pdf.js when unavailable or failing
   */
  public async extractPdfTextPreferPoppler(buffer: Uint8Array, maxPages: number = 20): Promise<{ text: string; pages: number }> {
    // Try Poppler pdftotext if available
    try {
      const out = await this.tryPopplerPdftotext(buffer, maxPages);
      if (out && out.text.trim().length > 0) {
        // We don't know exact total pages from stdout reliably; keep pages as reported or 0
        return { text: this.fixThaiSpacing(out.text), pages: out.pages || 0 };
      }
    } catch {
      // ignore and fallback
    }
    // Fallback to pdf.js
    return await this.extractPdfText(buffer, maxPages);
  }

  private async tryPopplerPdftotext(buffer: Uint8Array, maxPages: number): Promise<{ text: string; pages?: number } | null> {
    // Check availability
    try {
      await new Promise<void>((resolve, reject) => {
        execFile('pdftotext', ['-v'], (err) => (err ? reject(err) : resolve()));
      });
    } catch {
      return null;
    }
    // Write to temp file
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rag-pdf-'));
    const file = path.join(dir, 'doc.pdf');
    try {
      await fs.writeFile(file, buffer);
      const args = ['-enc', 'UTF-8', '-layout', '-q', '-f', '1', '-l', String(Math.max(1, maxPages)), file, '-'];
      const stdout: string = await new Promise((resolve, reject) => {
        execFile('pdftotext', args, { maxBuffer: 1024 * 1024 * 50 }, (err, out) => {
          if (err) return reject(err);
          resolve(out.toString());
        });
      });
      return { text: stdout };
    } finally {
      // Cleanup
      try { await fs.unlink(file); } catch {}
      try { await fs.rm(dir, { recursive: true, force: true } as any); } catch {}
    }
  }

  /**
   * Assemble pdf.js TextContent into readable lines, inserting spaces by glyph gaps only
   */
  private assembleTextContent(content: any): string {
    const items: any[] = Array.isArray(content?.items) ? content.items : [];
    if (items.length === 0) return '';
    // Map to simplified glyphs with positions
    const glyphs = items.map((it: any) => {
      const t = it.transform || it?.matrix || [1, 0, 0, 1, 0, 0];
      const x = t[4] || 0;
      const y = t[5] || 0;
      const width = (it.width || 0);
      const str = (it.str || '').toString();
      return { x, y, width, str };
    });
    // Group by y (line), allow small variance
    const lines: { y: number; items: typeof glyphs }[] = [];
    const yTolerance = 2.0;
    for (const g of glyphs) {
      let line = lines.find(l => Math.abs(l.y - g.y) <= yTolerance);
      if (!line) {
        line = { y: g.y, items: [] };
        lines.push(line);
      }
      line.items.push(g);
    }
    // Sort lines by descending y (top to bottom), items by x (left to right)
    lines.sort((a, b) => b.y - a.y);
    const parts: string[] = [];
    for (const line of lines) {
      line.items.sort((a, b) => a.x - b.x);
      let lineText = '';
      for (let i = 0; i < line.items.length; i++) {
        const cur = line.items[i];
        if (i === 0) {
          lineText += cur.str;
          continue;
        }
        const prev = line.items[i - 1];
        const gap = cur.x - (prev.x + prev.width);
        // Add a space only if there is a visible gap
        if (gap > 1.0) {
          // Avoid inserting spaces before Thai combining marks
          if (!/^[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(cur.str)) {
            lineText += ' ';
          }
        }
        lineText += cur.str;
      }
      parts.push(lineText.trim());
    }
    return parts.join('\n');
  }

  /**
   * Thai-specific cleanup: remove spaces before combining marks, normalize
   */
  private fixThaiSpacing(s: string): string {
    if (!s) return s;
    let out = s;
    // Remove spaces before Thai combining marks
    out = out.replace(/\s+([\u0E31\u0E34-\u0E3A\u0E47-\u0E4E])/g, '$1');
    // Remove spaces between base char and combining marks
    out = out.replace(/([\u0E00-\u0E2E\u0E2F-\u0E5B])\s+([\u0E31\u0E34-\u0E3A\u0E47-\u0E4E])/g, '$1$2');
    // Normalize Unicode form
    try { out = out.normalize('NFC'); } catch {}
    return out;
  }

  /**
   * Get file type from filename
   */
  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'pdf': 'PDF Document',
      'doc': 'Word Document',
      'docx': 'Word Document',
      'txt': 'Text File',
      'md': 'Markdown',
      'html': 'HTML Document',
      'htm': 'HTML Document'
    };
    return typeMap[ext || ''] || 'Unknown';
  }

  /**
   * Generate realistic mock place data for demo purposes
   */
  private generateMockPlaceData(placeInfo: any, url: string): any {
    const baseData = {
      title: placeInfo.name || "Central World Bangkok",
      address: placeInfo.address || "999/9 Rama I Rd, Pathum Wan, Bangkok 10330, Thailand",
      lat: placeInfo.lat || 13.7472,
      lng: placeInfo.lng || 100.5398,
      phone: "+66 2 635 1111",
      website: "https://www.centralworld.co.th",
      category: "Shopping Mall",
      rating: 4.2,
      price_range: "$$",
      hours: {
        "mon": "10:00-22:00",
        "tue": "10:00-22:00", 
        "wed": "10:00-22:00",
        "thu": "10:00-22:00",
        "fri": "10:00-22:00",
        "sat": "10:00-22:00",
        "sun": "10:00-22:00"
      },
      images: [
        "https://example.com/images/central-world-1.jpg",
        "https://example.com/images/central-world-2.jpg",
        "https://example.com/images/central-world-3.jpg"
      ]
    };

    // Generate different data based on coordinates or name hints
    if (placeInfo.lat && placeInfo.lng) {
      // Bangkok area
      if (placeInfo.lat > 13.7 && placeInfo.lat < 13.8 && placeInfo.lng > 100.4 && placeInfo.lng < 100.6) {
        baseData.title = "Bangkok Location";
        baseData.address = `${placeInfo.lat.toFixed(4)}, ${placeInfo.lng.toFixed(4)} Bangkok, Thailand`;
      }
    }

    if (placeInfo.name) {
      baseData.title = placeInfo.name;
    }

    (baseData as any).body = `${baseData.title} is a popular destination in Bangkok. Located at ${baseData.address}, this location offers various amenities and services. The place is open daily with convenient operating hours.`;

    return baseData;
  }

  /**
   * OCR a ticket image using OpenAI vision model and return structured fields
   */
  async importFromTicketImage(imageDataUrl: string, openaiApiKey?: string, model: string = 'gpt-4o-mini'): Promise<ImportedData> {
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    try {
      const prompt = `You are an OCR and information extraction assistant for event tickets.
Extract the following JSON fields from the ticket image as accurately as possible.
Return ONLY valid JSON, no explanations.
Fields:
{
  "title": string,                      // concise event name
  "body_markdown": string,              // brief markdown with key details
  "attributes": {
    "event_time": string,               // ISO 8601 if possible; else raw text
    "location": string,
    "price": number|null,
    "currency": string|null,            // e.g. THB, USD
    "status": string|null,              // on_sale | sold_out | canceled | past, if discernible
    "ticket_type": string|null,         // e_ticket | paper, if discernible
    "zone": string|null,
    "seat": string|null,
    "total_tickets": number|null,
    "available_tickets": number|null,
    "booking_url": string|null,
    "other_details": string|null,
    "remark": string|null
  }
}`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          messages: [
            { role: 'system', content: 'You are a precise OCR and information extraction assistant.' },
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageDataUrl } }
              ] as any
            }
          ]
        })
      });
      if (!res.ok) { throw new Error(`OpenAI HTTP ${res.status}`); }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      // Try to parse JSON from the response
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      const jsonStr = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;
      let parsed: any = {};
      try { parsed = JSON.parse(jsonStr); } catch { parsed = {}; }

      const title = (parsed.title || 'Event Ticket').toString();
      const bodyMarkdown = this.normalizeMarkdown((parsed.body_markdown || '').toString());
      const attrs = typeof parsed.attributes === 'object' && parsed.attributes ? parsed.attributes : {};

      return {
        title,
        body: bodyMarkdown || `Ticket details extracted for ${title}`,
        attributes: {
          // pass through extracted attributes and keep image source for reference
          ...attrs,
          ocr_provider: 'openai',
          ocr_model: model,
          ocr_extracted_at: new Date().toISOString(),
          ticket_image_preview: imageDataUrl.startsWith('data:') ? imageDataUrl.slice(0, 64) + '...' : undefined,
        }
      };
    } catch (error) {
      const msg = (error as any)?.message || String(error);
      // telemetry disabled
      throw new Error(`Failed to OCR ticket: ${msg}`);
    }
  }
}

export const importService = new ImportService();
