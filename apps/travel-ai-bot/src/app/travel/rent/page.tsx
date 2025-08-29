"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";

type Vehicle = { id: string; type: string; seats?: number; transmission?: string; pricePerDay: string };
type Product = { id: string; title: string; attributes: any };

export default function RentPage(props: { embedded?: boolean }) {
  const embedded = !!props?.embedded;
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!isResizing) return; setChatWidth(Math.max(320, Math.min(720, window.innerWidth - e.clientX))); };
    const onUp = () => setIsResizing(false);
    if (isResizing) { document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isResizing]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        // Ensure 'rent' category exists
        const catsRes = await fetch('/api/categories', { headers: { 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any });
        const cats = await catsRes.json();
        const list = Array.isArray(cats?.items) ? cats.items : [];
        let rent = list.find((c: any) => (c.slug || '').toLowerCase() === 'rent');
        if (!rent) {
          const cRes = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any,
            body: JSON.stringify({ name: 'Rent', slug: 'rent' })
          });
          if (cRes.ok) rent = await cRes.json();
        }
        if (!rent?.id) throw new Error('Missing rent category');

        // Load products
        const res = await fetch('/api/contexts?type=product&category=rent&page_size=100', { headers: { 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any });
        const data = await res.json();
        const got: Product[] = (Array.isArray(data?.items) ? data.items : []).map((x: any) => ({ id: x.id, title: x.title, attributes: x.attributes || {} }));

        // Seed defaults if none
        if (got.length === 0) {
          const seedKey = `seed:rent:${(process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || 'default'}`;
          const seeded = typeof window !== 'undefined' ? window.localStorage.getItem(seedKey) === '1' : false;
          const defaults = [
            { slug: 'economy-car', title: 'Economy Car', product_type: 'car', seats: 4, transmission: 'Auto', price_per_day: 900, currency: 'THB' },
            { slug: 'suv', title: 'SUV', product_type: 'car', seats: 5, transmission: 'Auto', price_per_day: 1600, currency: 'THB' },
            { slug: 'van-9', title: 'Van (9 seats)', product_type: 'van', seats: 9, transmission: 'Auto', price_per_day: 2200, currency: 'THB' },
            { slug: 'motorbike-125', title: 'Motorbike 125cc', product_type: 'bike', transmission: 'Auto', price_per_day: 250, currency: 'THB' },
            { slug: 'scooter-150', title: 'Scooter 150cc', product_type: 'scooter', transmission: 'Auto', price_per_day: 350, currency: 'THB' },
          ];
          if (!seeded) {
            for (const d of defaults) {
              const payload = {
                type: 'product',
                title: d.title,
                body: `${d.title} rental`,
                instruction: 'Use product attributes to answer rent questions.',
                trust_level: 3,
                status: 'active',
                keywords: ['rent','vehicle'],
                categories: [rent.id],
                attributes: { ...d, tags: ['rent'] }
              };
              await fetch('/api/admin/contexts/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any,
                body: JSON.stringify(payload)
              });
            }
            try { if (typeof window !== 'undefined') window.localStorage.setItem(seedKey, '1'); } catch {}
          }
          const res2 = await fetch('/api/contexts?type=product&category=rent&page_size=100', { headers: { 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any });
          const d2 = await res2.json();
          setItems((Array.isArray(d2?.items) ? d2.items : []).map((x: any) => ({ id: x.id, title: x.title, attributes: x.attributes || {} })));
        } else {
          setItems(got);
        }
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
              <li aria-current="page" className="font-medium">{currentLanguage==='th'?'เช่ารถ/มอเตอร์ไซค์':'Car & Motorbike Rent'}</li>
            </ol>
          </nav>
        </div>
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'เลือกรถที่ต้องการ':'Choose your vehicle'}</h2>
          <p className="text-sm text-stone-600">{currentLanguage==='th'?'แสดงเป็นตารางพร้อมประเภทและราคา':'Shown as a grid with vehicle type and daily price.'}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((p) => {
              const a = p.attributes || {};
              const seats = a.seats ? `${a.seats} ${currentLanguage==='th'?'ที่นั่ง':'seats'}` : '';
              const trans = a.transmission || '';
              const price = (a.currency || 'THB') + ' ' + (a.price_per_day != null ? new Intl.NumberFormat().format(Number(a.price_per_day)) : '');
              return (
              <div key={p.id} className="border border-stone-200 rounded-lg bg-white overflow-hidden">
                <div className="h-32 bg-stone-100" />
                <div className="p-4">
                  <div className="font-semibold text-stone-900">{p.title}</div>
                  <div className="mt-1 text-sm text-stone-700">
                    {seats ? <span className="mr-3">{seats}</span> : null}
                    {trans ? <span>{trans}</span> : null}
                  </div>
                  <div className="mt-2 text-orange-900 font-semibold">{price} / {currentLanguage==='th'?'วัน':'day'}</div>
                  <div className="mt-3 flex gap-2">
                    <button className="px-3 py-1.5 rounded bg-gradient-to-r from-orange-700 to-red-800 text-white hover:from-orange-800 hover:to-red-900 text-sm">{currentLanguage==='th'?'จอง':'Reserve'}</button>
                    <button className="px-3 py-1.5 rounded border border-orange-300 text-orange-900 hover:border-orange-500 text-sm">{currentLanguage==='th'?'รายละเอียด':'Details'}</button>
                  </div>
                </div>
              </div>
            );})}
          </div>
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
        <section className="flex-1 bg-white flex flex-col min-h-0" style={{ width: `calc(100% - ${chatWidth}px)` }}>
          <div className="px-6 py-2 border-b border-stone-200 bg-white">
            <nav className="ta-breadcrumb" aria-label="Breadcrumb">
              <ol className="flex items-center text-sm text-orange-900">
                <li>
                  <Link href="/travel" className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-orange-900 hover:bg-orange-50 hover:text-orange-900 border border-transparent hover:border-orange-200">{currentLanguage==='th'?'การท่องเที่ยว':'Travel'}</Link>
                </li>
                <li className="px-2 text-amber-600">/</li>
                <li aria-current="page" className="font-medium">{currentLanguage==='th'?'เช่ารถ/มอเตอร์ไซค์':'Car & Motorbike Rent'}</li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'เลือกรถที่ต้องการ':'Choose your vehicle'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'แสดงเป็นตารางพร้อมประเภทและราคา':'Shown as a grid with vehicle type and daily price.'}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((p) => {
                const a = p.attributes || {};
                const seats = a.seats ? `${a.seats} ${currentLanguage==='th'?'ที่นั่ง':'seats'}` : '';
                const trans = a.transmission || '';
                const price = (a.currency || 'THB') + ' ' + (a.price_per_day != null ? new Intl.NumberFormat().format(Number(a.price_per_day)) : '');
                return (
                <div key={p.id} className="border border-stone-200 rounded-lg bg-white overflow-hidden">
                  <div className="h-32 bg-stone-100" />
                  <div className="p-4">
                    <div className="font-semibold text-stone-900">{p.title}</div>
                    <div className="mt-1 text-sm text-stone-700">
                      {seats ? <span className="mr-3">{seats}</span> : null}
                      {trans ? <span>{trans}</span> : null}
                    </div>
                    <div className="mt-2 text-orange-900 font-semibold">{price} / {currentLanguage==='th'?'วัน':'day'}</div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1.5 rounded bg-gradient-to-r from-orange-700 to-red-800 text-white hover:from-orange-800 hover:to-red-900 text-sm">{currentLanguage==='th'?'จอง':'Reserve'}</button>
                      <button className="px-3 py-1.5 rounded border border-orange-300 text-orange-900 hover:border-orange-500 text-sm">{currentLanguage==='th'?'รายละเอียด':'Details'}</button>
                    </div>
                  </div>
                </div>
              );})}
            </div>
          </div>
        </section>

        <div className="w-1 bg-stone-300 hover:bg-orange-400 cursor-col-resize" onMouseDown={() => setIsResizing(true)} />

        <aside className="bg-white border-l border-stone-200" style={{ width: `${chatWidth}px` }}>
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <ChatInterface sessionId={`sess_${Date.now()}`} activeChannel={"normal"} onChannelSwitch={()=>{}} isProcessing={false} />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}


