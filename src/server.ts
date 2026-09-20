import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

import { Redis } from "@upstash/redis";

const DEFAULT_DOMAIN = "https://india-got-latent-8j5.pages.dev/";

let redisClient: Redis | null = null;
let cachedGlobalDomain = "";
let lastRedisFetchTime = 0;

function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  try {
    const env = process.env;
    const url =
      env["STORAGE_KV_REST_API_URL"] ||
      env["KV_REST_API_URL"] ||
      env["UPSTASH_REDIS_REST_URL"] ||
      env["STORAGE_REST_API_URL"] ||
      env["STORAGE_URL"] ||
      env["REDIS_URL"] ||
      "";
    const token =
      env["STORAGE_KV_REST_API_TOKEN"] ||
      env["KV_REST_API_TOKEN"] ||
      env["UPSTASH_REDIS_REST_TOKEN"] ||
      env["STORAGE_REST_API_TOKEN"] ||
      env["STORAGE_TOKEN"] ||
      env["REDIS_TOKEN"] ||
      "";

    if (url && token) {
      redisClient = new Redis({ url, token });
      return redisClient;
    }

    if (url && url.startsWith("http")) {
      redisClient = new Redis({ url, token: token || "default" });
      return redisClient;
    }

    redisClient = Redis.fromEnv();
    return redisClient;
  } catch {
    return null;
  }
}

function cleanDomain(raw: string): string {
  let domain = raw.trim();
  if (domain.includes("/api/update=")) {
    domain = domain.split("/api/update=")[1]?.trim() || domain;
  } else if (domain.includes("update=")) {
    domain = domain.split("update=")[1]?.trim() || domain;
  }
  if (!domain.startsWith("http://") && !domain.startsWith("https://")) {
    domain = "https://" + domain;
  }
  if (!domain.endsWith("/")) {
    domain += "/";
  }
  return domain;
}

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}

async function getActiveProxyDomain(request?: Request): Promise<string> {
  if (request) {
    try {
      const url = new URL(request.url);
      const qDomain =
        url.searchParams.get("proxy_domain") ||
        url.searchParams.get("target_domain") ||
        url.searchParams.get("target");
      if (qDomain) {
        return cleanDomain(qDomain);
      }
    } catch {}

    const headerDomain = request.headers.get("x-proxy-domain");
    if (headerDomain) {
      return cleanDomain(headerDomain);
    }
  }

  const now = Date.now();
  if (cachedGlobalDomain && now - lastRedisFetchTime < 5000) {
    return cachedGlobalDomain;
  }

  const redis = getRedis();
  if (redis) {
    try {
      const val = await redis.get<string>("active_proxy_domain");
      if (val && typeof val === "string" && val.trim()) {
        const clean = cleanDomain(val);
        cachedGlobalDomain = clean;
        lastRedisFetchTime = now;
        (globalThis as any).__ACTIVE_PROXY_DOMAIN__ = clean;
        return clean;
      }
    } catch (err) {
      console.warn("Vercel Redis fetch error:", err);
    }
  }

  if ((globalThis as any).__ACTIVE_PROXY_DOMAIN__) {
    return cleanDomain((globalThis as any).__ACTIVE_PROXY_DOMAIN__);
  }

  if (request) {
    const cookieDomain = parseCookie(request.headers.get("cookie"), "active_proxy_domain");
    if (cookieDomain) {
      return cleanDomain(cookieDomain);
    }
  }

  return DEFAULT_DOMAIN;
}

async function setActiveProxyDomain(newDomain: string): Promise<string> {
  const clean = cleanDomain(newDomain);
  cachedGlobalDomain = clean;
  lastRedisFetchTime = Date.now();
  (globalThis as any).__ACTIVE_PROXY_DOMAIN__ = clean;

  const redis = getRedis();
  if (redis) {
    try {
      await redis.set("active_proxy_domain", clean);
    } catch (err) {
      console.warn("Vercel Redis set error:", err);
    }
  }
  return clean;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // Handle /api/update endpoint for updating the proxy domain dynamically
      if (
        url.pathname === "/api/update" ||
        url.pathname.includes("/api/update=") ||
        request.url.includes("/api/update=")
      ) {
        let targetDomain = "";
        if (request.url.includes("/api/update=")) {
          const parts = request.url.split("/api/update=");
          const val = parts[1] || "";
          const firstPart = val.split("&")[0] || "";
          targetDomain = decodeURIComponent(firstPart.split("?")[0] || "");
        } else {
          targetDomain =
            url.searchParams.get("url") ||
            url.searchParams.get("domain") ||
            url.searchParams.get("target") ||
            "";
        }

        if (targetDomain) {
          const updated = await setActiveProxyDomain(targetDomain);
          const cookieHeader = `active_proxy_domain=${encodeURIComponent(updated)}; Path=/; Max-Age=31536000; SameSite=Lax`;
          // If accept header favors HTML (browser view), return interactive HTML matching Download Episode popup design
          const acceptHeader = request.headers.get("accept") || "";
          if (acceptHeader.includes("text/html")) {
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proxy Domain Updated — India's Got Latent</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 1.5rem;
      min-height: 100vh;
      background-color: #070709;
      color: #f4f4f5;
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .modal-card {
      width: 100%;
      max-width: 440px;
      background: #0d0d12;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 1.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
      animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalPop {
      from { opacity: 0; transform: scale(0.94); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }
    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .modal-title-icon {
      width: 22px;
      height: 22px;
      color: #ffffff;
    }
    .modal-title-text {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 1.65rem;
      letter-spacing: 0.05em;
      color: #ffffff;
      line-height: 1;
      text-transform: uppercase;
    }
    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: #a1a1aa;
      display: grid;
      place-items: center;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .close-btn:hover { background: rgba(255, 255, 255, 0.18); color: #ffffff; }

    .hero-banner {
      position: relative;
      width: 100%;
      height: 160px;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 1.25rem;
      background: linear-gradient(135deg, #18181b 0%, #09090b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
    }
    .hero-banner img {
      max-width: 85%;
      max-height: 110px;
      object-fit: contain;
      filter: drop-shadow(0 10px 20px rgba(0,0,0,0.6));
    }

    .success-msg {
      font-size: 0.95rem;
      font-weight: 700;
      color: #4ade80;
      line-height: 1.4;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .proxy-url-box {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 0.85rem 1rem;
      margin-bottom: 1.25rem;
    }
    .proxy-url-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #71717a;
      text-transform: uppercase;
      margin-bottom: 0.3rem;
    }
    .proxy-url-val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      font-weight: 700;
      color: #ffffff;
      word-break: break-all;
    }

    .primary-btn {
      width: 100%;
      height: 48px;
      background: #ffffff;
      color: #000000;
      font-family: 'Manrope', sans-serif;
      font-size: 0.95rem;
      font-weight: 700;
      border-radius: 12px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      text-decoration: none;
      box-shadow: 0 10px 25px -5px rgba(255, 255, 255, 0.25);
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .primary-btn:hover {
      filter: brightness(1.1);
      transform: scale(1.01);
    }
    .primary-btn:active {
      transform: scale(0.97);
    }
  </style>
</head>
<body>
  <div class="modal-backdrop">
    <div class="modal-card">
      <div class="modal-header">
        <div class="modal-title-group">
          <svg class="modal-title-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span class="modal-title-text">PROXY DOMAIN UPDATED</span>
        </div>
        <a href="/" class="close-btn" aria-label="Close">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </a>
      </div>

      <div class="hero-banner">
        <img src="https://www.osaidsecure.com/assets/indias-got-latent-logo-BoyBEZ0p.webp" alt="India's Got Latent" onerror="this.src='/assets/logo/indias-got-latent-logo.webp'">
      </div>

      <div class="success-msg">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Proxy domain updated successfully!
      </div>

      <div class="proxy-url-box">
        <div class="proxy-url-label">New Proxy URL</div>
        <div class="proxy-url-val">${updated}</div>
      </div>

      <a href="/" class="primary-btn">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Return to Home Page
      </a>
    </div>
  </div>

  <script>
    try {
      localStorage.setItem('active_proxy_domain', ${JSON.stringify(updated)});
      document.cookie = ${JSON.stringify(`active_proxy_domain=${encodeURIComponent(updated)}; Path=/; Max-Age=31536000; SameSite=Lax`)};
    } catch(e){}
  </script>
</body>
</html>`;
            return new Response(html, {
              status: 200,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Set-Cookie": cookieHeader,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-store",
              },
            });
          }

          return new Response(
            JSON.stringify({
              status: "success",
              message: "Proxy domain updated successfully across feed, scraper, images, and video stream",
              activeDomain: updated,
              feedUrl: `${updated}okcdn.json`,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Set-Cookie": cookieHeader,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-store",
              },
            },
          );
        }

        const activeDomain = await getActiveProxyDomain(request);
        return new Response(
          JSON.stringify({
            status: "info",
            activeDomain,
            feedUrl: `${activeDomain}okcdn.json`,
            usage:
              "To update domain, visit /api/update=https://new-domain.pages.dev/ or /api/update?domain=https://new-domain.pages.dev/",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          },
        );
      }

      if (url.pathname === "/api/active-domain" || url.pathname === "/api/domain") {
        const activeDomain = await getActiveProxyDomain(request);
        return new Response(
          JSON.stringify({
            status: "success",
            activeDomain,
            feedUrl: `${activeDomain}okcdn.json`,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          },
        );
      }

      if (url.pathname === "/api/feed") {
        try {
          const currentDomain = await getActiveProxyDomain(request);
          const feedRes = await fetch(`${currentDomain}okcdn.json`, {
            headers: {
              Referer: currentDomain,
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });
          const data = await feedRes.json();
          return new Response(JSON.stringify(data), {
            status: feedRes.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=60",
            },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      if (url.pathname === "/api/stream") {
        const epId = url.searchParams.get("id");
        if (!epId) {
          return new Response(JSON.stringify({ error: "Missing id parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const currentDomain = await getActiveProxyDomain(request);
          const targetApi = `https://okcdn.okcdn-api.workers.dev/?id=${encodeURIComponent(epId)}`;
          const streamRes = await fetch(targetApi, {
            method: "GET",
            headers: {
              Referer: currentDomain,
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });
          const data = await streamRes.json();
          return new Response(JSON.stringify(data), {
            status: streamRes.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=60",
            },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      if (url.pathname === "/api/download") {
        const targetUrl = url.searchParams.get("url");
        const filename = url.searchParams.get("filename") || "video.mp4";
        if (!targetUrl) {
          return new Response(JSON.stringify({ error: "Missing url parameter" }), { status: 400 });
        }
        try {
          const currentDomain = await getActiveProxyDomain(request);
          const videoRes = await fetch(targetUrl, {
            headers: {
              Referer: currentDomain,
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });
          const headers = new Headers();
          headers.set("Content-Type", videoRes.headers.get("Content-Type") || "video/mp4");
          headers.set("Content-Disposition", `attachment; filename="${filename}"`);
          const contentLength = videoRes.headers.get("Content-Length");
          if (contentLength) {
            headers.set("Content-Length", contentLength);
          }
          headers.set("Access-Control-Allow-Origin", "*");
          headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Disposition");
          return new Response(videoRes.body, {
            status: videoRes.status,
            headers,
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      const contentType = normalized.headers.get("content-type") || "";

      if (contentType.includes("text/html")) {
        const activeDomain = await getActiveProxyDomain(request);
        const html = await normalized.text();
        const injectedScript = `<script>window.__GLOBAL_ACTIVE_PROXY_DOMAIN__=${JSON.stringify(activeDomain)};</script>`;
        const injectedHtml = html.includes("<head>")
          ? html.replace("<head>", `<head>${injectedScript}`)
          : injectedScript + html;
        return new Response(injectedHtml, {
          status: normalized.status,
          statusText: normalized.statusText,
          headers: normalized.headers,
        });
      }

      return normalized;
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

