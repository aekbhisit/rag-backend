import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const appRoot = process.cwd();
    const travelDir = path.join(appRoot, "apps", "travel-ai-bot", "src", "app", "travel");

    const entries = fs.readdirSync(travelDir, { withFileTypes: true });
    const pages: { slug: string; title: string; path: string }[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const slug = entry.name;
      const pagePath = path.join(travelDir, slug, "page.tsx");
      if (fs.existsSync(pagePath)) {
        const title = slug
          .split("-")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");
        pages.push({ slug, title, path: `/travel/${slug}` });
      }
    }

    return NextResponse.json({ pages });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to enumerate travel pages" }, { status: 500 });
  }
}


