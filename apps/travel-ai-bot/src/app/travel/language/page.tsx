"use client";

import React, { useEffect, useState } from "react";
import { getApiUrl } from '@/app/lib/apiHelper';
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";

type Phrase = { id: string; en: string; th: string };

const PHRASES: Phrase[] = [
  { id: 'hello', en: 'Hello', th: 'สวัสดี' },
  { id: 'thankyou', en: 'Thank you', th: 'ขอบคุณ' },
  { id: 'howmuch', en: 'How much?', th: 'ราคาเท่าไหร่?' },
  { id: 'whereis', en: 'Where is the bathroom?', th: 'ห้องน้ำอยู่ที่ไหน?' }
];

export default function LanguagePage() {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!isResizing) return; setChatWidth(Math.max(320, Math.min(720, window.innerWidth - e.clientX))); };
    const onUp = () => setIsResizing(false);
    if (isResizing) { document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isResizing]);

  const play = (p: Phrase) => {
    // placeholder for TTS integration
    console.log('play', p.id);
  };

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
        <section id="ta-language-panel" className="flex-1 bg-white flex flex-col min-h-0" style={{ width: `calc(100% - ${chatWidth}px)` }}>
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
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-gradient-to-r from-orange-700 to-red-800 text-white">{currentLanguage==='th'?'ภาษา':'Language'}</span>
                </li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'ภาษา & วลี':'Language & Phrasebook'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'วลีที่ใช้บ่อยพร้อมปุ่มฟังเสียง':'Common phrases with quick audio'}</p>
          </div>

          <div id="ta-phrase-list" className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3 text-sm">
            {PHRASES.map((p)=> (
              <div key={p.id} className="border border-stone-200 rounded-lg bg-white p-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-stone-900">{p.en}</div>
                  <div className="text-stone-600">{p.th}</div>
                </div>
                <button id="ta-phrase-play" onClick={()=>play(p)} className="px-3 py-1.5 rounded bg-gradient-to-r from-orange-700 to-red-800 text-white hover:from-orange-800 hover:to-red-900">{currentLanguage==='th'?'เล่นเสียง':'Play'}</button>
              </div>
            ))}
          </div>
        </section>

        <div className="w-1 bg-stone-300 hover:bg-orange-400 cursor-col-resize" onMouseDown={() => setIsResizing(true)} />

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


