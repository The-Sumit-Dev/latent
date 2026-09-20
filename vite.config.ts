// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const DEFAULT_DOMAIN = "https://india-got-latent-8j5.pages.dev/";

function getActiveProxyDomain(): string {
  let domain = (globalThis as any).__ACTIVE_PROXY_DOMAIN__ || DEFAULT_DOMAIN;
  if (!domain.startsWith("http://") && !domain.startsWith("https://")) {
    domain = "https://" + domain;
  }
  if (!domain.endsWith("/")) {
    domain += "/";
  }
  return domain;
}

function setActiveProxyDomain(newDomain: string): string {
  let clean = newDomain.trim();
  if (clean.includes("/api/update=")) {
    clean = clean.split("/api/update=")[1]?.trim() || clean;
  } else if (clean.includes("update=")) {
    clean = clean.split("update=")[1]?.trim() || clean;
  }
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "https://" + clean;
  }
  if (!clean.endsWith("/")) {
    clean += "/";
  }
  (globalThis as any).__ACTIVE_PROXY_DOMAIN__ = clean;
  return clean;
}

function streamProxyPlugin() {
  return {
    name: "stream-proxy-middleware",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url && (req.url.startsWith("/api/update") || req.url.includes("/api/update="))) {
          let targetDomain = "";
          if (req.url.includes("/api/update=")) {
            const parts = req.url.split("/api/update=");
            const val = parts[1] || "";
            targetDomain = decodeURIComponent(val.split("&")[0].split("?")[0]);
          } else {
            const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
            targetDomain =
              url.searchParams.get("url") ||
              url.searchParams.get("domain") ||
              url.searchParams.get("target") ||
              "";
          }

          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");

          if (targetDomain) {
            const updated = setActiveProxyDomain(targetDomain);
            const acceptHeader = req.headers["accept"] || "";
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
              res.setHeader("Content-Type", "text/html; charset=utf-8");
              res.setHeader("Set-Cookie", `active_proxy_domain=${encodeURIComponent(updated)}; Path=/; Max-Age=31536000; SameSite=Lax`);
              res.statusCode = 200;
              res.end(html);
              return;
            }

            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                status: "success",
                message: "Proxy domain updated successfully",
                activeDomain: updated,
                feedUrl: `${updated}okcdn.json`,
              }),
            );
          } else {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                status: "info",
                activeDomain: getActiveProxyDomain(),
                feedUrl: `${getActiveProxyDomain()}okcdn.json`,
                usage:
                  "To update domain, visit /api/update=https://new-domain.pages.dev/ or /api/update?domain=https://new-domain.pages.dev/",
              }),
            );
          }
          return;
        }

        if (req.url && (req.url.startsWith("/api/active-domain") || req.url.startsWith("/api/domain"))) {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              status: "success",
              activeDomain: getActiveProxyDomain(),
              feedUrl: `${getActiveProxyDomain()}okcdn.json`,
            }),
          );
          return;
        }

        if (req.url && req.url.startsWith("/api/feed")) {
          try {
            const currentDomain = getActiveProxyDomain();
            const feedRes = await fetch(`${currentDomain}okcdn.json`, {
              headers: {
                Referer: currentDomain,
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
            });
            const data = await feedRes.json();
            res.statusCode = feedRes.status;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (req.url && req.url.startsWith("/api/stream")) {
          const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
          const epId = url.searchParams.get("id");
          if (!epId) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Missing id parameter" }));
            return;
          }
          try {
            const currentDomain = getActiveProxyDomain();
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
            res.statusCode = streamRes.status;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }
        if (req.url && req.url.startsWith("/api/download")) {
          const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
          const targetUrl = url.searchParams.get("url");
          const filename = url.searchParams.get("filename") || "video.mp4";
          if (!targetUrl) {
            res.statusCode = 400;
            res.end("Missing url parameter");
            return;
          }
          try {
            const currentDomain = getActiveProxyDomain();
            const videoRes = await fetch(targetUrl, {
              headers: {
                Referer: currentDomain,
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
            });
            res.statusCode = videoRes.status;
            res.setHeader("Content-Type", videoRes.headers.get("Content-Type") || "video/mp4");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            const cl = videoRes.headers.get("Content-Length");
            if (cl) res.setHeader("Content-Length", cl);
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Disposition");
            const arrayBuffer = await videoRes.arrayBuffer();
            res.end(Buffer.from(arrayBuffer));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(err.message);
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [streamProxyPlugin()],
  },
});

