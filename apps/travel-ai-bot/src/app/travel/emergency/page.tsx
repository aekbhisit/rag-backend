"use client";

import React, { useEffect, useState } from "react";
import { getApiUrl } from '@/app/lib/apiHelper';
import Link from "next/link";
import { PhoneIcon, ShieldCheckIcon, LifebuoyIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { getApiUrl } from '@/app/lib/apiHelper';
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";

type Contact = { id: string; label: string; number: string; descEn: string; descTh: string };
const CONTACTS: Contact[] = [
  { id: 'police', label: 'Police', number: '191', descEn: 'General emergencies', descTh: 'เหตุฉุกเฉินทั่วไป' },
  { id: 'ambulance', label: 'Ambulance', number: '1669', descEn: 'Medical emergencies', descTh: 'ฉุกเฉินทางการแพทย์' },
  { id: 'tourist', label: 'Tourist Police', number: '1155', descEn: 'Assistance for tourists', descTh: 'ช่วยเหลือนักท่องเที่ยว' },
];

export default function EmergencyPage(props: { embedded?: boolean }) {
  const embedded = !!props?.embedded;
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!isResizing) return; setChatWidth(Math.max(320, Math.min(720, window.innerWidth - e.clientX))); };
    const onUp = () => setIsResizing(false);
    if (isResizing) { document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isResizing]);

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
              <li aria-current="page" className="font-medium">{currentLanguage==='th'?'ฉุกเฉิน':'Emergency'}</li>
            </ol>
          </nav>
        </div>
        <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'ฉุกเฉิน & ความปลอดภัย':'Emergency & Safety'}</h2>
          <p className="text-sm text-stone-600">{currentLanguage==='th'?'เบอร์สำคัญและคำแนะนำ':'Critical numbers and guidance'}</p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
          {CONTACTS.map(c => {
            const Icon = c.id === 'police' ? ShieldCheckIcon : c.id === 'ambulance' ? LifebuoyIcon : GlobeAltIcon;
            const label = currentLanguage==='th'? (c.id==='police'?'ตำรวจ': c.id==='ambulance'?'รถพยาบาล':'ตำรวจท่องเที่ยว') : c.label;
            const desc = currentLanguage==='th'? c.descTh : c.descEn;
            return (
              <a key={c.id} href={`tel:${c.number}`} className="group self-start border border-stone-200 rounded-xl bg-white px-4 py-3 hover:border-orange-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-orange-50 text-orange-900 ring-1 ring-orange-100 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-stone-900 font-semibold leading-tight truncate">{label}</div>
                      <div className="text-stone-700 text-xs leading-snug truncate">{desc}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-orange-700 text-white text-sm font-semibold leading-none">{c.number}</div>
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <PhoneIcon className="w-4 h-4 text-orange-900" />
                      <span className="text-xs text-orange-900 font-medium leading-none">{currentLanguage==='th'?'แตะเพื่อโทร':'Tap to call'}</span>
                    </div>
                  </div>
                </div>
              </a>
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
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-900 to-red-900 bg-clip-text text-transparent">Travel Discovery</h1>
          <div className="flex items-center gap-2">
            <button onClick={()=>setCurrentLanguage('en')} className={`px-3 py-2 rounded-md border text-sm ${currentLanguage==='en'?'bg-gradient-to-r from-orange-700 to-red-800 text-white border-orange-600':'bg-white text-orange-900 border-orange-300 hover:border-orange-500'}`}>🇺🇸 EN</button>
            <button onClick={()=>setCurrentLanguage('th')} className={`px-3 py-2 rounded-md border text-sm ${currentLanguage==='th'?'bg-gradient-to-r from-orange-700 to-red-800 text-white border-orange-600':'bg-white text-orange-900 border-orange-300 hover:border-orange-500'}`}>🇹🇭 TH</button>
          </div>
        </div>
      </div>

      <div className="flex" style={{height:'calc(100vh - 80px)'}}>
        <section id="ta-emergency-panel" className="flex-1 bg-white flex flex-col min-h-0" style={{ width: `calc(100% - ${chatWidth}px)` }}>
          <div className="px-6 py-2 border-b border-stone-200 bg-white">
            <nav className="ta-breadcrumb" aria-label="Breadcrumb">
              <ol className="flex items-center text-sm text-orange-900">
                <li>
                  <Link href="/travel" className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-orange-900 hover:bg-orange-50 hover:text-orange-900 border border-transparent hover:border-orange-200">{currentLanguage==='th'?'การท่องเที่ยว':'Travel'}</Link>
                </li>
                <li className="px-2 text-amber-600">/</li>
                <li aria-current="page" className="font-medium">{currentLanguage==='th'?'ฉุกเฉิน':'Emergency'}</li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'ฉุกเฉิน & ความปลอดภัย':'Emergency & Safety'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'เบอร์สำคัญและคำแนะนำ':'Critical numbers and guidance'}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start content-start justify-start">
            {CONTACTS.map(c => {
              const Icon = c.id === 'police' ? ShieldCheckIcon : c.id === 'ambulance' ? LifebuoyIcon : GlobeAltIcon;
              const label = currentLanguage==='th'? (c.id==='police'?'ตำรวจ': c.id==='ambulance'?'รถพยาบาล':'ตำรวจท่องเที่ยว') : c.label;
              const desc = currentLanguage==='th'? c.descTh : c.descEn;
              return (
                <a key={c.id} href={`tel:${c.number}`} className="group self-start border border-stone-200 rounded-xl bg-white px-4 py-3 hover:border-orange-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-orange-50 text-orange-900 ring-1 ring-orange-100 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-stone-900 font-semibold leading-tight truncate">{label}</div>
                        <div className="text-stone-700 text-xs leading-snug truncate">{desc}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-orange-700 text-white text-sm font-semibold leading-none">{c.number}</div>
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <PhoneIcon className="w-4 h-4 text-orange-900" />
                        <span className="text-xs text-orange-900 font-medium leading-none">{currentLanguage==='th'?'แตะเพื่อโทร':'Tap to call'}</span>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
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


