import { LATENT_SEASONS, LATENT_EXTRAS, type LatentEpisode, type ContentTab } from "./latent";
import { getScrapedMergedEpisodes } from "./auto-updater";

export type CustomEpisode = {
  title: string;
  guests: string;
  description: string;
  duration: string;
  thumbnail?: string | undefined;
  youtubeId?: string | undefined;
  okcdnId?: string | undefined;
  id: string;
  season: string;
  tab: ContentTab;
  createdAt: number;
};

const STORAGE_KEY = "custom_latent_episodes_v1";

export function getCustomEpisodes(): CustomEpisode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to parse custom episodes from localStorage", err);
    return [];
  }
}

export function saveCustomEpisode(ep: Omit<CustomEpisode, "id" | "createdAt">): CustomEpisode {
  const existing = getCustomEpisodes();
  const newEp: CustomEpisode = {
    ...ep,
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
  };
  const updated = [newEp, ...existing];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("latent_episodes_updated"));
  }
  return newEp;
}

export function deleteCustomEpisode(id: string): boolean {
  const existing = getCustomEpisodes();
  const updated = existing.filter((ep) => ep.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("latent_episodes_updated"));
  }
  return true;
}

export function clearCustomEpisodes(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("latent_episodes_updated"));
  }
}

export function getMergedSectionEpisodes(
  season: keyof typeof LATENT_SEASONS | string,
  tab: ContentTab,
): LatentEpisode[] {
  const baseScrapedAndStatic = getScrapedMergedEpisodes(season, tab);

  const customList = getCustomEpisodes().filter(
    (ep) => ep.season === season && ep.tab === tab,
  );

  return [...customList, ...baseScrapedAndStatic] as LatentEpisode[];
}
