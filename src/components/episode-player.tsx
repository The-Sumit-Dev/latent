import { Link } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Film,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Sliders,
  Volume2,
  VolumeX,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getActiveClientProxyDomain } from "@/data/auto-updater";

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
  getAvailablePlaybackRates: () => number[];
  setPlaybackQuality: (quality: string) => void;
  loadVideoById: (options: {
    videoId: string;
    startSeconds?: number;
    suggestedQuality?: string;
  }) => void;
  getPlaybackQuality: () => string;
  getAvailableQualityLevels: () => string[];
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, options: Record<string, unknown>) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Supported quality levels for YouTube and OK CDN streams
const QUALITY_ORDER = ["1080p", "720p", "480p", "360p", "240p", "144p", "hd1080", "hd720", "large", "medium", "small", "tiny"];

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

const RATE_LABELS: Record<number, string> = { 1: "Normal" };

function loadYouTubeApi(): Promise<NonNullable<Window["YT"]>> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);

  return new Promise((resolve) => {
    const finish = () => {
      if (window.YT?.Player) resolve(window.YT);
    };
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      finish();
    };
    if (!document.querySelector('script[data-yt-api="true"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset["ytApi"] = "true";
      document.head.appendChild(script);
    }
    const poll = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(poll);
        finish();
      }
    }, 200);
  });
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
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
  const shellRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(autoPlay);
  const [playing, setPlaying] = useState(autoPlay);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mini, setMini] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<"root" | "quality" | "speed">("root");
  const [rate, setRate] = useState(1);
  const [rates] = useState<number[]>([0.5, 0.75, 1, 1.25, 1.5, 2]);
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [qualities, setQualities] = useState<string[]>([]);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [skipFlash, setSkipFlash] = useState<{ dir: "back" | "forward"; id: number } | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [hasPlayedFirstFrame, setHasPlayedFirstFrame] = useState(false);

  // OK CDN stream state
  const [okStreams, setOkStreams] = useState<{ url: string; type: string }[]>([]);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string>("");
  const [okFetchError, setOkFetchError] = useState<string | null>(null);

  // Stream link modal state
  const [streamModalOpen, setStreamModalOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(DEFAULT_QUALITY);
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const wantedQuality = useRef(DEFAULT_QUALITY);
  const panelInnerRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  const hideTimer = useRef<number | null>(null);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  // Fetch OK CDN streams immediately on page load when okcdnId is present
  useEffect(() => {
    if (!okcdnId) return;
    let cancelled = false;
    setOkFetchError(null);

    const activeDomain = getActiveClientProxyDomain();
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
            setQuality(bestStream.type);
            wantedQuality.current = bestStream.type;
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
          console.warn("OK CDN stream failed, falling back to YouTube player:", videoId);
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

  // YouTube player initialization (when okcdnId is absent or stream unavailable, and videoId is present)
  useEffect(() => {
    const isOkFailed = Boolean(okcdnId && !currentStreamUrl);
    const useYouTube = Boolean((!okcdnId || isOkFailed) && videoId);
    if (!started || !useYouTube || playerRef.current || !mountRef.current) return;
    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      playerRef.current = new YT.Player(mountRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          disablekb: 1,
          fs: 0,
          vq: DEFAULT_QUALITY,
        },
        events: {
          onReady: (event: { target: YTPlayer }) => {
            if (cancelled) return;
            const player = event.target;
            setReady(true);
            setDuration(player.getDuration());
            setMuted(player.isMuted());
            setQuality(wantedQuality.current);
            player.setPlaybackQuality?.(wantedQuality.current);
            player.playVideo();
          },
          onStateChange: (event: { data: number; target: YTPlayer }) => {
            if (cancelled) return;
            const state = event.data;
            setPlaying(state === 1);
            setBuffering(state === 3);
            if (state === 1) {
              setHasPlayedFirstFrame(true);
              setDuration(event.target.getDuration());
              const levels = event.target.getAvailableQualityLevels?.() ?? [];
              setQualities(levels);
              if (event.target.getPlaybackQuality?.() !== wantedQuality.current) {
                event.target.setPlaybackQuality?.(wantedQuality.current);
              }
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [started, videoId, okcdnId]);

  useEffect(
    () => () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
    },
    [],
  );

  // Progress ticker.
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      if (scrubbing) return;
      if (okcdnId && videoRef.current) {
        setCurrent(videoRef.current.currentTime);
        if (videoRef.current.duration) setDuration(videoRef.current.duration);
        return;
      }
      const player = playerRef.current;
      if (typeof player?.getCurrentTime !== "function") return;
      setCurrent(player.getCurrentTime());
      const total = player.getDuration();
      if (total) setDuration(total);
    }, 250);
    return () => window.clearInterval(id);
  }, [ready, scrubbing, okcdnId]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Reset when navigating to another episode.
  useEffect(() => {
    playerRef.current?.destroy?.();
    playerRef.current = null;
    setReady(false);
    setStarted(false);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setMini(false);
    setSettingsOpen(false);
    setSettingsView("root");
    wantedQuality.current = DEFAULT_QUALITY;
    setQuality(DEFAULT_QUALITY);
    setBuffering(false);
    setHasPlayedFirstFrame(false);
    setOkStreams([]);
    setCurrentStreamUrl("");
    setOkFetchError(null);
  }, [videoId, okcdnId]);

  // Measure the settings panel so it can grow/shrink smoothly between views.
  useEffect(() => {
    const el = panelInnerRef.current;
    if (!el) return;
    const measure = () => setPanelHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [settingsView, settingsOpen, rates.length, qualities.length]);

  const togglePlay = useCallback(() => {
    if (!started) setStarted(true);
    if (okcdnId && currentStreamUrl) {
      const v = videoRef.current;
      if (!v) {
        setStarted(true);
        setPlaying(true);
        setBuffering(true);
        return;
      }
      if (v.paused) {
        v.play()
          .then(() => {
            setPlaying(true);
            setBuffering(false);
          })
          .catch((err) => {
            console.warn("Playback error, trying muted autoplay:", err);
            v.muted = true;
            setMuted(true);
            v.play()
              .then(() => {
                setPlaying(true);
                setBuffering(false);
              })
              .catch(() => {
                setPlaying(false);
                setBuffering(false);
              });
          });
      } else {
        v.pause();
        setPlaying(false);
      }
      revealControls();
      return;
    }

    const player = playerRef.current;
    if (typeof player?.playVideo !== "function") {
      setStarted(true);
      setPlaying(true);
      setBuffering(true);
      return;
    }
    if (playing) player.pauseVideo();
    else player.playVideo();
    revealControls();
  }, [started, okcdnId, currentStreamUrl, playing, revealControls]);

  const skip = useCallback(
    (delta: number) => {
      if (!started) setStarted(true);
      if (okcdnId) {
        const v = videoRef.current;
        if (!v) return;
        const next = Math.min(Math.max(v.currentTime + delta, 0), v.duration || Infinity);
        v.currentTime = next;
        setCurrent(next);
        setSkipFlash({ dir: delta < 0 ? "back" : "forward", id: Date.now() });
        revealControls();
        return;
      }

      const player = playerRef.current;
      if (typeof player?.getCurrentTime !== "function") return;
      const next = Math.min(Math.max(player.getCurrentTime() + delta, 0), player.getDuration() || Infinity);
      player.seekTo(next, true);
      setCurrent(next);
      setSkipFlash({ dir: delta < 0 ? "back" : "forward", id: Date.now() });
      revealControls();
    },
    [okcdnId, revealControls],
  );

  useEffect(() => {
    if (!skipFlash) return;
    const id = window.setTimeout(() => setSkipFlash(null), 600);
    return () => window.clearTimeout(id);
  }, [skipFlash]);

  // Keyboard: space/k toggles play, arrows skip.
  useEffect(() => {
    if (!started || (!videoId && !okcdnId)) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.code === "Space" || event.key === "k") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        skip(10);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        skip(-10);
      } else if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [started, videoId, okcdnId, togglePlay, skip]);

  const toggleMute = () => {
    if (okcdnId) {
      const v = videoRef.current;
      if (!v) return;
      v.muted = !v.muted;
      setMuted(v.muted);
      return;
    }

    const player = playerRef.current;
    if (typeof player?.isMuted !== "function") return;
    if (player.isMuted()) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    setMini(false);
    await shellRef.current?.requestFullscreen?.().catch(() => {});
  };

  const settingsContainerRef = useRef<HTMLDivElement>(null);

  const openSettings = () => {
    setSettingsOpen((open) => !open);
    setSettingsView("root");
    revealControls();
  };

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    window.setTimeout(() => setSettingsView("root"), 220);
  }, []);

  // Click-outside listener to dismiss settings popup when tapping anywhere on screen
  useEffect(() => {
    if (!settingsOpen) return;
    const handleGlobalClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (settingsContainerRef.current && !settingsContainerRef.current.contains(target)) {
        closeSettings();
      }
    };
    window.addEventListener("mousedown", handleGlobalClick);
    window.addEventListener("touchstart", handleGlobalClick);
    return () => {
      window.removeEventListener("mousedown", handleGlobalClick);
      window.removeEventListener("touchstart", handleGlobalClick);
    };
  }, [settingsOpen, closeSettings]);

  const savedTimeRef = useRef<number | null>(null);
  const downloadAbortRef = useRef<AbortController | null>(null);

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

  const [copiedStreamUrl, setCopiedStreamUrl] = useState<string>("");

  const handleCopyAndOpenLink = async () => {
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

    // Open video stream link in another tab to download video
    window.open(streamUrl, "_blank", "noopener,noreferrer");
  };

  const applyQuality = (level: string) => {
    wantedQuality.current = level;
    setQuality(level);

    if (okcdnId) {
      const targetStream = okStreams.find((s) => s.type === level || s.type === QUALITY_LABELS[level]);
      if (targetStream && videoRef.current) {
        savedTimeRef.current = videoRef.current.currentTime;
        const wasPlaying = !videoRef.current.paused;
        setBuffering(true);
        setCurrentStreamUrl(targetStream.url);
        videoRef.current.src = targetStream.url;
        if (savedTimeRef.current !== null && savedTimeRef.current > 0) {
          videoRef.current.currentTime = savedTimeRef.current;
        }
        videoRef.current.playbackRate = rate;
        if (wasPlaying) {
          videoRef.current.play().catch(() => {});
        }
      }
      return;
    }

    const player = playerRef.current;
    if (!videoId || typeof player?.loadVideoById !== "function") return;
    const at = typeof player.getCurrentTime === "function" ? player.getCurrentTime() : 0;
    const wasPlaying = playing;
    setBuffering(true);
    player.setPlaybackQuality?.(level);
    player.loadVideoById({ videoId, startSeconds: at, suggestedQuality: level });
    window.setTimeout(() => {
      playerRef.current?.setPlaybackQuality?.(level);
      playerRef.current?.setPlaybackRate?.(rate);
      if (!wasPlaying) playerRef.current?.pauseVideo?.();
    }, 300);
  };

  const progress = duration > 0 ? Math.min(current / duration, 1) * 100 : 0;
  const unavailable = !videoId && !okcdnId;
  const sortedQualities = [
    ...QUALITY_ORDER.filter((level) => qualities.includes(level)),
    ...qualities.filter((level) => !QUALITY_ORDER.includes(level) && !DISALLOWED_QUALITIES.has(level.toLowerCase())),
  ].filter((level) => !DISALLOWED_QUALITIES.has(level.toLowerCase()));
  const qualityList = sortedQualities.length > 0 ? sortedQualities : qualities.length > 0 ? qualities : [quality];
  const loading = started && Boolean(videoId || okcdnId) && (!ready || buffering);

  return (
    <>
      {mini ? (
        <div className="grid aspect-video w-full place-items-center rounded-md border border-dashed border-border/70 bg-card/40 px-6 text-center text-sm text-muted-foreground">
          Playing in the mini player. Use the close button on it to bring the video back here.
        </div>
      ) : null}

      <div
        ref={shellRef}
        onMouseMove={revealControls}
        onMouseLeave={() => started && setControlsVisible(false)}
        className={
          mini
            ? "fixed bottom-4 right-4 z-50 w-[min(360px,86vw)] overflow-hidden rounded-lg border border-border bg-black shadow-2xl"
            : "relative overflow-hidden rounded-md bg-black shadow-2xl"
        }
      >
        <div className="relative aspect-video w-full">
          {started && !unavailable ? (
            <div className="absolute inset-0 bg-black">
              {okcdnId ? (
                <video
                  ref={videoRef}
                  src={currentStreamUrl}
                  className="h-full w-full object-contain"
                  autoPlay
                  playsInline
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      if (!scrubbing) setCurrent(videoRef.current.currentTime);
                      if (videoRef.current.currentTime > 0) {
                        setHasPlayedFirstFrame(true);
                      }
                    }
                  }}
                  onCanPlay={() => {
                    if (videoRef.current && started) {
                      videoRef.current
                        .play()
                        .then(() => {
                          setPlaying(true);
                          setBuffering(false);
                          setHasPlayedFirstFrame(true);
                        })
                        .catch(() => {
                          setBuffering(false);
                        });
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setDuration(videoRef.current.duration);
                      if (savedTimeRef.current !== null && savedTimeRef.current > 0) {
                        videoRef.current.currentTime = savedTimeRef.current;
                        savedTimeRef.current = null;
                      }
                      videoRef.current.playbackRate = rate;
                      videoRef.current.play().catch(() => {});
                      setPlaying(true);
                      setBuffering(false);
                      setHasPlayedFirstFrame(true);
                    }
                  }}
                  onPlay={() => {
                    setPlaying(true);
                    setBuffering(false);
                    setHasPlayedFirstFrame(true);
                  }}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  onWaiting={() => setBuffering(true)}
                  onPlaying={() => {
                    setPlaying(true);
                    setBuffering(false);
                    setHasPlayedFirstFrame(true);
                  }}
                />
              ) : (
                <div ref={mountRef} className="h-full w-full" />
              )}
              {/* Overlay button for controls and click handling */}
              <button
                type="button"
                aria-label={playing ? "Pause" : "Play"}
                onClick={() => {
                  if (settingsOpen) {
                    setSettingsOpen(false);
                    return;
                  }
                  togglePlay();
                }}
                onDoubleClick={toggleFullscreen}
                className="absolute inset-0 z-10 h-full w-full cursor-default bg-transparent"
              />
            </div>
          ) : null}

          {/* Thumbnail Overlay (remains visible over video until first frame plays) */}
          {thumbnail && !hasPlayedFirstFrame ? (
            <div
              className={`pointer-events-none absolute inset-0 z-[1] transition-opacity duration-500 ${
                hasPlayedFirstFrame ? "opacity-0" : "opacity-100"
              }`}
            >
              <img src={thumbnail} alt={title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/25" />
            </div>
          ) : null}

          {unavailable ? (
            <div className="absolute inset-0 z-30 grid place-items-center px-6 text-center">
              <p className="max-w-sm text-sm font-semibold text-white/90">
                This video is currently unavailable.
              </p>
            </div>
          ) : null}



          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24 bg-gradient-to-b from-black/70 to-transparent" />

          {mini ? (
            <button
              type="button"
              onClick={() => setMini(false)}
              aria-label="Close mini player"
              className="absolute right-2 top-2 z-30 grid size-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur transition-colors hover:bg-black/90"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <Link
              to="/"
              className="absolute left-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:left-4 sm:top-4 sm:text-sm"
              aria-label="Back to home"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Link>
          )}

          {/* Center controls: skip back, play/pause, skip forward */}
          {!unavailable ? (
            <div
              className={`pointer-events-none absolute inset-0 z-30 grid place-items-center transition-opacity duration-300 ${
                controlsVisible || !playing || loading ? "opacity-100" : "opacity-0"
              }`}
            >
              {loading ? (
                <span className="grid size-14 animate-scale-in place-items-center rounded-full bg-black/55 text-white backdrop-blur sm:size-16" role="status" aria-label="Loading video">
                  <Loader2 className="h-7 w-7 animate-spin sm:h-8 sm:w-8" aria-hidden="true" />
                </span>
              ) : (
                <div className="pointer-events-auto flex animate-fade-in items-center gap-6 sm:gap-10">
                  <SkipButton label="Back 10 seconds" onClick={() => skip(-10)} direction="back" />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.currentTarget.blur();
                      togglePlay();
                    }}
                    aria-label={playing ? "Pause" : "Play"}
                    className="grid size-14 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-transform duration-200 hover:scale-105 hover:bg-black/70 sm:size-16"
                  >
                    {playing ? (
                      <Pause className="h-6 w-6 fill-current sm:h-7 sm:w-7" aria-hidden="true" />
                    ) : (
                      <Play className="h-6 w-6 fill-current sm:h-7 sm:w-7" aria-hidden="true" />
                    )}
                  </button>
                  <SkipButton label="Forward 10 seconds" onClick={() => skip(10)} direction="forward" />
                </div>
              )}
            </div>
          ) : null}

          {/* Skip feedback burst */}
          {skipFlash ? (
            <div key={skipFlash.id} className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
              <div
                className={`absolute inset-y-0 w-1/2 animate-fade-out bg-white/10 ${
                  skipFlash.dir === "back" ? "left-0 rounded-r-[50%]" : "right-0 rounded-l-[50%]"
                }`}
              />
              <div
                className={`absolute top-1/2 -translate-y-1/2 animate-scale-in text-white ${
                  skipFlash.dir === "back" ? "left-[14%]" : "right-[14%]"
                }`}
              >
                <span className="flex flex-col items-center gap-1">
                  <span className="relative grid size-9 place-items-center">
                    {skipFlash.dir === "back" ? (
                      <RotateCcw className="absolute h-9 w-9" aria-hidden="true" />
                    ) : (
                      <RotateCw className="absolute h-9 w-9" aria-hidden="true" />
                    )}
                  </span>
                  <span className="text-xs font-bold tabular-nums">10 seconds</span>
                </span>
              </div>
            </div>
          ) : null}

          {!unavailable ? (
            <div
              className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2 pt-10 transition-opacity duration-300 sm:px-4 sm:pb-3 ${
                controlsVisible || !playing || loading ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Timeline: visible track + filled bar + dot */}
              <div className="group relative flex h-4 items-center">
                <div className="pointer-events-none absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white transition-[width] duration-200 ease-linear" style={{ width: `${progress}%` }} />
                  {loading ? <span className="track-loading absolute inset-0" aria-hidden="true" /> : null}
                </div>
                <span
                  className="pointer-events-none absolute size-3.5 -translate-x-1/2 rounded-full bg-white shadow"
                  style={{ left: `${progress}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration, 1)}
                  step={0.5}
                  value={Math.min(current, duration || 0)}
                  aria-label="Seek"
                  onPointerDown={() => setScrubbing(true)}
                  onPointerUp={() => setScrubbing(false)}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setCurrent(next);
                    if (okcdnId && videoRef.current) {
                      videoRef.current.currentTime = next;
                    } else {
                      playerRef.current?.seekTo(next, true);
                    }
                  }}
                  className="relative z-10 h-4 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 sm:gap-2">
                  <PlayerButton label={loading ? "Loading" : playing ? "Pause" : "Play"} onClick={togglePlay}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : playing ? (
                      <Pause className="h-4 w-4 fill-current" />
                    ) : (
                      <Play className="h-4 w-4 fill-current" />
                    )}
                  </PlayerButton>
                  <PlayerButton label="Back 10 seconds" onClick={() => skip(-10)}>
                    <SkipGlyph direction="back" />
                  </PlayerButton>
                  <PlayerButton label="Forward 10 seconds" onClick={() => skip(10)}>
                    <SkipGlyph direction="forward" />
                  </PlayerButton>
                  <PlayerButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </PlayerButton>
                  <span className="ml-1 tabular-nums text-[11px] font-medium text-white/90 sm:text-xs">
                    {formatTime(current)} / {formatTime(duration)}
                  </span>
                </div>

                <div ref={settingsContainerRef} className="relative flex items-center gap-1 sm:gap-2">
                  <ShakaSettingsMenu
                    open={settingsOpen}
                    view={settingsView}
                    setView={setSettingsView}
                    quality={quality}
                    qualities={qualities}
                    qualityList={qualityList}
                    rate={rate}
                    rates={rates}
                    applyQuality={applyQuality}
                    applyRate={(value) => {
                      if (okcdnId && videoRef.current) {
                        videoRef.current.playbackRate = value;
                      } else {
                        playerRef.current?.setPlaybackRate?.(value);
                      }
                      setRate(value);
                    }}
                    onClose={closeSettings}
                    panelRef={panelInnerRef}
                  />

                  <PlayerButton label="Playback settings" onClick={openSettings} active={settingsOpen}>
                    <Settings className={`h-4 w-4 transition-transform duration-300 ${settingsOpen ? "rotate-90 text-primary" : "group-hover:rotate-45"}`} />
                  </PlayerButton>
                  <PlayerButton
                    label="Copy video stream link"
                    onClick={() => {
                      setStreamModalOpen(true);
                      revealControls();
                    }}
                    active={streamModalOpen}
                  >
                    <Copy className="h-4 w-4" />
                  </PlayerButton>
                  <PlayerButton
                    label={mini ? "Exit mini player" : "Mini player"}
                    onClick={() => {
                      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
                      setMini((value) => !value);
                    }}
                    active={mini}
                  >
                    <PictureInPicture2 className="h-4 w-4" />
                  </PlayerButton>
                  <PlayerButton label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
                    {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </PlayerButton>
                </div>
              </div>
            </div>
          ) : null}
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

            {/* Single Copy Link & Open to Download Button */}
            <button
              type="button"
              disabled={isFetchingLink}
              onClick={handleCopyAndOpenLink}
              className="relative mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 font-bold text-black shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-75"
            >
              {isFetchingLink ? (
                <span className="flex items-center gap-2 text-sm font-bold text-black">
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  Fetching link...
                </span>
              ) : copiedLink ? (
                <span className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-800">
                  <ExternalLink className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>Open Link to Download Video ({QUALITY_LABELS[selectedQuality] ?? selectedQuality})</span>
                </span>
              ) : (
                <span className="flex items-center gap-2 text-xs sm:text-sm font-bold text-black">
                  <Copy className="h-4 w-4 text-black shrink-0" />
                  <span>Copy Link & Open to Download ({QUALITY_LABELS[selectedQuality] ?? selectedQuality})</span>
                </span>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SkipGlyph({ direction }: { direction: "back" | "forward" }) {
  return (
    <span className="relative grid size-5 place-items-center">
      {direction === "back" ? (
        <RotateCcw className="absolute h-5 w-5" aria-hidden="true" />
      ) : (
        <RotateCw className="absolute h-5 w-5" aria-hidden="true" />
      )}
      <span className="relative text-[8px] font-bold leading-none">10</span>
    </span>
  );
}

function SkipButton({
  label,
  onClick,
  direction,
}: {
  label: string;
  onClick: () => void;
  direction: "back" | "forward";
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.currentTarget.blur();
        onClick();
      }}
      aria-label={label}
      title={label}
      className="grid size-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-transform duration-200 hover:scale-105 active:scale-90 hover:bg-black/65 sm:size-12"
    >
      <span className="relative grid size-6 place-items-center">
        {direction === "back" ? (
          <RotateCcw className="absolute h-6 w-6" aria-hidden="true" />
        ) : (
          <RotateCw className="absolute h-6 w-6" aria-hidden="true" />
        )}
        <span className="relative text-[9px] font-bold leading-none">10</span>
      </span>
    </button>
  );
}

function ShakaSettingsMenu({
  open,
  view,
  setView,
  quality,
  qualities,
  qualityList,
  rate,
  rates,
  applyQuality,
  applyRate,
  onClose,
  panelRef,
}: {
  open: boolean;
  view: "root" | "quality" | "speed";
  setView: (v: "root" | "quality" | "speed") => void;
  quality: string;
  qualities: string[];
  qualityList: string[];
  rate: number;
  rates: number[];
  applyQuality: (q: string) => void;
  applyRate: (r: number) => void;
  onClose: () => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className={`absolute bottom-11 right-0 z-50 w-[190px] sm:w-52 max-w-[calc(100vw-2rem)] origin-bottom-right overflow-hidden rounded-2xl border border-white/15 bg-[#0e0e13]/95 text-white shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-all duration-200 ease-out ${
        open
          ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-3 scale-95 opacity-0"
      }`}
      aria-hidden={!open}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] sm:text-xs">
        {view === "root" ? (
          <div className="flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold uppercase tracking-wider text-white">Settings</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setView("root")}
            className="flex items-center gap-1 font-semibold text-white/90 transition-colors hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">{view === "quality" ? "Quality" : "Speed"}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="grid size-5 place-items-center rounded-full bg-white/5 text-white/60 transition-colors hover:bg-white/15 hover:text-white"
          aria-label="Close settings"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Body Views */}
      <div ref={panelRef} className="p-1 hide-scrollbar max-h-[min(13rem,42vh)] overflow-y-auto">
        {view === "root" && (
          <div key="root-menu" className="space-y-0.5 animate-fade-in">
            {/* Quality Row */}
            <button
              type="button"
              onClick={() => setView("quality")}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[11px] sm:text-xs font-medium text-white transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Film className="h-3.5 w-3.5 text-white/70" />
                <span>Quality</span>
              </div>
              <div className="flex items-center gap-1 text-white/60 font-semibold">
                <span className="truncate max-w-[70px]">{QUALITY_LABELS[quality] ?? quality}</span>
                {HD_QUALITIES.has(quality) && (
                  <span className="rounded bg-primary/30 px-1 py-0.2 text-[8px] font-bold text-primary-foreground">
                    HD
                  </span>
                )}
                <ChevronRight className="h-3 w-3 text-white/40" />
              </div>
            </button>

            {/* Speed Row */}
            <button
              type="button"
              onClick={() => setView("speed")}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-[11px] sm:text-xs font-medium text-white transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-white/70" />
                <span>Speed</span>
              </div>
              <div className="flex items-center gap-1 text-white/60 font-semibold">
                <span>{RATE_LABELS[rate] ?? `${rate}×`}</span>
                <ChevronRight className="h-3 w-3 text-white/40" />
              </div>
            </button>
          </div>
        )}

        {view === "quality" && (
          <div key="quality-menu" className="space-y-0.5 animate-fade-in">
            {qualityList.map((level) => {
              const isSelected = quality === level;
              const isHd = HD_QUALITIES.has(level);
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    applyQuality(level);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] sm:text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-primary/25 text-white font-semibold ring-1 ring-primary/60"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-3.5 place-items-center">
                      {isSelected ? <Check className="h-3 w-3 text-primary" /> : null}
                    </span>
                    <span>{QUALITY_LABELS[level] ?? level}</span>
                  </div>
                  {isHd ? (
                    <span className="rounded bg-primary/30 px-1 py-0.2 text-[8px] font-bold tracking-wider text-primary-foreground">
                      HD
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        {view === "speed" && (
          <div key="speed-menu" className="space-y-0.5 animate-fade-in">
            {rates.map((value) => {
              const isSelected = rate === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    applyRate(value);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] sm:text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-primary/25 text-white font-semibold ring-1 ring-primary/60"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-3.5 place-items-center">
                      {isSelected ? <Check className="h-3 w-3 text-primary" /> : null}
                    </span>
                    <span>{RATE_LABELS[value] ?? `${value}×`}</span>
                  </div>
                  {value === 1 ? (
                    <span className="text-[9px] font-medium text-white/40">Normal</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.currentTarget.blur();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-full text-white transition-colors active:scale-90 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:size-9 ${
        active ? "bg-white/25" : "bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
