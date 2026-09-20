const TARGET_WORKER_URL = "https://okcdn.okcdn-api.workers.dev";
const TARGET_REFERER = "https://iglatent.freeforall.dev/";
const TARGET_CATALOG_URL = "https://iglatent.freeforall.dev/okcdn.json";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const epId = url.searchParams.get("id");

    // Endpoint 1: Master Catalog
    if (path === "/okcdn.json" || path === "/catalog") {
      try {
        const catRes = await fetch(TARGET_CATALOG_URL);
        const catData = await catRes.text();
        return new Response(catData, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
            ...CORS_HEADERS,
          },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch catalog", message: err.message }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          },
        );
      }
    }

    // Endpoint 2: Stream URL Proxy
    if (epId || path === "/stream" || path === "/api/stream" || path === "/") {
      if (!epId) {
        return new Response(
          JSON.stringify(
            {
              status: "online",
              name: "India's Got Latent Stream Proxy",
              usage: `${url.origin}/?id=<stream_id>`,
            },
            null,
            2,
          ),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          },
        );
      }

      try {
        const targetApi = `${TARGET_WORKER_URL}/?id=${encodeURIComponent(epId)}`;
        const streamRes = await fetch(targetApi, {
          method: "GET",
          headers: {
            Referer: TARGET_REFERER,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        if (!streamRes.ok) {
          return new Response(
            JSON.stringify({ error: `Upstream API error (HTTP ${streamRes.status})` }),
            {
              status: streamRes.status,
              headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            },
          );
        }

        const data = await streamRes.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
            ...CORS_HEADERS,
          },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Failed to proxy stream URL", message: err.message }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          },
        );
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  },
};
