"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";

export default function EssentialsPage() {
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
        <section className="flex-1 bg-white flex flex-col min-h-0" style={{ width: `calc(100% - ${chatWidth}px)` }}>
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
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white">{currentLanguage==='th'?'ข้อมูลสำคัญ':'Essentials'}</span>
                </li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'ข้อมูลสำคัญ':'Essentials'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'อัตราแลกเปลี่ยน สภาพอากาศ และกิจกรรม':'Rates, weather, and events at a glance.'}</p>
          </div>

          <div id="ta-essentials" className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Currency */}
            <section id="ta-essentials-currency" className="border border-stone-200 rounded-lg bg-white">
              <div className="px-4 py-3 border-b border-stone-200 font-semibold">{currentLanguage==='th'?'อัตราแลกเปลี่ยน':'Currency Rates'}</div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded bg-stone-50 border border-stone-200">USD → THB: 36.2</div>
                <div className="p-3 rounded bg-stone-50 border border-stone-200">EUR → THB: 39.1</div>
                <div className="p-3 rounded bg-stone-50 border border-stone-200">JPY → THB: 0.25</div>
              </div>
            </section>

            {/* Weather */}
            <section id="ta-essentials-weather" className="border border-stone-200 rounded-lg bg-white">
              <div className="px-4 py-3 border-b border-stone-200 font-semibold">{currentLanguage==='th'?'สภาพอากาศ':'Weather (Today)'}</div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {["09:00","12:00","15:00","18:00"].map(t => (
                  <div key={t} className="p-3 rounded bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <span>{t}</span>
                    <span>30°C</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Events */}
            <section id="ta-essentials-events" className="border border-stone-200 rounded-lg bg-white">
              <div className="px-4 py-3 border-b border-stone-200 font-semibold">{currentLanguage==='th'?'อีเวนต์ใกล้คุณ':'Nearby Events'}</div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="p-4 rounded border border-stone-200 bg-stone-50">
                    <div className="font-medium text-stone-900">{currentLanguage==='th'?`กิจกรรม #${i}`:`Event #${i}`}</div>
                    <div className="text-stone-600">{currentLanguage==='th'?'รายละเอียดอย่างย่อของกิจกรรม':'Short description of the event'}</div>
                    <button className="mt-2 text-emerald-700 hover:underline">{currentLanguage==='th'?'ดูรายละเอียด':'View details'}</button>
                  </div>
                ))}
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


