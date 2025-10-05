"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type TourDetailProps = { tourIdOrSlug: string; embedded?: boolean };

type TourContext = {
  id: string;
  title: string;
  body?: string;
  attributes?: any;
};

const isUuidLike = (id: string) => /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(id);

export default function TourDetail({ tourIdOrSlug, embedded = false }: TourDetailProps) {
  const [lang, setLang] = useState<'en'|'th'>('th');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [tour, setTour] = useState<TourContext | null>(null);

  const fetchById = async (id: string) => {
    const res = await fetch(`/services/contexts/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`context ${res.status}`);
    return await res.json();
  };

  const fetchBySlug = async (slug: string) => {
    const res = await fetch(`/services/contexts?type=place&category=tours&page_size=100`);
    if (!res.ok) throw new Error(`contexts ${res.status}`);
    const data = await res.json();
    const items: TourContext[] = Array.isArray(data?.items) ? data.items : [];
    const row = items.find((x: any) => String(x?.attributes?.slug || '').toLowerCase() === slug.toLowerCase());
    if (!row) throw new Error('not_found');
    return row;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError("");
        const idOrSlug = tourIdOrSlug || '';
        const row = isUuidLike(idOrSlug) ? await fetchById(idOrSlug) : await fetchBySlug(idOrSlug);
        setTour(row);
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tourIdOrSlug]);

  const tAttr = useMemo(() => (tour?.attributes?.tour || {}), [tour]);
  const price = useMemo(() => {
    const c = tAttr.currency || 'THB';
    const p = tAttr.price_from != null ? new Intl.NumberFormat().format(Number(tAttr.price_from)) : '';
    return `${c} ${p}`.trim();
  }, [tAttr]);
  const duration = tAttr.duration || (lang === 'th' ? 'ครึ่งวัน' : 'Half-day');
  const highlights: string[] = Array.isArray(tAttr.highlights) ? tAttr.highlights : [];

  return (
    <div className="bg-white">
      {!embedded && (
        <div className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-stone-900">🗺️ Travel Discovery</h1>
            <div className="flex items-center gap-2">
              <button onClick={()=>setLang('en')} className={`px-3 py-2 rounded-md border text-sm ${lang==='en'?'bg-gradient-to-r from-orange-700 to-red-800 text-white border-orange-600':'bg-white text-orange-900 border-orange-300 hover:border-orange-500'}`}>🇺🇸 EN</button>
              <button onClick={()=>setLang('th')} className={`px-3 py-2 rounded-md border text-sm ${lang==='th'?'bg-gradient-to-r from-orange-700 to-red-800 text-white border-orange-600':'bg-white text-orange-900 border-orange-300 hover:border-orange-500'}`}>🇹🇭 TH</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-2 border-b border-stone-200 bg-white">
        <nav className="ta-breadcrumb" aria-label="Breadcrumb">
          <ol className="flex items-center text-sm text-orange-900">
            <li>
              <Link href="/travel" className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-orange-900 hover:bg-orange-50 hover:text-orange-900 border border-transparent hover:border-orange-200">{lang==='th'?'การท่องเที่ยว':'Travel'}</Link>
            </li>
            <li className="px-2 text-amber-600">/</li>
            <li>
              <Link href="/travel/tours" className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-orange-900 hover:bg-orange-50 hover:text-orange-900 border border-transparent hover:border-orange-200">{lang==='th'?'ทัวร์':'Tours'}</Link>
            </li>
            <li className="px-2 text-amber-600">/</li>
            <li aria-current="page" className="font-medium">{tour?.title || (lang==='th'?'กำลังโหลด...':'Loading...')}</li>
          </ol>
        </nav>
      </div>

      <div className="p-6">
        {loading && (<div className="text-sm text-stone-600">{lang==='th'?'กำลังโหลด...':'Loading...'}</div>)}
        {error && (<div className="text-sm text-red-700">{error}</div>)}
        {!loading && !error && tour && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="relative w-full h-64 md:h-80 bg-stone-100 rounded-lg border border-stone-200 overflow-hidden" />
                {highlights.length ? (
                  <div className="border border-stone-200 rounded-lg bg-white p-4">
                    <div className="text-stone-900 font-semibold mb-2">{lang==='th'?'ไฮไลท์':'Highlights'}</div>
                    <ul className="list-disc pl-5 text-stone-800 text-sm space-y-1">
                      {highlights.map((h, idx) => (<li key={idx}>{h}</li>))}
                    </ul>
                  </div>
                ) : null}
                {tour.body && (
                  <div className="border border-stone-200 rounded-lg bg-white p-4">
                    <div className="text-stone-900 font-semibold mb-2">{lang==='th'?'รายละเอียด':'Description'}</div>
                    <p className="text-stone-800 text-sm whitespace-pre-wrap">{tour.body}</p>
                  </div>
                )}
              </div>
              <aside className="space-y-4">
                <div className="border border-stone-200 rounded-lg bg-white p-4">
                  <div className="text-stone-900 font-semibold">{lang==='th'?'สรุปแพ็กเกจ':'Package Summary'}</div>
                  <div className="mt-2 text-stone-800 text-sm">
                    <div className="flex items-center justify-between"><span>{lang==='th'?'ราคาเริ่มต้น':'Price from'}</span><span className="font-semibold text-orange-900">{price}</span></div>
                    <div className="flex items-center justify-between mt-1"><span>{lang==='th'?'ระยะเวลา':'Duration'}</span><span className="font-medium">{duration}</span></div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 h-10 rounded-md bg-gradient-to-r from-orange-700 to-red-800 text-white hover:from-orange-800 hover:to-red-900">{lang==='th'?'จอง':'Book'}</button>
                    <button className="h-10 px-4 rounded-md border border-orange-300 bg-white text-orange-900 hover:border-orange-500">{lang==='th'?'ติดต่อ':'Contact'}</button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


