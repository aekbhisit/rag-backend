"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";

export default function ToursPage() {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  
  type Tour = {
    id: string;
    title: string;
    price: string;
    duration: string;
    highlights: string[];
    gallery: string[];
    description?: string;
    itinerary?: string[];
    inclusions?: string[];
    exclusions?: string[];
  };
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

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
        <section id="ta-tours-panel" className="flex-1 bg-white flex flex-col min-h-0" style={{ width: `calc(100% - ${chatWidth}px)` }}>
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
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white">{currentLanguage==='th'?'ทัวร์':'Tours'}</span>
                </li>
              </ol>
            </nav>
          </div>

          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'ทัวร์ & แพคเกจ':'Tours & Packages'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'เรียกดูทัวร์พร้อมราคาและไฮไลท์':'Browse tours with price, duration and highlights'}</p>
          </div>

          {/* Filters */}
          <div id="ta-tours-filters" className="px-6 py-4 border-b border-stone-200 bg-white grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
            {/* Category */}
            <div className="relative w-full h-12 rounded-lg border border-stone-300 bg-white focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 hover:bg-stone-50">
              <span className="absolute top-0.5 left-3 px-1 text-[10px] font-medium text-stone-600 bg-white">{currentLanguage==='th'?'หมวดหมู่':'Category'}</span>
              <select className="absolute inset-0 w-full h-full appearance-none bg-transparent px-3 pr-10 pt-4 text-sm text-stone-900">
                <option className="bg-white text-stone-900">{currentLanguage==='th'?'ทุกหมวดหมู่':'All categories'}</option>
                <option className="bg-white text-stone-900">City</option>
                <option className="bg-white text-stone-900">Nature</option>
                <option className="bg-white text-stone-900">Food</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {/* Price */}
            <div className="relative w-full h-12 rounded-lg border border-stone-300 bg-white focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 hover:bg-stone-50">
              <span className="absolute top-0.5 left-3 px-1 text-[10px] font-medium text-stone-600 bg-white">{currentLanguage==='th'?'ราคา':'Price'}</span>
              <select className="absolute inset-0 w-full h-full appearance-none bg-transparent px-3 pr-10 pt-4 text-sm text-stone-900">
                <option className="bg-white text-stone-900">{currentLanguage==='th'?'ทุกช่วงราคา':'All prices'}</option>
                <option className="bg-white text-stone-900">$</option>
                <option className="bg-white text-stone-900">$$</option>
                <option className="bg-white text-stone-900">$$$</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {/* Duration */}
            <div className="relative w-full h-12 rounded-lg border border-stone-300 bg-white focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 hover:bg-stone-50">
              <span className="absolute top-0.5 left-3 px-1 text-[10px] font-medium text-stone-600 bg-white">{currentLanguage==='th'?'ระยะเวลา':'Duration'}</span>
              <select className="absolute inset-0 w-full h-full appearance-none bg-transparent px-3 pr-10 pt-4 text-sm text-stone-900">
                <option className="bg-white text-stone-900">{currentLanguage==='th'?'ทุกระยะเวลา':'All durations'}</option>
                <option className="bg-white text-stone-900">Half-day</option>
                <option className="bg-white text-stone-900">Full-day</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {/* Search */}
            <input className="h-12 px-3 rounded-lg border border-stone-300 bg-white text-stone-900 placeholder-stone-500" placeholder={currentLanguage==='th'?'ค้นหา':'Search'} />
          </div>

          {/* Results / Detail Switch */}
          {selectedTour ? (
            <div id="ta-tour-detail" className="flex-1 min-h-0 overflow-y-auto p-6">
              {/* Header with back and pricing */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-stone-900 truncate">{selectedTour.title}</h2>
                <button onClick={() => setSelectedTour(null)} className="h-9 px-3 rounded-md border border-stone-300 bg-white text-stone-800 hover:border-emerald-400 text-sm">{currentLanguage==='th'?'ย้อนกลับ':'Back'}</button>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: gallery and description */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="relative w-full h-64 md:h-80 bg-stone-100 rounded-lg border border-stone-200 overflow-hidden">
                    {/* gallery placeholder */}
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-600 text-white text-sm">{selectedTour.price}</span>
                    <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/95 text-stone-900 text-sm ring-1 ring-stone-200">{selectedTour.duration}</span>
                  </div>

                  {selectedTour.highlights?.length ? (
                    <div className="border border-stone-200 rounded-lg bg-white p-4">
                      <div className="text-stone-900 font-semibold mb-2">{currentLanguage==='th'?'ไฮไลท์':'Highlights'}</div>
                      <ul className="list-disc pl-5 text-stone-800 text-sm space-y-1">
                        {selectedTour.highlights.map((h, idx) => (<li key={idx}>{h}</li>))}
                      </ul>
                    </div>
                  ) : null}

                  {selectedTour.itinerary?.length ? (
                    <div className="border border-stone-200 rounded-lg bg-white p-4">
                      <div className="text-stone-900 font-semibold mb-2">{currentLanguage==='th'?'กำหนดการ':'Itinerary'}</div>
                      <ol className="list-decimal pl-5 text-stone-800 text-sm space-y-1">
                        {selectedTour.itinerary.map((s, idx) => (<li key={idx}>{s}</li>))}
                      </ol>
                    </div>
                  ) : null}
                </div>

                {/* Right: booking summary card */}
                <aside className="space-y-4">
                  <div className="border border-stone-200 rounded-lg bg-white p-4">
                    <div className="text-stone-900 font-semibold">{currentLanguage==='th'?'สรุปแพ็กเกจ':'Package Summary'}</div>
                    <div className="mt-2 text-stone-800 text-sm">
                      <div className="flex items-center justify-between"><span>{currentLanguage==='th'?'ราคา':'Price'}</span><span className="font-semibold text-emerald-700">{selectedTour.price}</span></div>
                      <div className="flex items-center justify-between mt-1"><span>{currentLanguage==='th'?'ระยะเวลา':'Duration'}</span><span className="font-medium">{selectedTour.duration}</span></div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="font-medium text-stone-900">{currentLanguage==='th'?'รวม':'Inclusions'}</div>
                        <ul className="list-disc pl-4 text-stone-700 space-y-0.5">
                          {(selectedTour.inclusions || ['Guide','Transport']).map((s, idx) => (<li key={idx}>{s}</li>))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-stone-900">{currentLanguage==='th'?'ไม่รวม':'Exclusions'}</div>
                        <ul className="list-disc pl-4 text-stone-700 space-y-0.5">
                          {(selectedTour.exclusions || ['Meals','Tips']).map((s, idx) => (<li key={idx}>{s}</li>))}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className="flex-1 h-10 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">{currentLanguage==='th'?'จอง':'Book'}</button>
                      <button className="h-10 px-4 rounded-md border border-stone-300 bg-white text-stone-800 hover:border-emerald-400">{currentLanguage==='th'?'ติดต่อ':'Contact'}</button>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          ) : (
            <div id="ta-tours-grid" className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} id="ta-tour-card" className="border border-stone-200 rounded-lg bg-white overflow-hidden cursor-pointer hover:border-emerald-300 hover:shadow" onClick={() => setSelectedTour({
                  id: String(i),
                  title: currentLanguage==='th'?`ทัวร์ตัวอย่าง #${i}`:`Sample Tour #${i}`,
                  price: '$99',
                  duration: currentLanguage==='th'?'1 วัน':'1 day',
                  highlights: ['Highlight A','Highlight B','Highlight C'],
                  gallery: []
                })}>
                  <div className="relative h-40 bg-stone-100" id="ta-tour-gallery">
                    <span className="absolute top-2 right-2 px-2 py-1 rounded bg-emerald-600 text-white text-xs">$99</span>
                    <span className="absolute bottom-2 left-2 px-2 py-1 rounded bg-white/90 text-stone-900 text-xs">{currentLanguage==='th'?'1 วัน':'1 day'}</span>
                  </div>
                  <div className="p-4 text-sm">
                    <div id="ta-tour-title" className="text-base font-semibold text-stone-900">{currentLanguage==='th'?`ทัวร์ตัวอย่าง #${i}`:`Sample Tour #${i}`}</div>
                    <ul id="ta-tour-highlights" className="mt-2 list-disc pl-5 text-stone-700">
                      <li>Highlight A</li>
                      <li>Highlight B</li>
                    </ul>
                    <div id="ta-tour-cta" className="mt-3 flex gap-2">
                      <button className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700" onClick={(e) => { e.stopPropagation(); setSelectedTour({
                        id: String(i), title: currentLanguage==='th'?`ทัวร์ตัวอย่าง #${i}`:`Sample Tour #${i}`,
                        price: '$99', duration: currentLanguage==='th'?'1 วัน':'1 day', highlights: ['Highlight A','Highlight B'], gallery: []
                      }); }}>{currentLanguage==='th'?'ดูรายละเอียด':'View details'}</button>
                      <button className="px-3 py-1.5 rounded border border-stone-300 hover:border-emerald-400" onClick={(e)=> e.stopPropagation()}>{currentLanguage==='th'?'ติดต่อ':'Contact'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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


