import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type Node = {
  name: string;
  path: string;
  type: 'page' | 'dir';
  title?: string;
  description?: string;
  keywords?: string[];
  examples?: string[];
  priority?: number;
  children?: Node[];
};

function readMeta(metaFilePath: string): Partial<Node> {
  try {
    if (fs.existsSync(metaFilePath)) {
      const raw = fs.readFileSync(metaFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      const nodeMeta: Partial<Node> = {};
      if (typeof parsed.title === 'string') nodeMeta.title = parsed.title;
      if (typeof parsed.description === 'string') nodeMeta.description = parsed.description;
      if (Array.isArray(parsed.keywords)) nodeMeta.keywords = parsed.keywords.filter((k: any) => typeof k === 'string');
      if (Array.isArray(parsed.examples)) nodeMeta.examples = parsed.examples.filter((k: any) => typeof k === 'string');
      if (typeof parsed.priority === 'number') nodeMeta.priority = parsed.priority;
      return nodeMeta;
    }
  } catch {}
  return {};
}

function buildSitemap(dir: string, baseUrlPath: string, depth: number, maxDepth: number, rootMeta: Partial<Record<string, any>>): Node[] {
  if (depth > maxDepth) return [];
  const nodes: Node[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const hasPage = entries.some(e => e.isFile() && e.name === 'page.tsx');
  if (hasPage && depth > 0) {
    const slug = path.basename(dir);
    const metaPath = path.join(dir, 'meta.json');
    const localMeta = readMeta(metaPath);
    const globalMeta = (rootMeta && typeof rootMeta[slug] === 'object') ? rootMeta[slug] : {};
    const title = (localMeta.title || globalMeta.title || slug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '));
    nodes.push({
      name: slug,
      path: baseUrlPath,
      type: 'page',
      title,
      description: localMeta.description || globalMeta.description,
      keywords: localMeta.keywords || globalMeta.keywords,
      examples: localMeta.examples || globalMeta.examples,
      priority: typeof (localMeta as any).priority === 'number' ? (localMeta as any).priority : (typeof (globalMeta as any)?.priority === 'number' ? (globalMeta as any).priority : undefined)
    });
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const childDir = path.join(dir, entry.name);
      const childUrl = path.join(baseUrlPath, entry.name).replace(/\\/g, '/');
      const childNodes = buildSitemap(childDir, childUrl, depth + 1, maxDepth, rootMeta);
      if (childNodes.length > 0 || fs.existsSync(path.join(childDir, 'page.tsx'))) {
        const metaPath = path.join(childDir, 'meta.json');
        const localMeta = readMeta(metaPath);
        const globalMeta = (rootMeta && typeof rootMeta[entry.name] === 'object') ? rootMeta[entry.name] : {};
        const title = (localMeta.title || globalMeta.title);
        nodes.push({ name: entry.name, path: childUrl, type: 'dir', title, description: localMeta.description || globalMeta.description, keywords: localMeta.keywords || globalMeta.keywords, examples: localMeta.examples || globalMeta.examples, priority: typeof (localMeta as any).priority === 'number' ? (localMeta as any).priority : (typeof (globalMeta as any)?.priority === 'number' ? (globalMeta as any).priority : undefined), children: childNodes });
      }
    }
  }
  return nodes;
}

export async function GET() {
  try {
    const appRoot = process.cwd();
    const travelDir = path.join(appRoot, 'apps', 'travel-ai-bot', 'src', 'app', 'travel');
    // Optional global metadata file to describe pages: apps/travel-ai-bot/src/app/travel/meta.json
    const rootMetaPath = path.join(travelDir, 'meta.json');
    let rootMeta: any = {};
    try { if (fs.existsSync(rootMetaPath)) rootMeta = JSON.parse(fs.readFileSync(rootMetaPath, 'utf8')); } catch {}
    const rootHasPage = fs.existsSync(path.join(travelDir, 'page.tsx'));
    const children = buildSitemap(travelDir, '/travel', 0, 3, rootMeta || {});
    const sitemap = {
      root: { name: 'travel', path: '/travel', type: rootHasPage ? 'page' : 'dir' as const, title: 'Travel', children }
    };
    return NextResponse.json(sitemap);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to generate sitemap' }, { status: 500 });
  }
}


