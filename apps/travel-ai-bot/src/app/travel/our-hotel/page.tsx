"use client";

import React, { useEffect, useState } from "react";
import { getApiUrl } from '@/app/lib/apiHelper';
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";
import { PhoneIcon, EnvelopeIcon, GlobeAltIcon, MapPinIcon, ClipboardDocumentIcon, ChatBubbleOvalLeftIcon } from "@heroicons/react/24/outline";
import { getApiUrl } from '@/app/lib/apiHelper';

export default function OurHotelPage(props: { embedded?: boolean }) {
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

  return (
    <main className={`${embedded ? 'p-0' : 'min-h-screen'}`} style={{ background: '#ffffff' }}>
      {!embedded && (
      <div className="sticky top-0 z-40" style={{ background: 'var(--ta-primary)', color: 'var(--ta-on-primary)', borderBottom: '1px solid var(--ta-border)' }}>
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Travel Discovery</h1>
          <div className="flex items-center gap-2">
            <button onClick={()=>setCurrentLanguage('en')} className={`px-3 py-2 rounded-md border text-sm ${currentLanguage==='en'?'bg-white':''}`} style={ currentLanguage==='en' ? { color: 'var(--ta-primary)', borderColor: 'transparent' } : { color: 'var(--ta-on-primary)', borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.15)' } }>🇺🇸 EN</button>
            <button onClick={()=>setCurrentLanguage('th')} className={`px-3 py-2 rounded-md border text-sm ${currentLanguage==='th'?'bg-white':''}`} style={ currentLanguage==='th' ? { color: 'var(--ta-primary)', borderColor: 'transparent' } : { color: 'var(--ta-on-primary)', borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.15)' } }>🇹🇭 TH</button>
          </div>
        </div>
      </div>
      )}

      <div className="flex" style={{height: embedded ? 'auto' : 'calc(100vh - 80px)'}}>
        <section id="ta-hotel-panel" className="flex-1 flex flex-col min-h-0 p-0" style={{ width: embedded ? '100%' : `calc(100% - ${chatWidth}px)`, background: 'var(--ta-surface)' }}>
          <div className="px-6 py-2" style={{ borderBottom: '1px solid var(--ta-border)', background: 'var(--ta-panel-from)' }}>
            <nav className="ta-breadcrumb" aria-label="Breadcrumb">
              <ol className="flex items-center text-sm" style={{ color: 'var(--ta-muted)' }}>
                <li>
                  <Link href="/travel" className="inline-flex items-center gap-1 px-2 py-1 rounded-md border" style={{ color: 'var(--ta-muted)', borderColor: 'var(--ta-border)' }}>{currentLanguage==='th'?'การท่องเที่ยว':'Travel'}</Link>
                </li>
                <li className="px-2" style={{ color: 'var(--ta-muted)' }}>/</li>
                <li aria-current="page" className="font-medium" style={{ color: 'var(--ta-text)' }}>{currentLanguage==='th'?'ข้อมูลโรงแรม':'Our Resort'}</li>
              </ol>
            </nav>
          </div>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--ta-border)', background: 'var(--ta-panel-from)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--ta-text)' }}>{currentLanguage==='th'?'ข้อมูลโรงแรม':'Our Hotel'}</h2>
            <p className="text-sm" style={{ color: 'var(--ta-muted)' }}>{currentLanguage==='th'?'สิ่งอำนวยความสะดวก บริการ และการติดต่อ':'Facilities, services, and contact info'}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Hero: image + summary */}
            <section className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
              <div className="md:col-span-3 h-56 md:h-72 rounded-lg" style={{ background: '#f5f5f4', border: '1px solid var(--ta-border)' }} />
              <div className="md:col-span-2 space-y-3">
                <h3 className="text-2xl font-bold" style={{ color: 'var(--ta-text)' }}>Seaside Resort & Spa</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ta-muted)' }}>
                  {currentLanguage==='th' ? 'รีสอร์ตบรรยากาศสบายริมทะเล พร้อมสปา ห้องอาหาร และสระว่ายน้ำ' : 'A relaxed beachfront resort featuring a full-service spa, dining, and lagoon-style pool.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs rounded" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--ta-muted)' }}>⭐ 4.6</span>
                  <span className="px-2 py-1 text-xs rounded" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--ta-muted)' }}>Free Wi‑Fi</span>
                  <span className="px-2 py-1 text-xs rounded" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--ta-muted)' }}>Family Friendly</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <a href="tel:+6612345678" className="inline-flex items-center gap-2 h-10 px-3 rounded-md text-sm shadow-md" style={{ background: 'var(--ta-primary)', color: 'var(--ta-on-primary)' }}>
                    <PhoneIcon className="w-4 h-4" /> {currentLanguage==='th'?'โทร':'Call'}
                  </a>
                  <a href="mailto:hello@seasideresort.example" className="inline-flex items-center gap-2 h-10 px-3 rounded-md text-sm" style={{ border: '1px solid var(--ta-border)', background: '#ffffff', color: 'var(--ta-text)' }}>
                    <EnvelopeIcon className="w-4 h-4" /> Email
                  </a>
                  <a href="https://example.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-10 px-3 rounded-md text-sm shadow-md" style={{ background: 'var(--ta-primary)', color: 'var(--ta-on-primary)' }}>
                    <GlobeAltIcon className="w-4 h-4" /> {currentLanguage==='th'?'เว็บไซต์':'Website'}
                  </a>
                </div>
              </div>
            </section>

            {/* Quick info cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-white p-4" style={{ border: '1px solid var(--ta-border)' }}>
                <div className="font-semibold mb-1" style={{ color: 'var(--ta-text)' }}>{currentLanguage==='th'?'ที่ตั้ง':'Location'}</div>
                <div className="text-sm" style={{ color: 'var(--ta-muted)' }}>123 Beach Road, Phuket 83100</div>
                <div className="mt-2 flex gap-2">
                  <a href="https://maps.google.com/?q=Seaside%20Resort%20Phuket" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-10 px-3 rounded-md text-sm shadow-md" style={{ background: 'var(--ta-primary)', color: 'var(--ta-on-primary)' }}><MapPinIcon className="w-4 h-4" /> {currentLanguage==='th'?'นำทาง':'Directions'}</a>
                  <button className="inline-flex items-center gap-2 h-10 px-3 rounded-md text-sm" style={{ border: '1px solid var(--ta-border)', background: '#ffffff', color: 'var(--ta-text)' }} onClick={() => navigator.clipboard?.writeText('123 Beach Road, Phuket 83100')}><ClipboardDocumentIcon className="w-4 h-4" /> {currentLanguage==='th'?'คัดลอก':'Copy'}</button>
                </div>
              </div>
              <div className="rounded-lg bg-white p-4" style={{ border: '1px solid var(--ta-border)' }}>
                <div className="font-semibold mb-1" style={{ color: 'var(--ta-text)' }}>{currentLanguage==='th'?'ติดต่อ':'Contact'}</div>
                <div className="text-sm" style={{ color: 'var(--ta-muted)' }}>+66 12 345 678</div>
                <div className="text-sm" style={{ color: 'var(--ta-muted)' }}>hello@seasideresort.example</div>
                <div className="mt-2 flex gap-2">
                  <a href="tel:+6612345678" className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm" style={{ background: 'var(--ta-primary)', color: 'var(--ta-on-primary)' }}><PhoneIcon className="w-4 h-4" /> {currentLanguage==='th'?'โทร':'Call'}</a>
                  <a href="https://line.me/R/ti/p/@seasideresort" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm" style={{ border: '1px solid var(--ta-border)', background: '#ffffff', color: 'var(--ta-text)' }}><ChatBubbleOvalLeftIcon className="w-4 h-4" /> LINE</a>
                </div>
              </div>
              <div className="rounded-lg bg-white p-4" style={{ border: '1px solid var(--ta-border)' }}>
                <div className="font-semibold mb-1" style={{ color: 'var(--ta-text)' }}>{currentLanguage==='th'?'เวลาเปิด':'Hours'}</div>
                <ul className="text-sm space-y-1" style={{ color: 'var(--ta-muted)' }}>
                  <li>Mon–Fri: 08:00–20:00</li>
                  <li>Sat–Sun: 09:00–21:00</li>
                </ul>
              </div>
            </section>

            {/* Map + Nearby CTA */}
            <section className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-3">
                <div className="w-full h-56 md:h-64 rounded-lg overflow-hidden" style={{ background: '#f5f5f4', border: '1px solid var(--ta-border)' }}>
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
              <div className="md:col-span-2 rounded-lg bg-white p-4" style={{ border: '1px solid var(--ta-border)' }}>
                <div className="font-semibold" style={{ color: 'var(--ta-text)' }}>{currentLanguage==='th'?'สถานที่ใกล้เคียง':'Places nearby'}</div>
                <p className="text-sm mt-1" style={{ color: 'var(--ta-muted)' }}>{currentLanguage==='th'?'ร้านอาหาร คาเฟ่ และแหล่งท่องเที่ยวรอบ ๆ รีสอร์ต':'Restaurants, cafes, and attractions around the resort.'}</p>
                <Link href="/travel/places?category=Nearby" className="mt-3 inline-flex px-3 py-2 rounded text-sm" style={{ background: 'var(--ta-primary)', color: 'var(--ta-on-primary)' }}>{currentLanguage==='th'?'สำรวจสถานที่ใกล้เคียง':'Explore nearby'}</Link>
              </div>
            </section>

            {/* Facilities */}
            <section>
              <div className="font-semibold mb-2" style={{ color: 'var(--ta-text)' }}>{currentLanguage==='th'?'สิ่งอำนวยความสะดวก & บริการ':'Facilities & Services'}</div>
              <div className="flex flex-wrap gap-2">
                {["Pool","Spa","Gym","Restaurant","Bar","Shuttle","Kids Club","Beach Access"].map((f) => (
                  <span key={f} className="px-3 py-1.5 text-sm rounded-full" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--ta-text)' }}>{f}</span>
                ))}
              </div>
            </section>
          </div>
        </section>

        {!embedded && (
          <>
            <div className="w-px cursor-col-resize transition-all duration-200" style={{ background: 'var(--ta-border)' }} onMouseDown={() => setIsResizing(true)} />

            <aside className="backdrop-blur-sm" style={{ width: `${chatWidth}px`, borderLeft: '1px solid var(--ta-border)', background: 'var(--ta-panel-from)' }}>
              <div className="h-full flex flex-col">
                <div className="flex-1 min-h-0">
                  <EventProvider>
                    <ChatInterface sessionId={`crypto.randomUUID()`} activeChannel={"normal"} onChannelSwitch={()=>{}} isProcessing={false} />
                  </EventProvider>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>
    </main>
  );
}


