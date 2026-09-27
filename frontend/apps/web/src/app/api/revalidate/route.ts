import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { verifyRevalidation } from "@/lib/revalidate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API → web cache invalidation (PLAN §7). The API calls this on every web colour
 * (blue and green) after a content change. Server-to-server only: nginx doesn't
 * need to expose it, and without a valid HMAC it answers 401 with no detail.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > 16_384) return new NextResponse(null, { status: 413 });
  const check = verifyRevalidation(
    body,
    {
      timestamp: req.headers.get("x-revalidate-timestamp"),
      signature: req.headers.get("x-revalidate-signature"),
    },
    process.env.REVALIDATE_SECRET,
  );
  if (!check.ok) return new NextResponse(null, { status: check.status });

  if (check.tags.includes("all")) {
    revalidatePath("/", "layout");
  } else {
    // expire: 0 → the next request re-fetches instead of serving stale-while-revalidate.
    for (const tag of check.tags) revalidateTag(tag, { expire: 0 });
  }
  return NextResponse.json({ revalidated: check.tags });
}
