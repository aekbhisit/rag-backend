"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ maxWidth: 640, width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', padding: 24 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
            <p style={{ color: '#64748b', marginTop: 8 }}>An unexpected error occurred. You can try again.</p>
            <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', background: '#f8fafc', padding: 12, borderRadius: 6, marginTop: 12 }}>
              {error?.message || String(error)}
            </pre>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => reset()} style={{ height: 36, padding: '0 14px', borderRadius: 6, background: 'black', color: 'white' }}>Try again</button>
              <a href="/admin" style={{ height: 36, padding: '8px 14px', borderRadius: 6, border: '1px solid #e2e8f0', color: '#0f172a', textDecoration: 'none' }}>Go to Dashboard</a>
            </div>
            <p style={{ color: '#64748b', marginTop: 8, fontSize: 12 }}>TH: เกิดข้อผิดพลาดไม่คาดคิด ลองใหม่อีกครั้งหรือกลับไปหน้า Dashboard</p>
          </div>
        </div>
      </body>
    </html>
  );
}


