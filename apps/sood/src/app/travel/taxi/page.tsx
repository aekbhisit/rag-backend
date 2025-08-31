"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";

export default function TaxiTransportPage() {
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
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white">{currentLanguage==='th'?'แท็กซี่ & การเดินทาง':'Taxi & Transportation'}</span>
                </li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'วิธีการเดินทาง':'How to get around'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'ข้อมูลแท็กซี่ แอปเรียกรถ ค่าบริการ และคำแนะนำความปลอดภัย':'Taxi, ride-hailing apps, fares, and safety tips'}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-stone-200 rounded-lg bg-white p-4">
                <div className="text-stone-900 font-semibold">{currentLanguage==='th'?'แท็กซี่มิเตอร์':'Metered Taxi'}</div>
                <ul className="mt-2 text-sm text-stone-700 list-disc pl-5 space-y-1">
                  <li>{currentLanguage==='th'?'เริ่มต้นประมาณ 35 บาท':'Start around 35 THB'}</li>
                  <li>{currentLanguage==='th'?'เปิดมิเตอร์ทุกครั้ง หากไม่เปิดควรปฏิเสธ':'Always use the meter; decline if refused'}</li>
                  <li>{currentLanguage==='th'?'เตรียมเงินสดย่อยสำหรับค่าทางด่วน/ทิป':'Carry small cash for tolls/tips'}</li>
                </ul>
              </div>
              <div className="border border-stone-200 rounded-lg bg-white p-4">
                <div className="text-stone-900 font-semibold">Ride‑hailing</div>
                <ul className="mt-2 text-sm text-stone-700 list-disc pl-5 space-y-1">
                  <li>Grab, Bolt {currentLanguage==='th'?'และบริการท้องถิ่น':'and local partners'}</li>
                  <li>{currentLanguage==='th'?'ดูราคาในแอปก่อนยืนยัน':'Check in-app fare before confirming'}</li>
                  <li>{currentLanguage==='th'?'แชร์ตำแหน่งกับเพื่อนเพื่อความปลอดภัย':'Share trip status for safety'}</li>
                </ul>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-stone-200 rounded-lg bg-white p-4">
                <div className="text-stone-900 font-semibold">{currentLanguage==='th'?'การขนส่งสาธารณะ':'Public Transport'}</div>
                <p className="mt-2 text-sm text-stone-700">BTS/MRT, Airport Rail Link, buses. {currentLanguage==='th'?'ใช้บัตรเติมเงินเพื่อความสะดวก':'Use stored-value cards for convenience'}.</p>
              </div>
              <div className="border border-stone-200 rounded-lg bg-white p-4">
                <div className="text-stone-900 font-semibold">{currentLanguage==='th'?'คำแนะนำความปลอดภัย':'Safety tips'}</div>
                <ul className="mt-2 text-sm text-stone-700 list-disc pl-5 space-y-1">
                  <li>{currentLanguage==='th'?'เช็กป้ายทะเบียนและชื่อคนขับก่อนขึ้น':'Verify plate and driver name'}</li>
                  <li>{currentLanguage==='th'?'อย่าแชร์ข้อมูลส่วนตัวกับคนขับ':'Avoid sharing personal info'}</li>
                  <li>{currentLanguage==='th'?'แจ้งปัญหาผ่านแอปหรือเบอร์ฉุกเฉิน':'Report issues via app or emergency numbers'}</li>
                </ul>
              </div>
            </section>
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


