"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";

type TaxiTransportPageProps = { embedded?: boolean };

export default function TaxiTransportPage({ embedded = false }: TaxiTransportPageProps) {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<Array<{ id: string; title: string; body: string }>>([]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!isResizing) return; setChatWidth(Math.max(320, Math.min(720, window.innerWidth - e.clientX))); };
    const onUp = () => setIsResizing(false);
    if (isResizing) { document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isResizing]);

  useEffect(() => {
    const ensureCategoryAndLoad = async () => {
      try {
        setLoading(true);
        setError("");
        // 1) Ensure 'taxi' category exists
        const resCats = await fetch('/api/categories', { headers: { 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any });
        const dataCats = await resCats.json();
        const allCats = Array.isArray(dataCats?.items) ? dataCats.items : (Array.isArray(dataCats?.categories) ? dataCats.categories : []);
        let taxi = allCats.find((c: any) => (c.slug || '').toLowerCase() === 'taxi');
        if (!taxi) {
          const cRes = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any,
            body: JSON.stringify({ name: 'Taxi', slug: 'taxi' })
          });
          if (cRes.ok) taxi = await cRes.json();
        }
        if (!taxi || !taxi.id) throw new Error('Missing taxi category');
        setCategoryId(taxi.id);

        // 2) Load contexts for category=taxi
        const resCtx = await fetch('/api/contexts?type=text&category=taxi&page_size=100', { headers: { 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any });
        const payload = await resCtx.json();
        const ctxItems: any[] = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);

        // 3) Seed if necessary (four cards)
        const tenantId = (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '';
        const seedKey = `seed:taxi:${tenantId || 'default'}`;
        const alreadySeeded = typeof window !== 'undefined' ? window.localStorage.getItem(seedKey) === '1' : false;
        const expected = [
          { key: 'taxi_metered', title: currentLanguage==='th'?'แท็กซี่มิเตอร์':'Metered Taxi', body: currentLanguage==='th' ? ['เริ่มต้นประมาณ 35 บาท','เปิดมิเตอร์ทุกครั้ง หากไม่เปิดควรปฏิเสธ','เตรียมเงินสดย่อยสำหรับค่าทางด่วน/ทิป'].join('\n') : ['Start around 35 THB','Always use the meter; decline if refused','Carry small cash for tolls/tips'].join('\n') },
          { key: 'taxi_ride_hailing', title: 'Ride‑hailing', body: currentLanguage==='th' ? ['Grab, Bolt และบริการท้องถิ่น','ดูราคาในแอปก่อนยืนยัน','แชร์ตำแหน่งกับเพื่อนเพื่อความปลอดภัย'].join('\n') : ['Grab, Bolt and local partners','Check in‑app fare before confirming','Share trip status for safety'].join('\n') },
          { key: 'public_transport', title: currentLanguage==='th'?'การขนส่งสาธารณะ':'Public Transport', body: currentLanguage==='th' ? 'BTS/MRT, Airport Rail Link, รถเมล์ ใช้บัตรเติมเงินเพื่อความสะดวก.' : 'BTS/MRT, Airport Rail Link, buses. Use stored‑value cards for convenience.' },
          { key: 'safety_tips', title: currentLanguage==='th'?'คำแนะนำความปลอดภัย':'Safety tips', body: currentLanguage==='th' ? ['เช็กป้ายทะเบียนและชื่อคนขับก่อนขึ้น','อย่าแชร์ข้อมูลส่วนตัวกับคนขับ','แจ้งปัญหาผ่านแอปหรือเบอร์ฉุกเฉิน'].join('\n') : ['Verify plate and driver name','Avoid sharing personal info','Report issues via app or emergency numbers'].join('\n') }
        ];

        const haveSlugs = new Set(
          ctxItems.map((x: any) => String(x?.attributes?.slug || '').toLowerCase()).filter(Boolean)
        );
        const toCreate = expected.filter(e => !haveSlugs.has(e.key.toLowerCase()));
        if (!alreadySeeded && toCreate.length > 0) {
          for (const it of toCreate) {
            const payload = {
              type: 'text',
              title: it.title,
              body: it.body,
              instruction: currentLanguage==='th' ? 'ใช้ข้อมูลนี้ช่วยตอบคำถามเรื่องแท็กซี่อย่างกระชับ' : 'Use this content to answer taxi questions concisely.',
              trust_level: 3,
              status: 'active',
              keywords: ['taxi','transport'],
              categories: [taxi.id],
              attributes: { slug: it.key, tags: ['taxi'] }
            };
            await fetch('/api/admin/contexts/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any,
              body: JSON.stringify(payload)
            });
          }
          try { if (typeof window !== 'undefined') window.localStorage.setItem(seedKey, '1'); } catch {}
          // Reload
          const res2 = await fetch('/api/contexts?type=text&category=taxi&page_size=100', { headers: { 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any });
          const p2 = await res2.json();
          setItems((Array.isArray(p2?.items) ? p2.items : (Array.isArray(p2) ? p2 : [])).map((r: any) => ({ id: r.id, title: r.title, body: r.body })));
        } else {
          setItems(ctxItems.map((r: any) => ({ id: r.id, title: r.title, body: r.body })));
        }
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    };
    ensureCategoryAndLoad();
  }, []);

  // Embedded-only content (no header/sidebar chat)
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
              <li aria-current="page" className="font-medium">{currentLanguage==='th'?'แท็กซี่ & การเดินทาง':'Taxi & Transportation'}</li>
            </ol>
          </nav>
        </div>
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50">
          <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'วิธีการเดินทาง':'How to get around'}</h2>
          <p className="text-sm text-stone-600">{currentLanguage==='th'?'ข้อมูลแท็กซี่ แอปเรียกรถ ค่าบริการ และคำแนะนำความปลอดภัย':'Taxi, ride-hailing apps, fares, and safety tips'}</p>
        </div>
        <div className="p-6 space-y-6">
          {loading && (
            <div className="text-sm text-stone-600">{currentLanguage==='th'?'กำลังโหลด...':'Loading...'}</div>
          )}
          {error && (
            <div className="text-sm text-red-700">{error}</div>
          )}
          {!loading && !error && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((it) => {
                const lines = String(it.body || '').split(/\r?\n+/).filter(Boolean);
                const isList = lines.length > 1;
                return (
                  <div key={it.id} className="border border-stone-200 rounded-lg bg-white p-4">
                    <div className="text-stone-900 font-semibold">{it.title}</div>
                    {isList ? (
                      <ul className="mt-2 text-sm text-stone-700 list-disc pl-5 space-y-1">
                        {lines.map((l, idx) => <li key={idx}>{l}</li>)}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-stone-700">{lines[0] || ''}</p>
                    )}
                  </div>
                );
              })}
            </section>
          )}
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
                <li aria-current="page" className="font-medium">{currentLanguage==='th'?'แท็กซี่ & การเดินทาง':'Taxi & Transportation'}</li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'วิธีการเดินทาง':'How to get around'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'ข้อมูลแท็กซี่ แอปเรียกรถ ค่าบริการ และคำแนะนำความปลอดภัย':'Taxi, ride-hailing apps, fares, and safety tips'}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {loading && (
              <div className="text-sm text-stone-600">{currentLanguage==='th'?'กำลังโหลด...':'Loading...'}</div>
            )}
            {error && (
              <div className="text-sm text-red-700">{error}</div>
            )}
            {!loading && !error && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((it) => {
                  const lines = String(it.body || '').split(/\r?\n+/).filter(Boolean);
                  const isList = lines.length > 1;
                  return (
                    <div key={it.id} className="border border-stone-200 rounded-lg bg-white p-4">
                      <div className="text-stone-900 font-semibold">{it.title}</div>
                      {isList ? (
                        <ul className="mt-2 text-sm text-stone-700 list-disc pl-5 space-y-1">
                          {lines.map((l, idx) => <li key={idx}>{l}</li>)}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-stone-700">{lines[0] || ''}</p>
                      )}
                    </div>
                  );
                })}
              </section>
            )}
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


