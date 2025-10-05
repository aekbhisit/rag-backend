"use client";

import React, { useEffect, useState } from "react";
import { getApiUrl } from '@/app/lib/apiHelper';
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";

export default function ItineraryPage() {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const next = window.innerWidth - e.clientX;
      setChatWidth(Math.max(320, Math.min(720, next)));
    };
    const onUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">🗺️ Travel Discovery</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentLanguage('en')} className={`px-3 py-2 rounded-md border text-sm ${currentLanguage==='en'?'bg-gradient-to-r from-orange-700 to-red-800 text-white border-orange-600':'bg-white text-orange-900 border-orange-300 hover:border-orange-500'}`}>🇺🇸 EN</button>
            <button onClick={() => setCurrentLanguage('th')} className={`px-3 py-2 rounded-md border text-sm ${currentLanguage==='th'?'bg-gradient-to-r from-orange-700 to-red-800 text-white border-orange-600':'bg-white text-orange-900 border-orange-300 hover:border-orange-500'}`}>🇹🇭 TH</button>
          </div>
        </div>
      </div>

      <div className="flex" style={{height:'calc(100vh - 80px)'}}>
        {/* Left panel: Itinerary builder */}
        <section className="flex-1 bg-white flex flex-col min-h-0" style={{ width: `calc(100% - ${chatWidth}px)` }}>
          <div className="px-6 py-2 border-b border-stone-200 bg-white">
            <nav className="ta-breadcrumb" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2">
                <li>
                  <Link href="/travel" className="inline-flex items-center px-3 py-1.5 rounded-md border border-orange-300 bg-white text-orange-900 hover:border-orange-500 hover:bg-orange-50">{currentLanguage==='th'?'การท่องเที่ยว':'Travel'}</Link>
                </li>
                <li className="text-stone-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                </li>
                <li>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-gradient-to-r from-orange-700 to-red-800 text-white">{currentLanguage==='th'?'แผนการเดินทาง':'Itinerary'}</span>
                </li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'แผนการเดินทาง':'Itinerary'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'ลากการ์ดจากหน้า Places มาวางเพื่อสร้างแผนประจำวัน':'Drag cards from Places to assemble your day plan.'}</p>
          </div>

          <div id="ta-itinerary-panel" className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1,2,3].map((d)=> (
                <div key={d} className="border border-stone-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-stone-900">{currentLanguage==='th'?`วันที่ ${d}`:`Day ${d}`}</div>
                    <button className="text-sm px-2 py-1 rounded border border-orange-300 text-orange-900 hover:border-orange-500">{currentLanguage==='th'?'ส่งออก':'Export'}</button>
                  </div>
                  <div className="mt-3 text-sm text-stone-600">{currentLanguage==='th'?'วางรายการที่นี่':'Drop items here'}</div>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li className="px-3 py-2 rounded bg-stone-50 border border-stone-200">{currentLanguage==='th'?'ตัวอย่าง: คาเฟ่ย่านเก่า':'Example: Old town cafe'}</li>
                    <li className="px-3 py-2 rounded bg-stone-50 border border-stone-200">{currentLanguage==='th'?'ตัวอย่าง: วัดโบราณ':'Example: Ancient temple'}</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="w-1 bg-stone-300 hover:bg-orange-400 cursor-col-resize" onMouseDown={() => setIsResizing(true)} />

        {/* Right Chat */}
        <aside className="bg-white border-l border-stone-200" style={{ width: `${chatWidth}px` }}>
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <EventProvider>
                <ChatInterface sessionId={`crypto.randomUUID()`} activeChannel={"normal"} onChannelSwitch={()=>{}} isProcessing={false} />
              </EventProvider>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}


