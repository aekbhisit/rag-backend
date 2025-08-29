// Local mock dataset and helpers to simulate RAG responses without external calls

export type MockContext = {
  id: string;
  title: string;
  description?: string;
  type: 'place' | 'policy' | 'info';
  category?: string;
  address?: string;
  lat?: number;
  long?: number;
  tags?: string[];
};

const MOCK_CONTEXTS: MockContext[] = [
  {
    id: 'ctx-1',
    title: 'Seaside Cafe',
    description: 'Coffee, brunch, and sea view',
    type: 'place',
    category: 'food',
    address: 'Beach Road 12',
    lat: 13.746,
    long: 100.532,
    tags: ['coffee', 'breakfast']
  },
  {
    id: 'ctx-2',
    title: 'Night Market',
    description: 'Street food and souvenirs',
    type: 'place',
    category: 'market',
    address: 'Central Ave',
    lat: 13.752,
    long: 100.504,
    tags: ['shopping', 'street-food']
  },
  {
    id: 'ctx-3',
    title: 'Resort Pool Policy',
    description: 'Opening hours and safety rules',
    type: 'policy',
    category: 'facility',
    tags: ['pool', 'rules']
  },
  {
    id: 'ctx-4',
    title: 'Old City Temple',
    description: 'Historic temple and museum',
    type: 'place',
    category: 'attraction',
    address: 'Old City',
    lat: 13.756,
    long: 100.501,
    tags: ['culture', 'temple']
  },
  {
    id: 'ctx-5',
    title: 'Island Snorkeling Tour',
    description: 'Half-day boat tour with snorkeling',
    type: 'info',
    category: 'tour',
    tags: ['tour', 'snorkeling']
  }
];

function matchesQuery(item: MockContext, q?: string) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    item.title.toLowerCase().includes(s) ||
    (item.description || '').toLowerCase().includes(s) ||
    (item.tags || []).some(t => t.toLowerCase().includes(s))
  );
}

function matchesEq(val?: string, expected?: string) {
  if (!expected) return true;
  return (val || '').toLowerCase() === expected.toLowerCase();
}

export function mockGetContexts(params: Record<string, any>) {
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const page_size = Math.min(50, Math.max(1, parseInt(params.page_size ?? '10', 10) || 10));
  const q = params.q as string | undefined;
  const type = params.type as string | undefined;
  const category = params.category as string | undefined;

  const filtered = MOCK_CONTEXTS.filter(item =>
    matchesQuery(item, q) && matchesEq(item.type, type) && matchesEq(item.category, category)
  );
  const total = filtered.length;
  const start = (page - 1) * page_size;
  const items = filtered.slice(start, start + page_size);
  return { items, total, page, page_size };
}

export function mockGetContextById(id: string) {
  const item = MOCK_CONTEXTS.find(x => x.id === id);
  if (!item) throw new Error('Not found');
  return item;
}

export function mockRagSummary(body: any) {
  const top_k = Math.max(1, Math.min(10, parseInt(body?.top_k ?? 3, 10) || 3));
  const q = body?.text_query as string | undefined;
  const items = MOCK_CONTEXTS.filter(i => matchesQuery(i, q)).slice(0, top_k);
  return {
    summary: q ? `Summary for: ${q}` : 'No query provided.',
    items,
  };
}

export function mockRagContexts(body: any) {
  return mockGetContexts({
    q: body?.text_query,
    type: body?.type,
    category: body?.category,
    page: body?.page ?? 1,
    page_size: body?.page_size ?? (body?.top_k ?? 10),
  });
}

export function mockRagPlace(body: any) {
  // For simplicity, ignore geo distance and return filtered places
  const q = body?.text_query as string | undefined;
  const items = MOCK_CONTEXTS.filter(i => i.type === 'place' && matchesQuery(i, q)).map((i, idx) => ({
    ...i,
    distance_km: 0.5 + idx * 0.7,
  }));
  return { items, total: items.length };
}


