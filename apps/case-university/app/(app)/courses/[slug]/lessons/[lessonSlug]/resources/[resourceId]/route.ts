import {
  NextResponse,
} from "next/server";

import type {
  NextRequest,
} from "next/server";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";

import {
  createAuthorizedUniversityLessonResourceDownload,
} from "@/lib/university/lesson-resources";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type LessonResourceDownloadRouteContext = {
  params: Promise<{
    slug: string;
    lessonSlug: string;
    resourceId: string;
  }>;
};

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function GET(
  request: NextRequest,
  context: LessonResourceDownloadRouteContext,
) {
  const {
    slug,
    lessonSlug,
    resourceId,
  } = await context.params;

  /*
   * Require an authenticated Supabase user before invoking the
   * service-role-backed download authorization layer.
   */
  const supabase =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const signInUrl =
      new URL(
        "/auth/signin",
        request.url,
      );

    signInUrl.searchParams.set(
      "redirect",
      request.nextUrl.pathname,
    );

    return NextResponse.redirect(
      signInUrl,
      {
        headers: noStoreHeaders(),
      },
    );
  }

  /*
   * Reject malformed resource identifiers before touching the
   * resource table. Resource ids are UUID primary keys.
   */
  if (!isUuid(resourceId)) {
    return new NextResponse(
      "Not Found",
      {
        status: 404,
        headers: noStoreHeaders(),
      },
    );
  }

  const download =
    await createAuthorizedUniversityLessonResourceDownload({
      courseSlug: slug,
      lessonSlug,
      resourceId,
    });

  /*
   * The trusted resource layer returns null for inaccessible,
   * unpublished, mismatched, or otherwise unauthorized resources.
   * Use 404 so callers cannot distinguish existence from access.
   */
  if (!download) {
    return new NextResponse(
      "Not Found",
      {
        status: 404,
        headers: noStoreHeaders(),
      },
    );
  }

  return NextResponse.redirect(
    download.signedUrl,
    {
      status: 307,
      headers: noStoreHeaders(),
    },
  );
}
