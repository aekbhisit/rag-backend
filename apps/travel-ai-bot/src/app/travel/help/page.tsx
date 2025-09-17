"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";

export default function HelpPage(props: { embedded?: boolean }) {
  const embedded = !!props?.embedded;
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [items, setItems] = useState<Array<{ id: string; title: string; body: string }>>([]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!isResizing) return; setChatWidth(Math.max(320, Math.min(720, window.innerWidth - e.clientX))); };
    const onUp = () => setIsResizing(false);
    if (isResizing) { document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isResizing]);

  useEffect(() => {
    const ensureAndLoad = async () => {
      try {
        setLoading(true);
        setError("");
        // Ensure 'help' category exists
        const catsRes = await fetch('/api/categories', { headers: { 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any });
        const cats = await catsRes.json();
        const all = Array.isArray(cats?.items) ? cats.items : [];
        let help = all.find((c: any) => (c.slug || '').toLowerCase() === 'help');
        if (!help) {
          const cRes = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any,
            body: JSON.stringify({ name: 'Help', slug: 'help' })
          });
          if (cRes.ok) help = await cRes.json();
        }
        if (!help?.id) throw new Error('Missing help category');

        // Load help articles
        const res = await fetch('/api/contexts?type=text&category=help&page_size=100', { headers: { 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any });
        const data = await res.json();
        let list: any[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);

        const tenantId = (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '';
        const seedKey = `seed:help:${tenantId || 'default'}`;
        const alreadySeeded = typeof window !== 'undefined' ? window.localStorage.getItem(seedKey) === '1' : false;
        const slugs = new Set(list.map((x: any) => String(x?.attributes?.slug || '').toLowerCase()).filter(Boolean));
        const defaults = [
          {
            slug: 'getting-started',
            title: currentLanguage==='th'?'เริ่มต้นใช้งาน':'Getting started',
            body: currentLanguage==='th'
              ? ['เปิดหน้า Travel','เลือกหมวดที่ต้องการ เช่น สถานที่ ทัวร์ แท็กซี่','คลิกเพื่อดูรายละเอียดหรือพิมพ์ถามแชทบอท'].join('\n')
              : ['Open the Travel page','Pick a section like Places, Tours, Taxi','Click for details or ask the chatbot'].join('\n')
          },
          {
            slug: 'using-filters',
            title: currentLanguage==='th'?'การใช้ตัวกรอง':'Using filters',
            body: currentLanguage==='th'
              ? ['ตั้งค่าหมวด หมายเลขราคา ระยะเวลา เพื่อปรับผลลัพธ์','ใช้ช่องค้นหาเพื่อหาคีย์เวิร์ดเฉพาะ'].join('\n')
              : ['Set category, price band, duration to refine results','Use search to find specific keywords'].join('\n')
          },
          {
            slug: 'contact-resort',
            title: currentLanguage==='th'?'ติดต่อรีสอร์ต':'Contact resort',
            body: currentLanguage==='th'
              ? ['ไปที่หน้า Our Resort','ใช้ปุ่มโทร อีเมล หรือเว็บไซต์','แจ้งความต้องการเพื่อให้พนักงานช่วยเหลือ'].join('\n')
              : ['Go to Our Resort page','Use Call, Email or Website buttons','Describe your request for faster assistance'].join('\n')
          }
        ];

        const toCreate = defaults.filter(d => !slugs.has(d.slug.toLowerCase()));
        if (!alreadySeeded && toCreate.length > 0) {
          for (const d of toCreate) {
            const payload = {
              type: 'text',
              title: d.title,
              body: d.body,
              instruction: currentLanguage==='th' ? 'ใช้บทความช่วยเหลือนี้เพื่อตอบคำถามผู้ใช้' : 'Use this help article to assist users.',
              trust_level: 3,
              status: 'active',
              keywords: ['help','onboarding','faq'],
              categories: [help.id],
              attributes: { slug: d.slug, tags: ['help'] }
            };
            await fetch('/api/admin/contexts/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any,
              body: JSON.stringify(payload)
            });
          }
          try { if (typeof window !== 'undefined') window.localStorage.setItem(seedKey, '1'); } catch {}
          
          // If we created new items, we need to refetch to get the updated list
          const res2 = await fetch('/api/contexts?type=text&category=help&page_size=100', { headers: { 'x-tenant-id': (process as any)?.env?.NEXT_PUBLIC_RAG_TENANT_ID || '' } as any });
          const d2 = await res2.json();
          list = Array.isArray(d2?.items) ? d2.items : (Array.isArray(d2) ? d2 : []);
        }

        // Use the list (either original or updated after seeding)
        setItems(list.map((x: any) => ({ id: x.id, title: x.title, body: x.body })));
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
              <li aria-current="page" className="font-medium">{currentLanguage==='th'?'ช่วยเหลือ':'Help'}</li>
            </ol>
          </nav>
        </div>
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'ช่วยเหลือ & วิธีใช้งาน':'Help & Onboarding'}</h2>
          <p className="text-sm text-stone-600">{currentLanguage==='th'?'คู่มือสั้น ๆ เกี่ยวกับการใช้งานและคำถามที่พบบ่อย':'Quick guide and FAQ to help you get started.'}</p>
        </div>
        <div id="ta-help-panel" className="p-6">
          <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg bg-white">
            {loading && <div className="p-4 text-sm text-stone-600">{currentLanguage==='th'?'กำลังโหลด...':'Loading...'}</div>}
            {error && <div className="p-4 text-sm text-red-700">{error}</div>}
            {!loading && !error && items.map((it, idx) => {
              const lines = String(it.body || '').split(/\r?\n+/).filter(Boolean);
              return (
                <details key={it.id || idx} className="group">
                  <summary className="flex items-start justify-between cursor-pointer select-none p-4 text-stone-900 font-medium group-open:bg-stone-50">
                    <span className="pr-4">{it.title}</span>
                    <svg className="w-4 h-4 mt-1 text-stone-500 group-open:rotate-180 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                  </summary>
                  <div className="p-4 pt-2 text-sm text-stone-700">
                    {lines.length > 1 ? (
                      <ul className="list-disc pl-5 space-y-1">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
                    ) : (
                      <p>{lines[0] || ''}</p>
                    )}
                  </div>
                </details>
              );
            })}
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
                <li aria-current="page" className="font-medium">{currentLanguage==='th'?'ช่วยเหลือ':'Help'}</li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'ช่วยเหลือ & วิธีใช้งาน':'Help & Onboarding'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'คู่มือสั้น ๆ เกี่ยวกับการใช้งานและคำถามที่พบบ่อย':'Quick guide and FAQ to help you get started.'}</p>
          </div>

          <div id="ta-help-panel" className="flex-1 min-h-0 overflow-y-auto p-6">
            <section>
              <h3 className="text-stone-900 font-semibold mb-3">{currentLanguage==='th'?'คำถามที่พบบ่อย':'Frequently asked questions'}</h3>
              <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg bg-white">
                {loading && <div className="p-4 text-sm text-stone-600">{currentLanguage==='th'?'กำลังโหลด...':'Loading...'}</div>}
                {error && <div className="p-4 text-sm text-red-700">{error}</div>}
                {!loading && !error && items.map((it, idx) => {
                  const lines = String(it.body || '').split(/\r?\n+/).filter(Boolean);
                  return (
                    <details key={it.id || idx} className="group">
                      <summary className="flex items-start justify-between cursor-pointer select-none p-4 text-stone-900 font-medium group-open:bg-stone-50">
                        <span className="pr-4">{it.title}</span>
                        <svg className="w-4 h-4 mt-1 text-stone-500 group-open:rotate-180 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                      </summary>
                      <div className="p-4 pt-2 text-sm text-stone-700">
                        {lines.length > 1 ? (
                          <ul className="list-disc pl-5 space-y-1">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
                        ) : (
                          <p>{lines[0] || ''}</p>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          </div>
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


