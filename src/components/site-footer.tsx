import { Link } from "@tanstack/react-router";

import latentArtwork from "@/assets/logo/indias-got-latent-logo.webp";
import latentIcon from "@/assets/logo/latent-a-icon.webp";
import stillAliveIcon from "@/assets/logo/still-alive-logo.webp";

const TELEGRAM_HANDLE = "Hunter_X_Coder";
const TELEGRAM_URL = `https://t.me/${TELEGRAM_HANDLE}`;

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/70 bg-card/30">
      <div className="mx-auto max-w-[1728px] px-5 py-12 sm:px-8 lg:px-12 xl:px-[72px]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <img src={latentIcon} alt="" className="h-10 w-10 shrink-0 object-contain" />
              <img src={latentArtwork} alt="India's Got Latent" className="h-8 w-auto shrink-0 object-contain" />
            </div>
            <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">
              Here you can access premium content for free! An unofficial, fan-made archive bringing together all episodes, BTS, and exclusive bonus drops of <span className="font-semibold text-foreground">India's Got Latent</span> for everyone to enjoy without any paywalls.
            </p>
            <p className="mt-3 max-w-xl text-xs leading-5 text-muted-foreground">
              All show names, artwork, thumbnails and videos belong to their respective creators
              and owners. No affiliation with Samay Raina or the show's team. Made purely out of
              fandom, with no ads and nothing for sale.
            </p>
          </div>

          <nav className="min-w-0" aria-label="Footer">
            <h3 className="font-heading text-[18px] uppercase tracking-[0.04em] text-foreground">Browse</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="transition-colors hover:text-foreground">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/season-{$season}/$tab/$episode"
                  params={{ season: "2", tab: "episodes", episode: "06" }}
                  className="transition-colors hover:text-foreground"
                >
                  Season 2 episodes
                </Link>
              </li>
              <li>
                <Link
                  to="/season-{$season}/$tab/$episode"
                  params={{ season: "2", tab: "bts", episode: "04" }}
                  className="transition-colors hover:text-foreground"
                >
                  Season 2 BTS
                </Link>
              </li>
              <li>
                <Link
                  to="/season-{$season}/$tab/$episode"
                  params={{ season: "1", tab: "episodes", episode: "12" }}
                  className="transition-colors hover:text-foreground"
                >
                  Season 1 episodes
                </Link>
              </li>
              <li>
                <a
                  href="https://www.youtube.com/@SamayRainaOfficial"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="transition-colors hover:text-foreground"
                >
                  Samay Raina on YouTube
                </a>
              </li>
            </ul>
          </nav>

          <div className="min-w-0">
            <h3 className="font-heading text-[18px] uppercase tracking-[0.04em] text-foreground">Talk to us</h3>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              Spotted a missing episode, a broken link or a wrong thumbnail? Slide into the DMs and
              it gets fixed.
            </p>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg className="h-4 w-4 fill-current text-sky-400" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .54-1.43.53-.47-.01-1.37-.27-2.04-.49-.82-.27-1.47-.42-1.42-.88.03-.24.37-.49 1.02-.74 3.99-1.74 6.66-2.89 8.01-3.45 3.81-1.59 4.6-.1.87 4.6.87z" />
              </svg>
              @{TELEGRAM_HANDLE}
            </a>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-t border-border/70 pt-6">
          <img src={stillAliveIcon} alt="" className="h-8 w-8 shrink-0 object-contain" />
          <p className="min-w-0 text-xs text-muted-foreground">
            Fan-made archive · Not affiliated with the show · Built by{" "}
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              @{TELEGRAM_HANDLE}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
