import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EpisodePlayer } from "@/components/episode-player";
import { SiteFooter } from "@/components/site-footer";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  episodeSlug,
  formatEpisodeTitle,
  getSectionEpisodes,
  LATENT_SEASONS,
  SEASON_SLUGS,
  SEASON_TABS,
  seasonKeyFromSlug,
  type ContentTab,
} from "@/data/latent";
import { getMergedSectionEpisodes } from "@/data/episode-store";

type EpisodeSearch = {
  autoplay?: boolean | string;
};

export const Route = createFileRoute("/season-{$season}/$tab/$episode")({
  validateSearch: (search: Record<string, unknown>): EpisodeSearch => {
    const val = search["autoplay"];
    return {
      autoplay: val === "true" || val === true,
    };
  },
  loader: ({ params }) => {
    const seasonKey = seasonKeyFromSlug(params.season) || params.season;
    if (!seasonKey) throw notFound();

    const tab = params.tab as ContentTab;
    const list = getMergedSectionEpisodes(seasonKey, tab);
    if (list.length === 0) throw notFound();

    const rank = Number(params.episode);
    const index = list.length - rank;
    const episode = list[index];
    if (!episode) throw notFound();

    return { seasonKey, tab, list, episode, rank };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Episode unavailable — India's Got Latent" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${formatEpisodeTitle(loaderData.episode)} — India's Got Latent`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.episode.description },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.episode.description },
        { property: "og:type", content: "video.episode" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: EpisodePage,
});

function EpisodePage() {
  const { seasonKey, tab, episode } = Route.useLoaderData();
  const search = Route.useSearch();
  const autoPlay = search.autoplay !== false;

  // Browsing the panel never changes the video that is open.
  const [browseSeason, setBrowseSeason] = useState<keyof typeof LATENT_SEASONS>(
    (seasonKey as keyof typeof LATENT_SEASONS) || "Season 2",
  );
  const [browseTab, setBrowseTab] = useState<ContentTab>(tab);

  const [updateTick, setUpdateTick] = useState(0);

  useEffect(() => {
    setBrowseSeason((seasonKey as keyof typeof LATENT_SEASONS) || "Season 2");
    setBrowseTab(tab);
  }, [seasonKey, tab]);

  useEffect(() => {
    const handleUpdate = () => setUpdateTick((t) => t + 1);
    window.addEventListener("latent_episodes_updated", handleUpdate);
    return () => window.removeEventListener("latent_episodes_updated", handleUpdate);
  }, []);

  const browseTabs = SEASON_TABS[browseSeason];
  const activeBrowseTab: ContentTab = browseTabs.some((item) => item.value === browseTab)
    ? browseTab
    : (browseTabs[0]?.value ?? "episodes");
  const list = getMergedSectionEpisodes(browseSeason, activeBrowseTab);

  const cleanDisplayTitle = formatEpisodeTitle(episode);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid max-w-[1728px] items-start gap-6 px-5 pb-24 pt-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:px-12 lg:pt-8 xl:grid-cols-[minmax(0,1fr)_520px] xl:px-[72px]">
        <div className="min-w-0">
          <EpisodePlayer
            key={`${seasonKey}-${tab}-${episode.title}`}
            videoId={episode.youtubeId}
            okcdnId={episode.okcdnId}
            title={cleanDisplayTitle}
            thumbnail={episode.thumbnail}
            autoPlay={autoPlay}
          />

          <div className="border-b border-border/70 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="max-w-4xl text-xl font-bold leading-snug text-foreground sm:text-2xl">
                {cleanDisplayTitle}
              </h1>
              {episode.duration ? (
                <span className="shrink-0 rounded-sm bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                  {episode.duration}
                </span>
              ) : null}
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">
              {episode.description}
            </p>
          </div>
        </div>

        <aside className="min-w-0 overflow-hidden rounded-md border border-border bg-card/40" aria-label="India's Got Latent episodes">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 p-4">
            <h2 className="truncate font-heading text-[20px] font-normal uppercase tracking-[0.04em] text-foreground">
              India's Got Latent
            </h2>
            <Select
              value={browseSeason}
              onValueChange={(value) => {
                setBrowseSeason(value as keyof typeof LATENT_SEASONS);
                setBrowseTab("episodes");
              }}
            >
              <SelectTrigger className="h-10 w-[140px] shrink-0 rounded-full border-border bg-card px-4 text-sm font-semibold" aria-label="Choose season">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {Object.keys(LATENT_SEASONS).map((name) => (
                  <SelectItem key={name} value={name} className="cursor-pointer">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-3 gap-1 rounded-md border border-border/70 bg-card/55 p-1">
              {browseTabs.map((sectionTab) => (
                <button
                  key={sectionTab.value}
                  type="button"
                  onClick={() => setBrowseTab(sectionTab.value)}
                  className={`min-h-9 rounded-sm px-2 py-2 text-[12px] font-semibold transition-colors ${
                    sectionTab.value === activeBrowseTab ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sectionTab.label}
                </button>
              ))}
            </div>
          </div>

          <ol className="hide-scrollbar max-h-[70vh] overflow-y-auto">
            {list.map((item, index) => {
              const rank = list.length - index;
              const active = item === episode && browseSeason === seasonKey && activeBrowseTab === tab;
              return (
                <li key={`${browseSeason}-${activeBrowseTab}-${item.title}`} className="border-b border-border/60 last:border-b-0">
                  <Link
                    to="/season-{$season}/$tab/$episode"
                    params={{ season: SEASON_SLUGS[browseSeason], tab: activeBrowseTab, episode: episodeSlug(rank) }}
                    className={`group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-card/70 ${active ? "bg-accent/60" : ""}`}
                    aria-current={active ? "true" : undefined}
                  >
                    <span className="episode-rank w-10 shrink-0 select-none text-center text-[34px] leading-none" aria-hidden="true">
                      {episodeSlug(rank)}
                    </span>
                    <span className="flex aspect-video w-[150px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-card shadow-md">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      ) : null}
                    </span>
                    <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                      <span className="line-clamp-3 text-[14px] font-bold leading-snug text-foreground">
                        {item.title}{item.guests ? `: ${item.guests}` : ""}
                      </span>
                      <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{item.duration}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>

      <SiteFooter />
    </main>
  );
}
