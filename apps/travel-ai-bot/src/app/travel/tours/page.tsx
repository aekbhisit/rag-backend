"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { useActionContext, ActionType } from "@/botActionFramework";
import { ActionProvider } from "@/botActionFramework/ActionContext";
import { EventProvider } from "@/app/contexts/EventContext";

function ToursPageContent(props: { embedded?: boolean }) {
  const embedded = !!props?.embedded;
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [items, setItems] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  
  type Tour = {
    id: string;
    title: string;
    price: string;
    duration: string;
    highlights: string[];
    gallery: string[];
    description?: string;
    itinerary?: string[];
    inclusions?: string[];
    exclusions?: string[];
  };
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const actionContext = useActionContext();

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!isResizing) return; setChatWidth(Math.max(320, Math.min(720, window.innerWidth - e.clientX))); };
    const onUp = () => setIsResizing(false);
    if (isResizing) { document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isResizing]);

  // Register content extractor and a minimal SELECT_ITEM for backward compatibility
  useEffect(() => {
    const handlerId = 'tours-select-item';
    const extractorId = 'tours-extract-content';
    // EXTRACT_CONTENT: returns visible tours (grid or selected detail)
    actionContext.registerAction(
      ActionType.EXTRACT_CONTENT,
      extractorId,
      async (payload: any) => {
        try {
          const detail = !!payload?.detail;
          const max = typeof payload?.limit === 'number' ? payload.limit : 10;
          if (selectedTour) {
            // Return currently opened tour detail
            return {
              success: true,
              scope: 'tours:detail',
              data: {
                id: selectedTour.id,
                title: selectedTour.title,
                price: selectedTour.price,
                duration: selectedTour.duration,
                highlights: selectedTour.highlights,
              }
            };
          }
          const rows = (items || []).slice(0, max).map((x: any) => {
            const t = x.attributes?.tour || {};
            return {
              id: String(x.id),
              title: x.title,
              priceFrom: (t.currency || 'THB') + ' ' + (t.price_from != null ? new Intl.NumberFormat().format(Number(t.price_from)) : ''),
              duration: t.duration || (currentLanguage==='th'?'ครึ่งวัน':'Half-day'),
              highlights: detail && Array.isArray(t.highlights) ? t.highlights.slice(0, 5) : undefined
            };
          });
          return { success: true, scope: 'tours:list', data: rows };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to extract tours' };
        }
      }
    );
    actionContext.registerAction(
      ActionType.SELECT_ITEM,
      handlerId,
      async (payload: any) => {
        try {
          if (payload?.itemType !== 'tour') return { success: false, error: 'Unsupported itemType' };
          let target: any | null = null;
          // Resolve target by id
          if (payload.itemId) {
            target = (items || []).find((x: any) => String(x.id) === String(payload.itemId));
          }
          // Resolve by index (1-based) or selector keywords
          if (!target) {
            const list = items || [];
            const pos: number | null = typeof payload.index === 'number' ? Math.max(1, Math.floor(payload.index))
              : (typeof payload.position === 'string' && payload.position.toLowerCase() === 'first') ? 1
              : (typeof payload.selector === 'string' && payload.selector.toLowerCase() === 'first') ? 1
              : null;
            if (pos && list.length >= pos) {
              target = list[pos - 1];
            }
          }
          if (!target) return { success: false, error: 'Tour not found' };

          const t = target.attributes?.tour || {};
          const price = (t.currency || 'THB') + ' ' + (t.price_from != null ? new Intl.NumberFormat().format(Number(t.price_from)) : '');
          const duration = t.duration || (currentLanguage==='th'?'ครึ่งวัน':'Half-day');
          const highlights: string[] = Array.isArray(t.highlights) ? t.highlights : [];
          const selected = { id: String(target.id), title: target.title, price, duration, highlights, gallery: [] };
          setSelectedTour(selected);
          // If embedded, also update ?content=/travel/tours/{id} so the parent router renders detail consistently
          if (embedded && typeof window !== 'undefined') {
            try {
              const route = `/travel/tours/${encodeURIComponent(String(selected.id))}`;
              const url = new URL(window.location.href);
              const params = new URLSearchParams(url.search);
              params.delete('content');
              const query = params.toString();
              const next = `${url.origin}${url.pathname}${query ? `?${query}&` : '?'}content=${route}${url.hash || ''}`;
              window.history.pushState({}, '', next);
              window.dispatchEvent(new PopStateEvent('popstate'));
            } catch {}
          }
          return { success: true, message: 'Tour opened', data: { id: target.id, title: target.title } };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to select tour' };
        }
      }
    );
    return () => {
      actionContext.unregisterAction(ActionType.SELECT_ITEM, handlerId);
      actionContext.unregisterAction(ActionType.EXTRACT_CONTENT, extractorId);
    };
  }, [actionContext, items, currentLanguage, selectedTour]);

  useEffect(() => {
    const ensureAndLoad = async () => {
      try {
        setLoading(true);
        setError("");
        // Ensure 'tours' category exists
        const resCats = await fetch('/api/categories', { headers: { 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any });
        const dataCats = await resCats.json();
        const allCats = Array.isArray(dataCats?.items) ? dataCats.items : [];
        let tours = allCats.find((c: any) => (c.slug || '').toLowerCase() === 'tours');
        if (!tours) {
          const cRes = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any,
            body: JSON.stringify({ name: 'Tours', slug: 'tours' })
          });
          if (cRes.ok) tours = await cRes.json();
        }
        if (!tours?.id) throw new Error('Missing tours category');

        // Load existing tour places
        const res = await fetch('/api/contexts?type=place&category=tours&page_size=100', { headers: { 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any });
        const payload = await res.json();
        let ctxItems: any[] = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);

        // Seed defaults if needed
        const tenantId = (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '';
        const seedKey = `seed:tours:${tenantId || 'default'}`;
        const alreadySeeded = typeof window !== 'undefined' ? window.localStorage.getItem(seedKey) === '1' : false;
        const existingSlugs = new Set(ctxItems.map((x: any) => String(x?.attributes?.slug || '').toLowerCase()).filter(Boolean));
        const defaults = [
          {
            slug: 'city-highlights',
            title: currentLanguage==='th' ? 'ทัวร์ไฮไลท์รอบเมือง' : 'City Highlights Tour',
            price_from: 1200,
            currency: 'THB',
            duration: currentLanguage==='th' ? 'ครึ่งวัน' : 'Half-day',
            highlights: currentLanguage==='th' ? ['วัดสำคัญ','ตลาดท้องถิ่น','ล่องเรือสั้นๆ'] : ['Major temples','Local market','Short boat ride']
          },
          {
            slug: 'floating-market',
            title: currentLanguage==='th' ? 'ทัวร์ตลาดน้ำ' : 'Floating Market Tour',
            price_from: 1500,
            currency: 'THB',
            duration: currentLanguage==='th' ? 'ครึ่งวัน' : 'Half-day',
            highlights: currentLanguage==='th' ? ['ชิมอาหารพื้นเมือง','นั่งเรือชมคลอง'] : ['Taste local food','Canal boat ride']
          },
          {
            slug: 'temple-sunset',
            title: currentLanguage==='th' ? 'ทัวร์วัดยามพระอาทิตย์ตก' : 'Temple Sunset Tour',
            price_from: 1800,
            currency: 'THB',
            duration: currentLanguage==='th' ? 'ครึ่งวันบ่าย' : 'Afternoon half-day',
            highlights: currentLanguage==='th' ? ['วิวพระอาทิตย์ตก','จุดถ่ายรูปสวยๆ'] : ['Sunset viewpoint','Great photo spots']
          }
        ];

        const toCreate = defaults.filter(d => !existingSlugs.has(d.slug.toLowerCase()));
        if (!alreadySeeded && toCreate.length > 0) {
          for (const d of toCreate) {
            const payload = {
              type: 'place',
              title: d.title,
              body: `${d.title} — ${currentLanguage==='th'?'รายละเอียดทัวร์':'Tour details'}`,
              instruction: currentLanguage==='th' ? 'ใช้รายละเอียดจาก attributes เพื่อแสดงผลทัวร์' : 'Use attributes to present tour info.',
              trust_level: 3,
              status: 'active',
              keywords: ['tour','tours','package'],
              categories: [tours.id],
              attributes: {
                slug: d.slug,
                tour: {
                  price_from: d.price_from,
                  currency: d.currency,
                  duration: d.duration,
                  highlights: d.highlights,
                },
                tags: ['tours']
              }
            };
            await fetch('/api/admin/contexts/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any,
              body: JSON.stringify(payload)
            });
          }
          try { if (typeof window !== 'undefined') window.localStorage.setItem(seedKey, '1'); } catch {}
        }

        // If we created new items, we need to refetch to get the updated list
        if (!alreadySeeded && toCreate.length > 0) {
          const res2 = await fetch('/api/contexts?type=place&category=tours&page_size=100', { headers: { 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any });
          const p2 = await res2.json();
          ctxItems = Array.isArray(p2?.items) ? p2.items : (Array.isArray(p2) ? p2 : []);
        }

        // Use the items (either original or updated after seeding)
        setItems(ctxItems.map((x: any) => ({ id: x.id, title: x.title, attributes: x.attributes })));
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    };
    ensureAndLoad();
  }, [currentLanguage]);

  if (embedded) {
    return (
      <div className="bg-white">
        <div className="px-6 py-2 border-b border-stone-200 bg-white">
          <nav className="ta-breadcrumb" aria-label="Breadcrumb">
            <ol className="flex items-center text-sm text-orange-900">
              <li>
                <Link href="/travel" className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-orange-900 hover:bg-orange-50 hover:text-orange-900 border border-transparent hover:border-orange-200">{currentLanguage==='th'?'การท่องเที่ยว':'Travel'}</Link>
              </li>
              <li className="px-2 text-amber-600">/</li>
              <li aria-current="page" className="font-medium">{currentLanguage==='th'?'ทัวร์':'Tours'}</li>
            </ol>
          </nav>
        </div>
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'ทัวร์ & แพคเกจ':'Tours & Packages'}</h2>
          <p className="text-sm text-stone-600">{currentLanguage==='th'?'เรียกดูทัวร์พร้อมราคาและไฮไลท์':'Browse tours with price, duration and highlights'}</p>
        </div>
        <div id="ta-tours-grid" className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading && <div className="text-sm text-stone-600">{currentLanguage==='th'?'กำลังโหลด...':'Loading...'}</div>}
          {error && <div className="text-sm text-red-700">{error}</div>}
          {!loading && !error && items.map((x) => {
            const t = x.attributes?.tour || {};
            const price = (t.currency || 'THB') + ' ' + (t.price_from != null ? new Intl.NumberFormat().format(Number(t.price_from)) : '');
            const duration = t.duration || (currentLanguage==='th'?'ครึ่งวัน':'Half-day');
            const highlights: string[] = Array.isArray(t.highlights) ? t.highlights : [];
            return (
              <div key={x.id} id="ta-tour-card" className="border border-stone-200 rounded-lg bg-white overflow-hidden">
                <Link href={`?content=/travel/tours/${encodeURIComponent(String(x.id))}`} className="relative block h-40 bg-stone-100" id="ta-tour-gallery">
                  <span className="absolute top-2 right-2 px-2 py-1 rounded bg-orange-700 text-white text-xs">{price}</span>
                  <span className="absolute bottom-2 left-2 px-2 py-1 rounded bg-white/90 text-stone-900 text-xs">{duration}</span>
                </Link>
                <div className="p-4 text-sm">
                  <Link href={`?content=/travel/tours/${encodeURIComponent(String(x.id))}`} id="ta-tour-title" className="text-base font-semibold text-stone-900 hover:underline">{x.title}</Link>
                  {highlights.length ? (
                    <ul id="ta-tour-highlights" className="mt-2 list-disc pl-5 text-stone-700">
                      {highlights.slice(0, 3).map((h, idx) => (<li key={idx}>{h}</li>))}
                    </ul>
                  ) : null}
                  <div id="ta-tour-cta" className="mt-3 flex gap-2">
                    <Link href={`?content=/travel/tours/${encodeURIComponent(String(x.id))}`} className="px-3 py-1.5 rounded bg-gradient-to-r from-orange-700 to-red-800 text-white hover:from-orange-800 hover:to-red-900 text-center">{currentLanguage==='th'?'ดูรายละเอียด':'View details'}</Link>
                    <button className="px-3 py-1.5 rounded border border-orange-300 text-orange-900 hover:border-orange-500">{currentLanguage==='th'?'ติดต่อ':'Contact'}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">🗺️ Travel Discovery</h1>
          <div className="flex items-center gap-2">
            <button onClick={()=>setCurrentLanguage('en')} className={`px-3 py-2 rounded-md border text-sm ${currentLanguage==='en'?'bg-gradient-to-r from-orange-700 to-red-800 text-white border-orange-600':'bg-white text-orange-900 border-orange-300 hover:border-orange-500'}`}>🇺🇸 EN</button>
            <button onClick={()=>setCurrentLanguage('th')} className={`px-3 py-2 rounded-md border text-sm ${currentLanguage==='th'?'bg-gradient-to-r from-orange-700 to-red-800 text-white border-orange-600':'bg-white text-orange-900 border-orange-300 hover:border-orange-500'}`}>🇹🇭 TH</button>
          </div>
        </div>
      </div>

      <div className="flex" style={{height:'calc(100vh - 80px)'}}>
        <section id="ta-tours-panel" className="flex-1 bg-white flex flex-col min-h-0" style={{ width: `calc(100% - ${chatWidth}px)` }}>
          <div className="px-6 py-2 border-b border-stone-200 bg-white">
            <nav className="ta-breadcrumb" aria-label="Breadcrumb">
              <ol className="flex items-center text-sm text-orange-900">
                <li>
                  <Link href="/travel" className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-orange-900 hover:bg-orange-50 hover:text-orange-900 border border-transparent hover:border-orange-200">{currentLanguage==='th'?'การท่องเที่ยว':'Travel'}</Link>
                </li>
                <li className="px-2 text-amber-600">/</li>
                <li aria-current="page" className="font-medium">{currentLanguage==='th'?'ทัวร์':'Tours'}</li>
              </ol>
            </nav>
          </div>

          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'ทัวร์ & แพคเกจ':'Tours & Packages'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'เรียกดูทัวร์พร้อมราคาและไฮไลท์':'Browse tours with price, duration and highlights'}</p>
          </div>

          {/* Filters */}
          <div id="ta-tours-filters" className="px-6 py-4 border-b border-stone-200 bg-white grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
            {/* Category */}
            <div className="relative w-full h-12 rounded-lg border border-stone-300 bg-white focus-within:ring-2 focus-within:ring-orange-600 focus-within:border-orange-600 hover:bg-orange-50">
              <span className="absolute top-0.5 left-3 px-1 text-[10px] font-medium text-stone-600 bg-white">{currentLanguage==='th'?'หมวดหมู่':'Category'}</span>
              <select className="absolute inset-0 w-full h-full appearance-none bg-transparent px-3 pr-10 pt-4 text-sm text-stone-900">
                <option className="bg-white text-stone-900">{currentLanguage==='th'?'ทุกหมวดหมู่':'All categories'}</option>
                <option className="bg-white text-stone-900">City</option>
                <option className="bg-white text-stone-900">Nature</option>
                <option className="bg-white text-stone-900">Food</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {/* Price */}
            <div className="relative w-full h-12 rounded-lg border border-stone-300 bg-white focus-within:ring-2 focus-within:ring-orange-600 focus-within:border-orange-600 hover:bg-orange-50">
              <span className="absolute top-0.5 left-3 px-1 text-[10px] font-medium text-stone-600 bg-white">{currentLanguage==='th'?'ราคา':'Price'}</span>
              <select className="absolute inset-0 w-full h-full appearance-none bg-transparent px-3 pr-10 pt-4 text-sm text-stone-900">
                <option className="bg-white text-stone-900">{currentLanguage==='th'?'ทุกช่วงราคา':'All prices'}</option>
                <option className="bg-white text-stone-900">$</option>
                <option className="bg-white text-stone-900">$$</option>
                <option className="bg-white text-stone-900">$$$</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {/* Duration */}
            <div className="relative w-full h-12 rounded-lg border border-stone-300 bg-white focus-within:ring-2 focus-within:ring-orange-600 focus-within:border-orange-600 hover:bg-orange-50">
              <span className="absolute top-0.5 left-3 px-1 text-[10px] font-medium text-stone-600 bg-white">{currentLanguage==='th'?'ระยะเวลา':'Duration'}</span>
              <select className="absolute inset-0 w-full h-full appearance-none bg-transparent px-3 pr-10 pt-4 text-sm text-stone-900">
                <option className="bg-white text-stone-900">{currentLanguage==='th'?'ทุกระยะเวลา':'All durations'}</option>
                <option className="bg-white text-stone-900">Half-day</option>
                <option className="bg-white text-stone-900">Full-day</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {/* Search */}
            <input className="h-12 px-3 rounded-lg border border-stone-300 bg-white text-stone-900 placeholder-stone-500" placeholder={currentLanguage==='th'?'ค้นหา':'Search'} />
          </div>

          {/* Results / Detail Switch */}
          {selectedTour ? (
            <div id="ta-tour-detail" className="flex-1 min-h-0 overflow-y-auto p-6">
              {/* Header with back and pricing */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-stone-900 truncate">{selectedTour.title}</h2>
                <button onClick={() => setSelectedTour(null)} className="h-9 px-3 rounded-md border border-orange-300 bg-white text-orange-900 hover:border-orange-500 text-sm">{currentLanguage==='th'?'ย้อนกลับ':'Back'}</button>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: gallery and description */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="relative w-full h-64 md:h-80 bg-stone-100 rounded-lg border border-stone-200 overflow-hidden">
                    {/* gallery placeholder */}
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-orange-700 text-white text-sm">{selectedTour.price}</span>
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/95 text-stone-900 text-sm ring-1 ring-stone-200">{selectedTour.duration}</span>
                  </div>

                  {selectedTour.highlights?.length ? (
                    <div className="border border-stone-200 rounded-lg bg-white p-4">
                      <div className="text-stone-900 font-semibold mb-2">{currentLanguage==='th'?'ไฮไลท์':'Highlights'}</div>
                      <ul className="list-disc pl-5 text-stone-800 text-sm space-y-1">
                        {selectedTour.highlights.map((h, idx) => (<li key={idx}>{h}</li>))}
                      </ul>
                    </div>
                  ) : null}

                  {selectedTour.itinerary?.length ? (
                    <div className="border border-stone-200 rounded-lg bg-white p-4">
                      <div className="text-stone-900 font-semibold mb-2">{currentLanguage==='th'?'กำหนดการ':'Itinerary'}</div>
                      <ol className="list-decimal pl-5 text-stone-800 text-sm space-y-1">
                        {selectedTour.itinerary.map((s, idx) => (<li key={idx}>{s}</li>))}
                      </ol>
                    </div>
                  ) : null}
                </div>

                {/* Right: booking summary card */}
                <aside className="space-y-4">
                  <div className="border border-stone-200 rounded-lg bg-white p-4">
                    <div className="text-stone-900 font-semibold">{currentLanguage==='th'?'สรุปแพ็กเกจ':'Package Summary'}</div>
                    <div className="mt-2 text-stone-800 text-sm">
                      <div className="flex items-center justify-between"><span>{currentLanguage==='th'?'ราคา':'Price'}</span><span className="font-semibold text-orange-900">{selectedTour.price}</span></div>
                      <div className="flex items-center justify-between mt-1"><span>{currentLanguage==='th'?'ระยะเวลา':'Duration'}</span><span className="font-medium">{selectedTour.duration}</span></div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="font-medium text-stone-900">{currentLanguage==='th'?'รวม':'Inclusions'}</div>
                        <ul className="list-disc pl-4 text-stone-700 space-y-0.5">
                          {(selectedTour.inclusions || ['Guide','Transport']).map((s, idx) => (<li key={idx}>{s}</li>))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-stone-900">{currentLanguage==='th'?'ไม่รวม':'Exclusions'}</div>
                        <ul className="list-disc pl-4 text-stone-700 space-y-0.5">
                          {(selectedTour.exclusions || ['Meals','Tips']).map((s, idx) => (<li key={idx}>{s}</li>))}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className="flex-1 h-10 rounded-md bg-gradient-to-r from-orange-700 to-red-800 text-white hover:from-orange-800 hover:to-red-900">{currentLanguage==='th'?'จอง':'Book'}</button>
                      <button className="h-10 px-4 rounded-md border border-orange-300 bg-white text-orange-900 hover:border-orange-500">{currentLanguage==='th'?'ติดต่อ':'Contact'}</button>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          ) : (
            <div id="ta-tours-grid" className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {loading && <div className="text-sm text-stone-600">{currentLanguage==='th'?'กำลังโหลด...':'Loading...'}</div>}
              {error && <div className="text-sm text-red-700">{error}</div>}
              {!loading && !error && items.map((x) => {
                const t = x.attributes?.tour || {};
                const price = (t.currency || 'THB') + ' ' + (t.price_from != null ? new Intl.NumberFormat().format(Number(t.price_from)) : '');
                const duration = t.duration || (currentLanguage==='th'?'ครึ่งวัน':'Half-day');
                const highlights: string[] = Array.isArray(t.highlights) ? t.highlights : [];
                return (
                  <div key={x.id} id="ta-tour-card" className="border border-stone-200 rounded-lg bg-white overflow-hidden cursor-pointer hover:border-orange-300 hover:shadow" onClick={() => setSelectedTour({
                    id: String(x.id),
                    title: x.title,
                    price,
                    duration,
                    highlights,
                    gallery: []
                  })}>
                    <div className="relative h-40 bg-stone-100" id="ta-tour-gallery">
                      <span className="absolute top-2 right-2 px-2 py-1 rounded bg-orange-700 text-white text-xs">{price}</span>
                      <span className="absolute bottom-2 left-2 px-2 py-1 rounded bg-white/90 text-stone-900 text-xs">{duration}</span>
                    </div>
                    <div className="p-4 text-sm">
                      <div id="ta-tour-title" className="text-base font-semibold text-stone-900">{x.title}</div>
                      {highlights.length ? (
                        <ul id="ta-tour-highlights" className="mt-2 list-disc pl-5 text-stone-700">
                          {highlights.slice(0, 3).map((h, idx) => (<li key={idx}>{h}</li>))}
                        </ul>
                      ) : null}
                      <div id="ta-tour-cta" className="mt-3 flex gap-2">
                        <Link href={`/travel/tours/${encodeURIComponent(String(x.id))}`} className="px-3 py-1.5 rounded bg-gradient-to-r from-orange-700 to-red-800 text-white hover:from-orange-800 hover:to-red-900 text-center">{currentLanguage==='th'?'ดูรายละเอียด':'View details'}</Link>
                        <button className="px-3 py-1.5 rounded border border-orange-300 text-orange-900 hover:border-orange-500" onClick={(e)=> e.stopPropagation()}>{currentLanguage==='th'?'ติดต่อ':'Contact'}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="w-1 bg-stone-300 hover:bg-orange-400 cursor-col-resize" onMouseDown={() => setIsResizing(true)} />

        <aside className="bg-white border-l border-stone-200" style={{ width: `${chatWidth}px` }}>
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <EventProvider>
                <ChatInterface sessionId={`sess_${Date.now()}`} activeChannel={"normal"} onChannelSwitch={()=>{}} isProcessing={false} />
              </EventProvider>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function ToursPage(props: { embedded?: boolean }) {
  // Ensure ActionContext is available even when rendered inside /travel embedded panel
  return (
    <ActionProvider>
      <ToursPageContent embedded={props.embedded} />
    </ActionProvider>
  );
}


