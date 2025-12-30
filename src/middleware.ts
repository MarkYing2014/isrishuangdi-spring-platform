import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const ua = request.headers.get('user-agent') || '';

    // Skip bots/crawlers to save Edge Middleware invocations
    if (/bot|crawler|spider|crawling|googlebot|bingbot|duckduckbot|yandex|slurp|baidu/i.test(ua)) {
        return NextResponse.next();
    }

    // Skip if it's not a page request or specifically excluded
    if (
        pathname.includes("_next") ||
        pathname.includes("api") ||
        pathname.includes("favicon.ico") ||
        pathname.includes("logo.png") ||
        pathname.includes("images")
    ) {
        return NextResponse.next();
    }


    // Check if lang cookie already exists
    const langCookie = request.cookies.get("lang");

    if (!langCookie) {
        // Detect preferred language from Accept-Language header
        const acceptLanguage = request.headers.get("accept-language") || "";
        const preferredLang = acceptLanguage.split(",")[0].toLowerCase();

        // Default to 'en', but set to 'zh' if Preferred is Chinese
        const lang = preferredLang.startsWith("zh") ? "zh" : "en";

        const response = NextResponse.next();

        // Set cookie for subsequent requests with path=/
        response.cookies.set("lang", lang, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365, // 1 year
        });

        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|json|txt|xml|woff|woff2|ttf|otf)).*)',
    ],
}
