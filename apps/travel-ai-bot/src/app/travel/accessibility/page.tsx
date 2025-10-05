"use client";

import React, { useEffect, useState } from "react";
import { getApiUrl } from '@/app/lib/apiHelper';
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";

export default function AccessibilityPage() {
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
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white">{currentLanguage==='th'?'การช่วยการเข้าถึง':'Accessibility'}</span>
                </li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'การช่วยการเข้าถึง':'Accessibility'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'แนวทางเพื่อประสบการณ์ที่ทุกคนเข้าถึงได้':'Guidelines for inclusive experiences.'}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            <section className="border border-stone-200 rounded-lg bg-white p-4">
              <div className="font-semibold text-stone-900 mb-2">{currentLanguage==='th'?'รายการตรวจสอบ':'Checklist'}</div>
              <ul className="list-disc pl-5 text-sm text-stone-700 space-y-1">
                <li>{currentLanguage==='th'?'คอนทราสต์สีเพียงพอ':'Sufficient color contrast'}</li>
                <li>{currentLanguage==='th'?'นำทางด้วยคีย์บอร์ดได้':'Keyboard navigable'}</li>
                <li>{currentLanguage==='th'?'รองรับผู้อ่านหน้าจอ':'Screen reader roles and labels'}</li>
                <li>{currentLanguage==='th'?'เป้าหมายการแตะขนาดใหญ่':'Large tap targets'}</li>
                <li>{currentLanguage==='th'?'ลดแอนิเมชัน':'Reduced motion friendly'}</li>
              </ul>
            </section>
          </div>
        </section>

        <div className="w-1 bg-stone-300 hover:bg-emerald-400 cursor-col-resize" onMouseDown={() => setIsResizing(true)} />

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


