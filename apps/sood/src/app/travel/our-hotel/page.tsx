"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";
import { PhoneIcon, EnvelopeIcon, GlobeAltIcon, MapPinIcon, ClipboardDocumentIcon, ChatBubbleOvalLeftIcon } from "@heroicons/react/24/outline";

export default function OurHotelPage() {
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
        <section id="ta-hotel-panel" className="flex-1 bg-white flex flex-col min-h-0" style={{ width: `calc(100% - ${chatWidth}px)` }}>
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
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white">{currentLanguage==='th'?'ข้อมูลโรงแรม':'Our Resort'}</span>
                </li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'ข้อมูลโรงแรม':'Our Hotel'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'สิ่งอำนวยความสะดวก บริการ และการติดต่อ':'Facilities, services, and contact info'}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Hero: image + summary */}
            <section className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
              <div className="md:col-span-3 h-56 md:h-72 bg-stone-100 rounded-lg border border-stone-200" />
              <div className="md:col-span-2 space-y-3">
                <h3 className="text-2xl font-bold text-stone-900">Seaside Resort & Spa</h3>
                <p className="text-stone-700 text-sm leading-relaxed">
                  {currentLanguage==='th' ? 'รีสอร์ตบรรยากาศสบายริมทะเล พร้อมสปา ห้องอาหาร และสระว่ายน้ำ' : 'A relaxed beachfront resort featuring a full-service spa, dining, and lagoon-style pool.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-800">⭐ 4.6</span>
                  <span className="px-2 py-1 text-xs rounded bg-stone-200 text-stone-900">Free Wi‑Fi</span>
                  <span className="px-2 py-1 text-xs rounded bg-stone-200 text-stone-900">Family Friendly</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <a href="tel:+6612345678" className="inline-flex items-center gap-2 h-10 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 text-sm">
                    <PhoneIcon className="w-4 h-4" /> {currentLanguage==='th'?'โทร':'Call'}
                  </a>
                  <a href="mailto:hello@seasideresort.example" className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-stone-300 bg-white text-stone-800 hover:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500 text-sm">
                    <EnvelopeIcon className="w-4 h-4" /> Email
                  </a>
                  <a href="https://example.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-10 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 text-sm">
                    <GlobeAltIcon className="w-4 h-4" /> {currentLanguage==='th'?'เว็บไซต์':'Website'}
                  </a>
                </div>
              </div>
            </section>

            {/* Quick info cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-stone-200 rounded-lg bg-white p-4">
                <div className="font-semibold text-stone-900 mb-1">{currentLanguage==='th'?'ที่ตั้ง':'Location'}</div>
                <div className="text-sm text-stone-700">123 Beach Road, Phuket 83100</div>
                <div className="mt-2 flex gap-2">
                  <a href="https://maps.google.com/?q=Seaside%20Resort%20Phuket" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-10 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 text-sm"><MapPinIcon className="w-4 h-4" /> {currentLanguage==='th'?'นำทาง':'Directions'}</a>
                  <button className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-stone-300 bg-white text-stone-800 hover:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500 text-sm" onClick={() => navigator.clipboard?.writeText('123 Beach Road, Phuket 83100')}><ClipboardDocumentIcon className="w-4 h-4" /> {currentLanguage==='th'?'คัดลอก':'Copy'}</button>
                </div>
              </div>
              <div className="border border-stone-200 rounded-lg bg-white p-4">
                <div className="font-semibold text-stone-900 mb-1">{currentLanguage==='th'?'ติดต่อ':'Contact'}</div>
                <div className="text-sm text-stone-700">+66 12 345 678</div>
                <div className="text-sm text-stone-700">hello@seasideresort.example</div>
                <div className="mt-2 flex gap-2">
                  <a href="tel:+6612345678" className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 text-sm"><PhoneIcon className="w-4 h-4" /> {currentLanguage==='th'?'โทร':'Call'}</a>
                  <a href="https://line.me/R/ti/p/@seasideresort" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-stone-300 bg-white text-stone-800 hover:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500 text-sm"><ChatBubbleOvalLeftIcon className="w-4 h-4" /> LINE</a>
                </div>
              </div>
              <div className="border border-stone-200 rounded-lg bg-white p-4">
                <div className="font-semibold text-stone-900 mb-1">{currentLanguage==='th'?'เวลาเปิด':'Hours'}</div>
                <ul className="text-sm text-stone-700 space-y-1">
                  <li>Mon–Fri: 08:00–20:00</li>
                  <li>Sat–Sun: 09:00–21:00</li>
                </ul>
              </div>
            </section>

            {/* Map + Nearby CTA */}
            <section className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-3">
                <div className="w-full h-56 md:h-64 bg-stone-100 rounded-lg border border-stone-300 overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    className="rounded-lg"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent('Seaside Resort Phuket')}&z=15&output=embed`}
                    allowFullScreen
                    title="Resort Map"
                  />
                </div>
              </div>
              <div className="md:col-span-2 border border-stone-200 rounded-lg bg-white p-4">
                <div className="font-semibold text-stone-900">{currentLanguage==='th'?'สถานที่ใกล้เคียง':'Places nearby'}</div>
                <p className="text-sm text-stone-700 mt-1">{currentLanguage==='th'?'ร้านอาหาร คาเฟ่ และแหล่งท่องเที่ยวรอบ ๆ รีสอร์ต':'Restaurants, cafes, and attractions around the resort.'}</p>
                <Link href="/travel/places?category=Nearby" className="mt-3 inline-flex px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-sm">{currentLanguage==='th'?'สำรวจสถานที่ใกล้เคียง':'Explore nearby'}</Link>
              </div>
            </section>

            {/* Facilities */}
            <section>
              <div className="font-semibold text-stone-900 mb-2">{currentLanguage==='th'?'สิ่งอำนวยความสะดวก & บริการ':'Facilities & Services'}</div>
              <div className="flex flex-wrap gap-2">
                {["Pool","Spa","Gym","Restaurant","Bar","Shuttle","Kids Club","Beach Access"].map((f) => (
                  <span key={f} className="px-3 py-1.5 text-sm rounded-full bg-stone-200 text-stone-900">{f}</span>
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


