export async function placeGuideKnowledgeSearchHandler(args: any) {
  console.log(`[PlaceGuide] 🔍 Knowledge search called with args:`, JSON.stringify(args, null, 2));
  try {
    const { searchQuery, maxResults, category: categoryArg, lat: latArg, long: longArg, maxDistanceKm } = args || {};

    const q = String(searchQuery || '').toLowerCase();
    let inferredCategory = String(categoryArg || '').trim();
    if (!inferredCategory) {
      if (/\b(cafe|coffee)\b|คาเฟ|กาแฟ/.test(q)) inferredCategory = 'Cafe';
      else if (/restaurant|อาหาร|กินข้าว/.test(q)) inferredCategory = 'Restaurant';
      else if (/attraction|สถานที่ท่องเที่ยว|เที่ยว/.test(q)) inferredCategory = 'Attraction';
    }

    const getCoords = async (): Promise<{ lat: number; long: number }> => {
      const fallback = { lat: 13.7563, long: 100.5018 };
      try {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return fallback;
        const pos: GeolocationPosition = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('geolocation-timeout')), 3000);
          navigator.geolocation.getCurrentPosition(
            (p) => { clearTimeout(timer); resolve(p); },
            (err) => { clearTimeout(timer); reject(err); },
            { enableHighAccuracy: false, maximumAge: 120000, timeout: 2500 }
          );
        });
        return { lat: pos.coords.latitude, long: pos.coords.longitude };
      } catch {
        return fallback;
      }
    };

    const coords = (typeof latArg === 'number' && typeof longArg === 'number')
      ? { lat: latArg, long: longArg }
      : await getCoords();

    const body = {
      conversation_history: "",
      text_query: searchQuery || "",
      simantic_query: "",
      intent_scope: "",
      intent_action: "",
      category: inferredCategory,
      lat: coords.lat,
      long: coords.long,
      max_distance_km: typeof maxDistanceKm === 'number' ? maxDistanceKm : 5,
      distance_weight: 1,
      top_k: typeof maxResults === 'number' ? maxResults : 3,
      min_score: 0.5,
      fulltext_weight: 0.5,
      semantic_weight: 0.5,
      prompt_key: "",
      prompt_params: null as any,
    };
    const tenantId = (typeof process !== 'undefined' ? (process as any)?.env?.RAG_TENANT_ID : '') || '';
    console.log(`[PlaceGuide] 🌐 Calling /api/rag/place with:`, { 
      query: searchQuery, 
      category: inferredCategory, 
      coords: coords,
      maxResults: body.top_k 
    });
    const res = await fetch("/api/rag/place", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-tenant-id": tenantId } as any,
      body: JSON.stringify(body),
    });
    console.log(`[PlaceGuide] 📡 RAG API response status: ${res.status}`);
    const data = await res.json().catch(() => ({}));
    console.log(`[PlaceGuide] 📥 RAG API response data:`, {
      hasResults: !!data?.results?.length || !!data?.places?.length,
      resultCount: (data?.results?.length || data?.places?.length || 0),
      hasAnswer: !!data?.answer,
      answerStatus: data?.answer_status
    });
    const results = (data?.results as any[]) || (data?.places as any[]) || (data?.data as any[]) || [];
    const sliced = Array.isArray(results) ? results.slice(0, body.top_k) : [];
    
    const returnValue = {
      success: true,
      searchQuery,
      results: sliced,
      totalResults: Array.isArray(results) ? results.length : 0,
      found: sliced.length > 0,
      searchArea: `${coords.lat}, ${coords.long}`,
      maxDistance: body.max_distance_km,
      category: inferredCategory,
    };
    console.log(`[PlaceGuide] 🎯 Returning result:`, {
      success: returnValue.success,
      found: returnValue.found,
      resultCount: returnValue.totalResults,
      searchQuery: returnValue.searchQuery,
      category: returnValue.category
    });
    return returnValue;
  } catch (e: any) {
    return {
      success: false,
      searchQuery: (args || {}).searchQuery,
      results: [],
      totalResults: 0,
      found: false,
      error: e?.message || "RAG place search error",
    };
  }
}


