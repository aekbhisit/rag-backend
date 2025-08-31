"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";

export default function HelpPage() {
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
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white">{currentLanguage==='th'?'ช่วยเหลือ':'Help'}</span>
                </li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'ช่วยเหลือ & วิธีใช้งาน':'Help & Onboarding'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'คู่มือสั้น ๆ เกี่ยวกับการใช้งานและคำถามที่พบบ่อย':'Quick guide and FAQ to help you get started.'}</p>
          </div>

          <div id="ta-help-panel" className="flex-1 min-h-0 overflow-y-auto p-6">
            {/* FAQs – Accordion only */}
            <section>
              <h3 className="text-stone-900 font-semibold mb-3">{currentLanguage==='th'?'คำถามที่พบบ่อย':'Frequently asked questions'}</h3>
              <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg bg-white">
                {[{
                  q: currentLanguage==='th'? 'จะเริ่มต้นใช้อย่างไร?':'How do I get started?',
                  a: currentLanguage==='th'? 'เปิดหน้า Travel เลือกหมวดที่ต้องการ หรือค้นหาสถานที่ได้ทันที':'Open the Travel page, choose a section, or start searching for places.'
                },{
                  q: currentLanguage==='th'? 'ใช้ตัวกรองค้นหาอย่างไร?':'How do filters work?',
                  a: currentLanguage==='th'? 'กำหนดหมวด ระยะทาง เรตติ้ง และราคาเพื่อปรับผลลัพธ์':'Set category, distance, rating, and price to refine results.'
                },{
                  q: currentLanguage==='th'? 'ติดต่อรีสอร์ตได้อย่างไร?':'How can I contact the resort?',
                  a: currentLanguage==='th'? 'ไปที่หน้า Our Resort จะมีปุ่มโทร อีเมล และเว็บไซต์':'Go to Our Resort page for Call, Email, and Website buttons.'
                }].map((item, idx) => (
                  <details key={idx} className="group">
                    <summary className="flex items-start justify-between cursor-pointer select-none p-4 text-stone-900 font-medium group-open:bg-stone-50">
                      <span className="pr-4">{item.q}</span>
                      <svg className="w-4 h-4 mt-1 text-stone-500 group-open:rotate-180 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                    </summary>
                    <div className="p-4 pt-2 text-sm text-stone-700">{item.a}</div>
                  </details>
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


