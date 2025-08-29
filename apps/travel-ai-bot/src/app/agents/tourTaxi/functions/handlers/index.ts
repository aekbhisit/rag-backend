export async function tourTaxiKnowledgeSearchHandler(args: any) {
  try {
    const { searchQuery, maxResults } = args || {};
    const tenantId = (typeof process !== "undefined" ? (process as any)?.env?.RAG_TENANT_ID : "") || "";
    const res = await fetch("/api/rag/summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": tenantId,
      } as any,
      body: JSON.stringify({ query: searchQuery, max_results: maxResults, category: "tours-taxi" }),
    });
    const data = await res.json().catch(() => ({}));
    const results = (data?.results as any[]) || (data?.data as any[]) || [];
    return {
      success: true,
      searchQuery,
      results: Array.isArray(results) ? results.slice(0, maxResults || 5) : [],
      totalResults: Array.isArray(results) ? results.length : 0,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "RAG summary search error" };
  }
}


