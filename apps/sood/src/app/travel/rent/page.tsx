"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";

type Vehicle = { id: string; type: string; seats?: number; transmission?: string; pricePerDay: string };

export default function RentPage() {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!isResizing) return; setChatWidth(Math.max(320, Math.min(720, window.innerWidth - e.clientX))); };
    const onUp = () => setIsResizing(false);
    if (isResizing) { document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isResizing]);

  const vehicles: Vehicle[] = [
    { id: 'eco', type: 'Economy Car', seats: 4, transmission: 'Auto', pricePerDay: '฿900' },
    { id: 'suv', type: 'SUV', seats: 5, transmission: 'Auto', pricePerDay: '฿1,600' },
    { id: 'van', type: 'Van', seats: 9, transmission: 'Auto', pricePerDay: '฿2,200' },
    { id: 'bike', type: 'Motorbike 125cc', transmission: 'Auto', pricePerDay: '฿250' },
    { id: 'scooter', type: 'Scooter 150cc', transmission: 'Auto', pricePerDay: '฿350' },
  ];

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
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white">{currentLanguage==='th'?'เช่ารถ/มอเตอร์ไซค์':'Car & Motorbike Rent'}</span>
                </li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'เลือกรถที่ต้องการ':'Choose your vehicle'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'แสดงเป็นตารางพร้อมประเภทและราคา':'Shown as a grid with vehicle type and daily price.'}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {vehicles.map(v => (
                <div key={v.id} className="border border-stone-200 rounded-lg bg-white overflow-hidden">
                  <div className="h-32 bg-stone-100" />
                  <div className="p-4">
                    <div className="font-semibold text-stone-900">{v.type}</div>
                    <div className="mt-1 text-sm text-stone-700">
                      {v.seats ? <span className="mr-3">{v.seats} {currentLanguage==='th'?'ที่นั่ง':'seats'}</span> : null}
                      {v.transmission ? <span>{v.transmission}</span> : null}
                    </div>
                    <div className="mt-2 text-emerald-700 font-semibold">{v.pricePerDay} / {currentLanguage==='th'?'วัน':'day'}</div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-sm">{currentLanguage==='th'?'จอง':'Reserve'}</button>
                      <button className="px-3 py-1.5 rounded border border-stone-300 hover:border-emerald-400 text-sm">{currentLanguage==='th'?'รายละเอียด':'Details'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="w-1 bg-stone-300 hover:bg-emerald-400 cursor-col-resize" onMouseDown={() => setIsResizing(true)} />

        <aside className="bg-white border-l border-stone-200" style={{ width: `${chatWidth}px` }}>
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <ChatInterface sessionId={`sess_${Date.now()}`} activeChannel={"normal"} onChannelSwitch={()=>{}} isProcessing={false} />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}


