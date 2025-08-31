"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";

export default function GettingAroundPage() {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!isResizing) return; setChatWidth(Math.max(320, Math.min(720, window.innerWidth - e.clientX))); };
    const onUp = () => setIsResizing(false);
    if (isResizing) { document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isResizing]);

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">🗺️ Travel Discovery</h1>
          <div className="flex items-center gap-2">
            <button onClick={()=>setCurrentLanguage('en')} className={`px-3 py-2 rounded-md border text-sm ${currentLanguage==='en'?'bg-emerald-600 text-white border-emerald-600':'bg-white text-stone-800 border-stone-300 hover:border-emerald-400'}`}>🇺🇸 EN</button>
            <button onClick={()=>setCurrentLanguage('th')} className={`px-3 py-2 rounded-md border text-sm ${currentLanguage==='th'?'bg-emerald-600 text-white border-emerald-600':'bg-white text-stone-800 border-stone-300 hover:border-emerald-400'}`}>🇹🇭 TH</button>
          </div>
        </div>
      </div>

      <div className="flex" style={{height:'calc(100vh - 80px)'}}>
        <section id="ta-getting-around" className="flex-1 bg-white flex flex-col min-h-0" style={{ width: `calc(100% - ${chatWidth}px)` }}>
          <div className="px-6 py-2 border-b border-stone-200 bg-white">
            <nav className="ta-breadcrumb" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2">
                <li>
                  <Link href="/travel" className="inline-flex items-center px-3 py-1.5 rounded-md border border-stone-300 bg-white text-stone-800 hover:border-emerald-400 hover:bg-stone-50">{currentLanguage==='th'?'การท่องเที่ยว':'Travel'}</Link>
                </li>
                <li className="text-stone-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                </li>
                <li>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white">{currentLanguage==='th'?'การเดินทาง':'Getting Around'}</span>
                </li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'การเดินทาง':'Getting Around'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'ตัวเลือกการเดินทาง การเชื่อมต่อ และแผนที่ออฟไลน์':'Transport options, connectivity and offline maps.'}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Transport */}
            <section id="ta-ga-transport" className="border border-stone-200 rounded-lg bg-white">
              <div className="px-4 py-3 border-b border-stone-200 font-semibold">{currentLanguage==='th'?'การขนส่ง':'Transport'}</div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
                {["BTS/MRT","Taxi","Motorbike","Tuk-tuk","Songthaew","Bus"].map((m)=> (
                  <div key={m} className="p-3 rounded bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <span>{m}</span>
                    <button className="px-2 py-1 rounded border border-stone-300 hover:border-emerald-400">{currentLanguage==='th'?'เส้นทาง':'Routes'}</button>
                  </div>
                ))}
              </div>
            </section>

            {/* Connectivity */}
            <section id="ta-ga-connectivity" className="border border-stone-200 rounded-lg bg-white">
              <div className="px-4 py-3 border-b border-stone-200 font-semibold">{currentLanguage==='th'?'การเชื่อมต่ออินเทอร์เน็ต':'Connectivity'}</div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
                {["eSIM","Local SIM","Pocket Wi‑Fi"].map((c)=> (
                  <div key={c} className="p-3 rounded bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <span>{c}</span>
                    <button className="px-2 py-1 rounded border border-stone-300 hover:border-emerald-400">{currentLanguage==='th'?'สมัคร':'Get'}</button>
                  </div>
                ))}
              </div>
            </section>

            {/* Offline Maps */}
            <section id="ta-ga-offline-maps" className="border border-stone-200 rounded-lg bg-white">
              <div className="px-4 py-3 border-b border-stone-200 font-semibold">{currentLanguage==='th'?'แผนที่ออฟไลน์':'Offline Maps'}</div>
              <div className="p-4 text-sm">
                <button className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">{currentLanguage==='th'?'ดาวน์โหลดพื้นที่':'Download area'}</button>
              </div>
            </section>
          </div>
        </section>

        <div className="w-1 bg-stone-300 hover:bg-emerald-400 cursor-col-resize" onMouseDown={() => setIsResizing(true)} />

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


