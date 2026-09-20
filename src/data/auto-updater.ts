import { LATENT_SEASONS, LATENT_EXTRAS, type LatentEpisode, type ContentTab } from "./latent";

export type ScrapedEpisodeItem = LatentEpisode & {
  id: string;
  season: "Season 1" | "Season 2" | string;
  tab: ContentTab;
  scrapedAt: number;
};

const STORAGE_KEY = "scraped_latent_episodes_v2";
const DEFAULT_PROXY_DOMAIN = "https://india-got-latent-8j5.pages.dev/";

export function getActiveClientProxyDomain(): string {
  if (typeof window === "undefined") return DEFAULT_PROXY_DOMAIN;
  try {
    if ((window as any).__GLOBAL_ACTIVE_PROXY_DOMAIN__) {
      return cleanClientDomain((window as any).__GLOBAL_ACTIVE_PROXY_DOMAIN__);
    }
    const saved = localStorage.getItem("active_proxy_domain");
    if (saved) return cleanClientDomain(saved);

    const match = document.cookie.match(/(?:^|;\s*)active_proxy_domain=([^;]*)/);
    if (match && match[1]) return cleanClientDomain(decodeURIComponent(match[1]));
  } catch {}
  return DEFAULT_PROXY_DOMAIN;
}

export function setActiveClientProxyDomain(domain: string) {
  if (typeof window === "undefined") return;
  const cleaned = cleanClientDomain(domain);
  try {
    (window as any).__GLOBAL_ACTIVE_PROXY_DOMAIN__ = cleaned;
    localStorage.setItem("active_proxy_domain", cleaned);
    document.cookie = `active_proxy_domain=${encodeURIComponent(cleaned)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {}
}

let syncInitiated = false;
export function syncGlobalActiveProxyDomain(): void {
  if (typeof window === "undefined" || syncInitiated) return;
  syncInitiated = true;

  fetch("/api/active-domain")
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && data.activeDomain) {
        const remoteClean = cleanClientDomain(data.activeDomain);
        const currentClean = getActiveClientProxyDomain();
        (window as any).__GLOBAL_ACTIVE_PROXY_DOMAIN__ = remoteClean;
        if (remoteClean !== currentClean) {
          console.log("[ProxySync] Syncing active proxy domain from Redis:", remoteClean);
          setActiveClientProxyDomain(remoteClean);
          window.dispatchEvent(new CustomEvent("proxy_domain_updated", { detail: remoteClean }));
        }
      }
    })
    .catch(() => {});
}

if (typeof window !== "undefined") {
  syncGlobalActiveProxyDomain();
}

function cleanClientDomain(raw: string): string {
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

export function formatThumbnailUrl(rawThumb?: string): string | undefined {
  if (!rawThumb) return undefined;
  const thumb = rawThumb.trim();
  if (!thumb) return undefined;
  return thumb;
}

/** Parse duration string from "0h 34m 27s" to "34m" or "52m" */
function formatDuration(rawDuration?: string): string {
  if (!rawDuration) return "45m";
  let cleaned = rawDuration.trim();
  cleaned = cleaned.replace(/^0h\s*/i, "").trim();
  cleaned = cleaned.replace(/\s*0s$/i, "").trim();
  return cleaned || rawDuration;
}

/** Determine if a raw item should be ignored (e.g. standalone special shows or duplicate Varun Dhawan episode) */
function isIgnoredItem(raw: any): boolean {
  if (!raw || typeof raw !== "object") return true;
  const dataId = (raw.dataId || "").toLowerCase();
  const title = (raw.title || "").toLowerCase();
  const rawId = (raw.id || "").toLowerCase();

  // Exclude non-Latent standalone specials (Still Alive, Kapil, Documentary, etc.)
  if (dataId.includes("kapil") || dataId.includes("stillalive") || dataId.includes("still-alive")) return true;
  if (title.includes("mumbai documentary") || title.includes("talk show segment") || title.includes("still alive")) return true;

  // STRICT RULE: Ignore Varun Dhawan episode (6a9ad189a0818f1f0a6267df) from auto-updater feed
  if (
    rawId === "6a9ad189a0818f1f0a6267df" ||
    title.includes("varun dhawan") ||
    title.includes("medha shankar") ||
    title.includes("medha shankr")
  ) {
    return true;
  }

  return false;
}

/** Classify raw okcdn.json item into Season and ContentTab */
function classifyItem(raw: any): { season: string; tab: ContentTab; episode: LatentEpisode } | null {
  if (isIgnoredItem(raw)) return null;

  const rawSeason = (raw.season || "").toLowerCase();
  const season = rawSeason === "s1" || (raw.title || "").includes("S1") ? "Season 1" : "Season 2";

  const dataId = (raw.dataId || "").toLowerCase();
  const title = (raw.title || "").toLowerCase();
  const rawId = (raw.id || "").toLowerCase();

  let tab: ContentTab = "episodes";
  if (
    dataId.includes("extra") ||
    dataId.includes("deleted") ||
    title.includes("deleted") ||
    title.includes("discarded") ||
    title.includes("extra segment")
  ) {
    tab = "extra";
  } else if (dataId.includes("bts") || title.includes("bts") || title.includes("behind")) {
    tab = "bts";
  } else if (
    dataId.includes("bonus") ||
    title.includes("bonus") ||
    rawId === "6aa68187d576db122c00226f" ||
    title.includes("s2 bonus") ||
    (season === "Season 2" && title.includes("deepak kalal"))
  ) {
    tab = "bonus";
  }

  // Clean title & guest formatting
  let cleanTitle = raw.title || "Untitled Episode";
  let guests = raw.guests || "";

  // If title starts with INDIA'S GOT LATENT, simplify
  cleanTitle = cleanTitle.replace(/^INDIA'S GOT LATENT\s*\|?\s*/i, "").trim();

  // Extract guests if embedded in title (e.g. "Episode 6 Ft. Rakhi Sawant...")
  const ftMatch = cleanTitle.match(/(.*?)\s+(?:ft\.?|featuring)\s+(.*)/i);
  if (ftMatch) {
    cleanTitle = ftMatch[1].trim();
    if (!guests) {
      guests = "Ft. " + ftMatch[2].trim();
    }
  }

  // If description has guest details, pull guests from description if missing
  if (!guests && raw.description) {
    const desc = raw.description;
    if (desc.includes("featuring")) {
      guests = "Ft. " + desc.split("featuring")[1].trim();
    } else if (desc.includes("ft.")) {
      guests = "Ft. " + desc.split("ft.")[1].trim();
    }
  }

  const formattedThumb = formatThumbnailUrl(raw.thumbnail);

  const episode: LatentEpisode = {
    title: cleanTitle,
    guests,
    description: raw.description || "",
    duration: formatDuration(raw.duration),
    ...(formattedThumb ? { thumbnail: formattedThumb } : {}),
    okcdnId: raw.type === "okcdn" ? raw.id : undefined,
    youtubeId: raw.type === "youtube" ? raw.youtubeId || raw.id : raw.youtubeId || undefined,
  };

  return { season, tab, episode };
}

export function getStoredScrapedEpisodes(): ScrapedEpisodeItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: ScrapedEpisodeItem[] = raw ? JSON.parse(raw) : [];
    let wasModified = false;
    const cleaned = parsed
      .map((ep) => {
        const t = (ep.title || "").toLowerCase();
        const id = (ep.id || "").toLowerCase();
        const okId = (ep.okcdnId || "").toLowerCase();
        const g = (ep.guests || "").toLowerCase();
        let tab = ep.tab;
        if (
          t.includes("bonus") ||
          t.includes("deepak kalal") ||
          g.includes("deepak kalal") ||
          okId === "6aa68187d576db122c00226f" ||
          id.includes("bonus")
        ) {
          if (ep.season !== "Season 1" || !t.includes("deleted")) {
            if (tab !== "bonus") {
              tab = "bonus";
              wasModified = true;
            }
          }
        }
        const formattedThumb = formatThumbnailUrl(ep.thumbnail);
        return {
          ...ep,
          tab,
          ...(formattedThumb ? { thumbnail: formattedThumb } : {}),
        };
      })
      .filter((ep) => {
        const t = (ep.title || "").toLowerCase();
        const id = (ep.id || "").toLowerCase();
        const okId = (ep.okcdnId || "").toLowerCase();
        const g = (ep.guests || "").toLowerCase();
        const isIgnored =
          t.includes("still alive") ||
          t.includes("kapil") ||
          id.includes("stillalive") ||
          okId === "6a9ad189a0818f1f0a6267df" ||
          t.includes("varun dhawan") ||
          g.includes("varun dhawan") ||
          t.includes("medha shankar") ||
          t.includes("medha shankr");
        if (isIgnored) return false;

        // Remove S1 extra/deleted videos from Season 1 Bonus tab
        if ((ep.season === "Season 1" || ep.season === "1") && ep.tab === "bonus") {
          if (
            t.includes("segment 08") ||
            t.includes("segment 07") ||
            t.includes("episode 09") ||
            t.includes("episode 9") ||
            t.includes("deleted") ||
            okId === "6a49676b4274763d6c87135a" ||
            okId === "6a49676cfb0e2d59c3fe99e8"
          ) {
            return false;
          }
        }
        return true;
      });

    if (wasModified) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

function saveScrapedEpisodes(items: ScrapedEpisodeItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("latent_episodes_updated"));
  } catch (err) {
    console.error("Failed to save scraped episodes to localStorage", err);
  }
}

/** Primary Scraper & Feed Sync Function (Scans okcdn.json every 5 minutes) */
export async function fetchAndSyncFeed(): Promise<boolean> {
  try {
    const activeDomain = getActiveClientProxyDomain();
    const res = await fetch(`/api/feed`);
    if (!res.ok) return false;
    const rawData = await res.json();
    if (!Array.isArray(rawData)) return false;

    const existing = getStoredScrapedEpisodes();
    const existingIds = new Set(existing.map((e) => e.okcdnId || e.youtubeId || e.title));

    let newCount = 0;
    const updatedList = [...existing];

    for (const item of rawData) {
      const classified = classifyItem(item);
      if (!classified) continue;

      // STRICT RULE: Only Season 2 receives auto-updater feed additions
      if (classified.season !== "Season 2") continue;

      const itemKey = classified.episode.okcdnId || classified.episode.youtubeId || classified.episode.title;
      if (!existingIds.has(itemKey)) {
        existingIds.add(itemKey);
        newCount++;
        updatedList.unshift({
          ...classified.episode,
          id: `scraped_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          season: classified.season,
          tab: classified.tab,
          scrapedAt: Date.now(),
        });
      }
    }

    if (newCount > 0) {
      saveScrapedEpisodes(updatedList);
      console.log(`Auto-updater: Discovered ${newCount} new Season 2 episodes from okcdn.json feed.`);
    }

    return true;
  } catch (err) {
    console.warn("Auto-updater feed fetch error:", err);
    return false;
  }
}

/** Merges static catalogue with auto-scraped feed items */
export function getScrapedMergedEpisodes(
  season: keyof typeof LATENT_SEASONS | string,
  tab: ContentTab,
): LatentEpisode[] {
  const staticList =
    tab === "episodes"
      ? (LATENT_SEASONS[season as keyof typeof LATENT_SEASONS] ?? [])
      : (LATENT_EXTRAS[season as keyof typeof LATENT_SEASONS]?.[tab] ?? []);

  // STRICT RULE: Season 1 uses strictly static catalogue without any auto-scraped additions
  if (season === "Season 1" || season === "1") {
    return staticList;
  }

  const scrapedList = getStoredScrapedEpisodes().filter(
    (ep) => ep.season === season && ep.tab === tab,
  );

  // Filter out any duplicates by okcdnId or youtubeId
  const staticKeys = new Set(
    staticList.map((e) => (e.okcdnId || e.youtubeId || e.title).toLowerCase()),
  );

  const uniqueScraped = scrapedList.filter(
    (e) => !staticKeys.has((e.okcdnId || e.youtubeId || e.title).toLowerCase()),
  );

  let merged = [...uniqueScraped, ...staticList] as LatentEpisode[];

  if (tab === "episodes") {
    // Strictly prevent bonus episodes or Varun Dhawan / Deepak Kalal entries from showing up in main episodes tab
    merged = merged.filter((ep) => {
      const t = (ep.title || "").toLowerCase();
      const guests = (ep.guests || "").toLowerCase();
      const okId = (ep.okcdnId || "").toLowerCase();
      const isExcluded =
        okId === "6aa68187d576db122c00226f" ||
        okId === "6a9ad189a0818f1f0a6267df" ||
        t.includes("deepak kalal") ||
        t.includes("varun dhawan") ||
        guests.includes("varun dhawan") ||
        t.includes("medha shankar") ||
        t.includes("s2 bonus") ||
        t.includes("bonus");
      return !isExcluded;
    });
  } else if (tab === "bonus") {
    // Strictly prevent main Season 2 episodes (like Episode 6) from showing up in bonus tab
    merged = merged.filter((ep) => {
      const t = (ep.title || "").toLowerCase();
      const okId = (ep.okcdnId || "").toLowerCase();
      const isMainEpisode6 = okId === "6a9d7adc5882d566ebfc00e6" || t === "episode 6" || t.includes("s2 ep6") || t.includes("s2 ep 6");
      return !isMainEpisode6;
    });
  }

  return merged;
}
