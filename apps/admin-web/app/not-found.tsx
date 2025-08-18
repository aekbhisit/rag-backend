export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-xl w-full border rounded-lg p-6 bg-white text-center">
        <h1 className="text-xl font-semibold">404 - Not Found</h1>
        <p className="text-gray-600 mt-2">The page you are looking for does not exist.</p>
        <p className="text-gray-500 mt-2 text-xs">TH: ไม่พบหน้าที่ต้องการ</p>
        <div className="mt-4">
          <a href="/admin" className="inline-block h-9 px-4 rounded bg-black text-white">Go to Dashboard</a>
        </div>
      </div>
    </div>
  );
}


