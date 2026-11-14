import { NextResponse } from "next/server";
import { stagingIndexHeaders } from "@/lib/staging-index";
export const dynamic = "force-dynamic";
export function GET() {
  const noindex = Boolean(stagingIndexHeaders()["X-Robots-Tag"]);
  return new NextResponse(
    `User-agent: *\n${noindex ? "Disallow: /" : "Allow: /"}\n`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
