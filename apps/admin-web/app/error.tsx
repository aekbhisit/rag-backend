"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-xl w-full border rounded-lg p-6 bg-white">
        <h1 className="text-xl font-semibold">Error</h1>
        <p className="text-gray-600 mt-2">{error?.message || String(error)}</p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => reset()} className="h-9 px-4 rounded bg-black text-white">Try again</button>
          <a href="/admin" className="h-9 px-4 rounded border">Dashboard</a>
        </div>
        <p className="text-gray-500 mt-2 text-xs">TH: เกิดข้อผิดพลาด ลองใหม่อีกครั้ง หรือกลับหน้า Dashboard</p>
      </div>
    </div>
  );
}


