import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Copy,
  ExternalLink,
  Loader2,
  PictureInPicture2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getActiveClientProxyDomain } from "@/data/auto-updater";

const QUALITY_LABELS: Record<string, string> = {
  "1080p": "1080p",
  "720p": "720p",
  "480p": "480p",
  "360p": "360p",
  "240p": "240p",
  "144p": "144p",
  hd1080: "1080p",
  hd720: "720p",
  large: "480p",
  medium: "360p",
  small: "240p",
  tiny: "144p",
  auto: "Auto",
  default: "Auto",
};

const HD_QUALITIES = new Set(["1080p", "720p", "hd1080", "hd720"]);
const DISALLOWED_QUALITIES = new Set(["2160p", "1440p", "hd2160", "hd1440", "highres", "4k", "2k"]);
const DEFAULT_QUALITY = "480p";

function loadPlyrScript(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).Plyr) return Promise.resolve((window as any).Plyr);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-plyr-script="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).Plyr));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.plyr.io/3.7.8/plyr.js";
    script.async = true;
    script.dataset["plyrScript"] = "true";
    script.onload = () => resolve((window as any).Plyr);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function EpisodePlayer({
  videoId,
  okcdnId,
  title,
  thumbnail,
  autoPlay = false,
}: {
  videoId?: string | undefined;
  okcdnId?: string | undefined;
  title: string;
  thumbnail?: string | undefined;
  autoPlay?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plyrInstanceRef = useRef<any>(null);

  const [mini, setMini] = useState(false);
  const [ready, setReady] = useState(false);

  // OK CDN stream state
  const [okStreams, setOkStreams] = useState<{ url: string; type: string }[]>([]);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string>("");
  const [okFetchError, setOkFetchError] = useState<string | null>(null);

  // Stream link modal state
  const [streamModalOpen, setStreamModalOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(DEFAULT_QUALITY);
  const [qualities, setQualities] = useState<string[]>([]);
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedStreamUrl, setCopiedStreamUrl] = useState<string>("");

  // Fetch OK CDN stream links when okcdnId is present
  useEffect(() => {
    if (!okcdnId) return;
    let cancelled = false;
    setOkFetchError(null);

    fetch(`/api/stream?id=${encodeURIComponent(okcdnId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.status === "success" && Array.isArray(data.streams) && data.streams.length > 0) {
          const streams: { url: string; type: string }[] = data.streams;
          setOkStreams(streams);
          const availableTypes = streams
            .map((s) => s.type)
            .filter((t) => !DISALLOWED_QUALITIES.has(t.toLowerCase()));
          setQualities(availableTypes);

          const preferredOrder = ["480p", "720p", "1080p", "360p", "240p", "144p"];
          const bestType = preferredOrder.find((t) => availableTypes.includes(t)) || availableTypes[0];
          const bestStream = streams.find((s) => s.type === bestType) ?? streams[0];

          if (bestStream) {
            setSelectedQuality(bestStream.type);
            setCurrentStreamUrl(bestStream.url);
          }
          setReady(true);
        } else {
          throw new Error("No stream URLs available");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load stream:", err);
        if (videoId) {
          setOkFetchError(null);
          setReady(true);
        } else {
          setOkFetchError(err.message || "Failed to load stream");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [okcdnId, videoId]);

  // Instantiate Plyr video player safely on client-side
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    loadPlyrScript().then((PlyrClass) => {
      if (cancelled || !PlyrClass) return;

      if (plyrInstanceRef.current) {
        try {
          plyrInstanceRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
        plyrInstanceRef.current = null;
      }

      const videoEl = containerRef.current?.querySelector("#plyr-video");
      if (!videoEl) return;

      try {
        const instance = new PlyrClass(videoEl, {
          autoplay: autoPlay,
          quality: { default: 480, options: [1080, 720, 480, 360, 240, 144] },
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          fullscreen: { enabled: true, fallback: true, iosNative: true },
          controls: [
            "play-large",
            "play",
            "mute",
            "volume",
            "current-time",
            "progress",
            "settings",
            "pip",
            "airplay",
            "fullscreen",
          ],
        });
        plyrInstanceRef.current = instance;
      } catch (err) {
        console.error("Plyr initialization error:", err);
      }
    });

    return () => {
      cancelled = true;
      if (plyrInstanceRef.current) {
        try {
          plyrInstanceRef.current.destroy();
        } catch (e) {}
        plyrInstanceRef.current = null;
      }
    };
  }, [okcdnId, okStreams, videoId, autoPlay]);

  const closeStreamModal = () => {
    setStreamModalOpen(false);
    setCopiedLink(false);
    setIsFetchingLink(false);
  };

  const handleSelectQuality = (q: string) => {
    setSelectedQuality(q);
    setCopiedLink(false);
    setIsFetchingLink(true);
    setTimeout(() => setIsFetchingLink(false), 200);
  };

  const handleCopyOrOpenLink = async () => {
    if (copiedLink && (copiedStreamUrl || currentStreamUrl)) {
      const urlToOpen = copiedStreamUrl || currentStreamUrl;
      window.open(urlToOpen, "_blank", "noopener,noreferrer");
      return;
    }

    setIsFetchingLink(true);
    let targetStream = okStreams.find((s) => s.type === selectedQuality || s.type === QUALITY_LABELS[selectedQuality]) ?? okStreams[0];
    let streamUrl = targetStream?.url || currentStreamUrl;

    if (!streamUrl && okcdnId) {
      try {
        const res = await fetch(`/api/stream?id=${encodeURIComponent(okcdnId)}`);
        const data = await res.json();
        if (data.status === "success" && Array.isArray(data.streams)) {
          const s = data.streams.find((item: any) => item.type === selectedQuality) || data.streams[0];
          if (s?.url) streamUrl = s.url;
        }
      } catch (err) {
        console.error("Failed to fetch stream URL:", err);
      }
    }

    setIsFetchingLink(false);

    if (!streamUrl) {
      alert("Stream link is not available.");
      return;
    }

    setCopiedStreamUrl(streamUrl);

    try {
      await navigator.clipboard.writeText(streamUrl);
    } catch (err) {
      console.error("Failed to copy stream link:", err);
    }

    setCopiedLink(true);
  };

  const qualityList = qualities.length > 0 ? qualities : ["720p", "480p", "360p"];
  const unavailable = !videoId && !okcdnId && Boolean(okFetchError);

  return (
    <>
      {mini ? (
        <div className="grid aspect-video w-full place-items-center rounded-md border border-dashed border-border/70 bg-card/40 px-6 text-center text-sm text-muted-foreground">
          Playing in the mini player. Use the close button on it to bring the video back here.
        </div>
      ) : null}

      <div
        className={
          mini
            ? "fixed bottom-4 right-4 z-50 w-[min(360px,86vw)] overflow-hidden rounded-lg border border-border bg-black shadow-2xl"
            : "relative overflow-hidden rounded-md bg-black shadow-2xl"
        }
      >
        <div ref={containerRef} className="relative aspect-video w-full bg-black">
          {/* Top floating overlay controls */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/70 to-transparent">
            {mini ? (
              <button
                type="button"
                onClick={() => setMini(false)}
                aria-label="Close mini player"
                className="pointer-events-auto grid size-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur transition-colors hover:bg-black/90"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <Link
                to="/"
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
                aria-label="Back to home"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Link>
            )}

            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStreamModalOpen(true)}
                title="Copy Video Link"
                className="grid size-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-all hover:bg-black/80 hover:scale-105"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMini((prev) => !prev)}
                title={mini ? "Exit Mini Player" : "Mini Player"}
                className="grid size-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-all hover:bg-black/80 hover:scale-105"
              >
                <PictureInPicture2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Plyr Container */}
          <div className="plyr-wrap h-full w-full" id="plyr-wrap">
            {okcdnId && okStreams.length > 0 ? (
              <video
                id="plyr-video"
                className="plyr-video h-full w-full object-contain"
                playsInline
                controls
                poster={thumbnail}
              >
                {okStreams.map((s) => {
                  let size = 720;
                  const m = s.type?.match(/(\d+)p/);
                  if (m?.[1]) size = parseInt(m[1], 10);
                  return <source key={s.url} src={s.url} type="video/mp4" {...({ size } as any)} />;
                })}
              </video>
            ) : videoId ? (
              <div
                id="plyr-video"
                data-plyr-provider="youtube"
                data-plyr-embed-id={videoId}
              />
            ) : unavailable ? (
              <div className="grid h-full w-full place-items-center bg-black p-6 text-center text-sm font-medium text-white/80">
                ⚠️ Stream unavailable
              </div>
            ) : (
              <div className="grid h-full w-full place-items-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-[#7c5cfc]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copy Stream Link Modal Popup */}
      {streamModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeStreamModal();
          }}
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-card p-6 shadow-2xl text-foreground animate-scale-in">
            <button
              type="button"
              onClick={closeStreamModal}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-accent hover:text-white"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              Copy Stream Link
            </h3>

            {thumbnail ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-white/10 shadow-md aspect-video relative">
                <img src={thumbnail} alt={title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <span className="absolute bottom-2 left-3 font-semibold text-xs text-white/90 truncate max-w-[90%]">
                  {title}
                </span>
              </div>
            ) : (
              <p className="mt-3 font-semibold text-sm text-white">{title}</p>
            )}

            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Select video resolution below to get and copy the direct video stream link to your clipboard.
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Choose Quality
              </label>
              <div className="grid grid-cols-3 gap-2">
                {qualityList.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSelectQuality(q)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                      selectedQuality === q
                        ? "border-primary bg-primary/20 text-white shadow-sm ring-1 ring-primary"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-accent hover:text-white"
                    }`}
                  >
                    <span>{QUALITY_LABELS[q] ?? q}</span>
                    {HD_QUALITIES.has(q) ? (
                      <span className="rounded bg-primary/30 px-1 py-0.5 text-[9px] font-bold text-primary-foreground">
                        HD
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            {/* Single Copy Link & Open Link Button */}
            <button
              type="button"
              disabled={isFetchingLink}
              onClick={handleCopyOrOpenLink}
              className={`relative mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 font-bold shadow-lg transition-all active:scale-95 disabled:opacity-75 ${
                copiedLink
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-white text-black hover:brightness-110"
              }`}
            >
              {isFetchingLink ? (
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching link...
                </span>
              ) : copiedLink ? (
                <span className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <span>Open Link ({QUALITY_LABELS[selectedQuality] ?? selectedQuality})</span>
                </span>
              ) : (
                <span className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                  <Copy className="h-4 w-4 shrink-0" />
                  <span>Copy Link ({QUALITY_LABELS[selectedQuality] ?? selectedQuality})</span>
                </span>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
