"use client";

import React, { useEffect, useState } from "react";
import { getApiUrl } from '@/app/lib/apiHelper';
import Link from "next/link";
import ChatInterface from "@/app/components/chat/ChatInterface";
import { EventProvider } from "@/app/contexts/EventContext";

export default function NotificationsPage() {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'th'>('en');
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(typeof window!=='undefined' && 'Notification' in window ? Notification.permission : 'unsupported');

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const res = await Notification.requestPermission();
    setPermission(res);
  };

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
            <button onClick={()=>setCurrentLanguage('en')} className={`px-3 py-2 rounded-md border text-sm ${currentLanguage==='en'?'bg-gradient-to-r from-orange-700 to-red-800 text-white border-orange-600':'bg-white text-orange-900 border-orange-300 hover:border-orange-500'}`}>🇺🇸 EN</button>
            <button onClick={()=>setCurrentLanguage('th')} className={`px-3 py-2 rounded-md border text-sm ${currentLanguage==='th'?'bg-gradient-to-r from-orange-700 to-red-800 text-white border-orange-600':'bg-white text-orange-900 border-orange-300 hover:border-orange-500'}`}>🇹🇭 TH</button>
          </div>
        </div>
      </div>

      <div className="flex" style={{height:'calc(100vh - 80px)'}}>
        <section id="ta-notify-panel" className="flex-1 bg-white flex flex-col min-h-0" style={{ width: `calc(100% - ${chatWidth}px)` }}>
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
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-gradient-to-r from-orange-700 to-red-800 text-white">{currentLanguage==='th'?'การแจ้งเตือน':'Notifications'}</span>
                </li>
              </ol>
            </nav>
          </div>
          <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-stone-900">{currentLanguage==='th'?'การแจ้งเตือน':'Notifications'}</h2>
            <p className="text-sm text-stone-600">{currentLanguage==='th'?'รับการแจ้งเตือนเกี่ยวกับการเดินทางอย่างเหมาะสม':'Receive helpful, non-intrusive travel alerts.'}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
            <div className="border border-stone-200 rounded-lg p-4 bg-white">
              <div className="font-medium text-stone-900">{currentLanguage==='th'?'สถานะสิทธิ์':'Permission status'}: <span className="text-stone-700">{permission}</span></div>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={requestPermission} className="px-3 py-2 rounded bg-gradient-to-r from-orange-700 to-red-800 text-white hover:from-orange-800 hover:to-red-900" disabled={permission==='granted' || permission==='unsupported'}>
                  {currentLanguage==='th'?'เปิดใช้งานการแจ้งเตือน':'Enable notifications'}
                </button>
                {permission==='unsupported' && (
                  <span className="text-sm text-stone-600">{currentLanguage==='th'?'เบราว์เซอร์ไม่รองรับ':'Browser not supported'}</span>
                )}
              </div>
            </div>

            <div className="border border-stone-200 rounded-lg p-4 bg-white">
              <div className="font-medium text-stone-900 mb-2">{currentLanguage==='th'?'ชั่วโมงเงียบ':'Quiet hours'}</div>
              <div className="text-sm text-stone-600">{currentLanguage==='th'?'ตั้งค่าช่วงเวลาที่ไม่แจ้งเตือน':'Configure times when alerts are paused'}</div>
            </div>
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


