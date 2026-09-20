// Shared India's Got Latent catalogue data.
import epS1e1 from "@/assets/season-1/episodes/ep-s1e1.webp";
import epS1e10 from "@/assets/season-1/episodes/ep-s1e10.webp";
import epS1e11 from "@/assets/season-1/episodes/ep-s1e11.webp";
import epS1e12 from "@/assets/season-1/episodes/ep-s1e12.webp";
import epS1e2 from "@/assets/season-1/episodes/ep-s1e2.webp";
import epS1e3 from "@/assets/season-1/episodes/ep-s1e3.webp";
import epS1e4 from "@/assets/season-1/episodes/ep-s1e4.webp";
import epS1e5 from "@/assets/season-1/episodes/ep-s1e5.webp";
import epS1e6 from "@/assets/season-1/episodes/ep-s1e6.webp";
import epS1e7 from "@/assets/season-1/episodes/ep-s1e7.webp";
import epS1e8 from "@/assets/season-1/episodes/ep-s1e8.webp";
import epS1e9 from "@/assets/season-1/episodes/ep-s1e9.webp";
import s1Bonus1 from "@/assets/season-1/bonus-clips/s1-bonus-1.webp";
import s1Bonus2 from "@/assets/season-1/bonus-clips/s1-bonus-2.webp";
import s1Bonus3 from "@/assets/season-1/bonus-clips/s1-bonus-3.webp";
import s1Bonus4 from "@/assets/season-1/bonus-clips/s1-bonus-4.webp";
import s1Bonus5 from "@/assets/season-1/bonus-clips/s1-bonus-5.webp";
import s1Bonus6 from "@/assets/season-1/bonus-clips/s1-bonus-6.webp";
import s1DeepakDeleted from "@/assets/season-1/extra-deleted/s1-deepak-deleted.webp";
import s1DiscardedEp1 from "@/assets/season-1/extra-deleted/s1-discarded-ep-1.webp";
import s1Ep1To3Deleted from "@/assets/season-1/extra-deleted/s1-ep-1-3-deleted.webp";
import s1RaghuDeleted from "@/assets/season-1/extra-deleted/s1-raghu-deleted.webp";
import epS2e1 from "@/assets/season-2/episodes/ep-s2e1.webp";
import epS2e2 from "@/assets/season-2/episodes/ep-s2e2.webp";
import epS2e3 from "@/assets/season-2/episodes/ep-s2e3.webp";
import epS2e4 from "@/assets/season-2/episodes/ep-s2e4.webp";
import epS2e5 from "@/assets/season-2/episodes/ep-s2e5.webp";
import epS2e6 from "@/assets/season-2/episodes/ep-s2e7.webp";
import s2BtsAlia from "@/assets/season-2/bts/s2-bts-alia.webp";
import s2BtsChandan from "@/assets/season-2/bts/s2-bts-chandan.webp";
import s2BtsKaran from "@/assets/season-2/bts/s2-bts-karan.webp";
import s2BtsRaghu from "@/assets/season-2/bts/s2-bts-raghu.webp";
import s2BonusEp1 from "@/assets/season-2/bonus/s2-bonus-ep1.webp";
import s2BonusEp2 from "@/assets/season-2/bonus/s2-bonus-ep2.webp";
import s2BonusEp3 from "@/assets/season-2/bonus/s2-bonus-ep3.webp";
import s2BonusKaran from "@/assets/season-2/bonus/s2-bonus-karan.webp";
import s2ExclusiveVarun from "@/assets/season-2/bonus/s2-exclusive-varun.webp";
import latentArtwork from "@/assets/logo/indias-got-latent-logo.webp";
import latentIcon from "@/assets/logo/latent-a-icon.webp";
import stillAliveIcon from "@/assets/logo/still-alive-logo.webp";
import titleArtwork from "@/assets/logo/still-alive-title.webp";

export type LatentEpisode = {
  title: string;
  guests: string;
  description: string;
  duration: string;
  thumbnail?: string;
  /** YouTube video id when the video is publicly available on Samay Raina's channel. */
  youtubeId?: string;
  /** OK CDN stream id for proxied video playback. */
  okcdnId?: string;
};

// Listed latest-first; the rank numbers count down so the newest episode is on top.
export const LATENT_SEASONS: { "Season 2": LatentEpisode[]; "Season 1": LatentEpisode[] } = {
  "Season 2": [
    {
      title: "Episode 7",
      guests: "Ft. Nawazuddin Siddiqui, Bhuvan Bam, Mukesh Chhabra & Kaustubh Agarwal",
      description: "Nawazuddin Siddiqui, Bhuvan Bam, Mukesh Chhabra and Kaustubh Agarwal join the judges' panel for Episode 7 of Season 2.",
      duration: "50m",
      thumbnail: "https://i.ytimg.com/vi/rkKZIMPecRA/hqdefault.jpg",
      youtubeId: "rkKZIMPecRA",
      okcdnId: "6aad50f97039736e7082266c",
    },
    {
      title: "Episode 6",
      guests: "Ft. Rakhi Sawant, Ashneer Grover & Kushagra Srivastava",
      description: "Rakhi Sawant, Ashneer Grover and Kushagra Srivastava take the panel for a night of unfiltered confessions and chaotic performances.",
      duration: "58m",
      thumbnail: epS2e6,
      youtubeId: "zbIr24Tes7E",
      okcdnId: "6a9d7adc5882d566ebfc00e6",
    },
    {
      title: "Episode 5",
      guests: "Ft. Orry, Archana Puran Singh, Sharon Verma & Nishant Suri",
      description: "Orry and Archana Puran Singh judge a wild lineup of comedy, music and everything in between, with Chello Meme taking the win.",
      duration: "51m",
      thumbnail: epS2e5,
      youtubeId: "VJ9VC9OqdAA",
    },
    {
      title: "Episode 4",
      guests: "Ft. Karan Aujla, Tanmay Bhat, Gurleen Pannu & Rahul Dua",
      description: "Karan Aujla and Tanmay Bhat join the panel for an evening of desi beats, daring acts and brutal honesty.",
      duration: "56m",
      thumbnail: epS2e4,
      youtubeId: "B6NVvtIz9_Q",
    },
    {
      title: "Episode 3",
      guests: "Ft. Raghu Ram, Vishal Dadlani, Tanmay Bhat & Yashraj",
      description: "Musicians and comedians grace the panel as performers bring comedy, acrobatics and mimicry to the stage.",
      duration: "53m",
      thumbnail: epS2e3,
      youtubeId: "aSR1tndcaLE",
    },
    {
      title: "Episode 2",
      guests: "Ft. Harssh Limbachiyaa, Kiku Sharda & Chandan Prabhakar",
      description: "Indian comedy icons turn the judges' table into a comedy stage of its own.",
      duration: "49m",
      thumbnail: epS2e2,
      youtubeId: "c35fpGWqXnk",
    },
    {
      title: "Episode 1",
      guests: "Ft. Alia Bhatt, Sharvari & Aashish Solanki",
      description: "Alia Bhatt and Sharvari kick off Season 2 with surprise acts, candid laughs and unexpected talent.",
      duration: "52m",
      thumbnail: epS2e1,
      youtubeId: "eHTXQW58WhA",
    },
  ],
  "Season 1": [
    {
      title: "Episode 12",
      guests: "Ft. Rakhi Sawant & Ashish Solanki",
      description: "Rakhi Sawant closes the season with trademark drama, dance and unfiltered opinions.",
      duration: "55m",
      thumbnail: epS1e12,
      okcdnId: "6a49676ce935fd57e597eaa8",
    },
    {
      title: "Episode 11",
      guests: "Ft. Bharti Singh & Haarsh Limbachiyaa",
      description: "Bharti Singh and Haarsh Limbachiyaa bring non-stop laughter as the talent gets bolder.",
      duration: "50m",
      thumbnail: epS1e11,
      okcdnId: "6a49676c4274763d6c8713cf",
    },
    {
      title: "Episode 10",
      guests: "Ft. Raghu Ram & Tanmay Bhat",
      description: "Raghu Ram and Tanmay Bhat judge a fierce lineup of comics, singers and risk-takers.",
      duration: "53m",
      thumbnail: epS1e10,
      okcdnId: "6a49676c23afe77917dc5943",
    },
    {
      title: "Episode 9",
      guests: "Ft. Deepak Kalal & Manan Desai",
      description: "Deepak Kalal brings the chaos while Manan Desai keeps the score honest.",
      duration: "47m",
      thumbnail: epS1e9,
      okcdnId: "6a49676c2b36b8295078df6d",
    },
    {
      title: "Episode 8",
      guests: "Ft. Poonam Pandey & Vidit C",
      description: "Poonam Pandey joins the panel for an episode packed with surprises and viral moments.",
      duration: "48m",
      thumbnail: epS1e8,
      okcdnId: "6a49676b2e8cca26baa7d2e7",
    },
    {
      title: "Episode 7",
      guests: "Ft. Ravi Gupta & Rahgir",
      description: "Ravi Gupta and Rahgir watch performers push the limits of comedy and courage.",
      duration: "46m",
      thumbnail: epS1e7,
      okcdnId: "6a49676cdbaaca2133ee721b",
    },
    {
      title: "Episode 6",
      guests: "Ft. Vipul Goyal & Joke Singh",
      description: "Vipul Goyal and Joke Singh bring veteran comic timing to the judges' table.",
      duration: "45m",
      thumbnail: epS1e6,
      okcdnId: "6a49676c5ec2671d97cf1dd3",
    },
    {
      title: "Episode 5",
      guests: "Ft. Kunal Kamra & Atul Khatri",
      description: "Kunal Kamra and Atul Khatri judge sharp stand-up, music and offbeat talent.",
      duration: "49m",
      thumbnail: epS1e5,
      okcdnId: "6a49676c62393b16a55735c0",
    },
    {
      title: "Episode 4",
      guests: "Ft. Maheep Singh",
      description: "Maheep Singh joins Samay for a quieter, quirkier round of latent talent.",
      duration: "44m",
      thumbnail: epS1e4,
      okcdnId: "6a49676c98fe8b6afe50e2a7",
    },
    {
      title: "Episode 3",
      guests: "Ft. Urfi Javed & Ashish Solanki",
      description: "Urfi Javed and Ashish Solanki react to bold acts and even bolder claims.",
      duration: "48m",
      thumbnail: epS1e3,
      okcdnId: "6a49676c8aaeb63c7a4ef62c",
    },
    {
      title: "Episode 2",
      guests: "Ft. GamerFleet",
      description: "GamerFleet joins the panel as gaming meets stand-up on the Latent stage.",
      duration: "43m",
      thumbnail: epS1e2,
      okcdnId: "6a49676cb912b9327f5a4bf5",
    },
    {
      title: "Episode 1",
      guests: "Ft. Raftaar",
      description: "Raftaar kicks off India's Got Latent with rap, rhythm and raw first performances.",
      duration: "47m",
      thumbnail: epS1e1,
      okcdnId: "6a49676cf134a535fd386918",
    },
  ],
};

export type ContentTab = "episodes" | "bts" | "bonus" | "extra";

export const SEASON_TABS: Record<keyof typeof LATENT_SEASONS, { value: ContentTab; label: string }[]> = {
  "Season 2": [
    { value: "episodes", label: "Episodes" },
    { value: "bts", label: "BTS" },
    { value: "bonus", label: "Bonus Episodes" },
  ],
  "Season 1": [
    { value: "episodes", label: "Episodes" },
    { value: "bonus", label: "Bonus Clips" },
    { value: "extra", label: "Extra & Deleted" },
  ],
};

export const LATENT_EXTRAS: Record<keyof typeof LATENT_SEASONS, Partial<Record<ContentTab, LatentEpisode[]>>> = {
  "Season 2": {
    bts: [
      {
        title: "Raghu Ram, Tanmay Bhat & Vishal Dadlani",
        guests: "",
        description: "Go behind the scenes of Season 2 with Raghu Ram, Tanmay Bhat and Vishal Dadlani.",
        duration: "10:08",
        thumbnail: s2BtsRaghu,
        okcdnId: "6a6765b27e26e1158fe969dc",
      },
      {
        title: "Chandan Prabhakar, Harssh Limbachyaa & Kiku Sharda",
        guests: "",
        description: "Go behind the scenes of Season 2 with Chandan Prabhakar, Harssh Limbachyaa and Kiku Sharda.",
        duration: "15:05",
        thumbnail: s2BtsChandan,
        okcdnId: "6a4a0a800909a02b8128bd83",
      },
      {
        title: "Alia Bhatt, Sharvari & Ashish Solanki",
        guests: "",
        description: "Go behind the scenes of Season 2 with Alia Bhatt, Sharvari and Ashish Solanki.",
        duration: "17:17",
        thumbnail: s2BtsAlia,
        youtubeId: "DlIKbE46pUk",
        okcdnId: "6a4aace463598c4c04e00d80",
      },
      {
        title: "Karan Aujla, Tanmay Bhat, Gurleen Pannu & Rahul Dua",
        guests: "",
        description: "Go behind the scenes of Season 2 with Karan Aujla, Tanmay Bhat, Gurleen Pannu and Rahul Dua.",
        duration: "14:49",
        thumbnail: s2BtsKaran,
        okcdnId: "6a76ebfabde0880a224707d6",
      },
    ],
    bonus: [
      {
        title: "S2 Bonus EP3 ft. Deepak Kalal, Ravi Gupta and Agu Stanley",
        guests: "Ft. Deepak Kalal, Ravi Gupta & Agu Stanley",
        description:
          "Guests Deepak Kalal, Ravi Gupta and Agu Stanley join Samay to hilariously critique India's latent talents.",
        duration: "47m",
        thumbnail: s2BonusEp3,
        youtubeId: "fzyL44FH2fI",
        okcdnId: "6aa68187d576db122c00226f",
      },
      {
        title: "Netflix Exclusive Episode ft. Varun Dhawan, Medha Shankr, Nishant Tanwar & Sharon Verma",
        guests: "Ft. Varun Dhawan, Medha Shankr, Sharon Verma & Nishant Tanwar",
        description:
          "Guests Varun Dhawan, Medha Shankr, Sharon Verma & Nishant Tanwar join Samay to hilariously critique India's latent talents.",
        duration: "54m",
        thumbnail: s2ExclusiveVarun,
        youtubeId: "WE1zey_q8Ak",
        okcdnId: "6a9ad189a0818f1f0a6267df",
      },
      {
        title: "S2 Bonus EP2 ft. Badshah, Sourav Joshi, Harssh Limbachiyaa, Rajat Sood",
        guests: "Ft. Badshah, Sourav Joshi, Harssh Limbachiyaa & Rajat Sood",
        description:
          "Guests Badshah, Sourav, Harssh and Rajat join Samay to hilariously critique India's latent talents.",
        duration: "52m",
        thumbnail: s2BonusEp2,
        okcdnId: "6a79d5f8e611d23b16b21d63",
      },
      {
        title: "Bonus Clip ft. Karan Aujla, Tanmay Bhat, Gurleen Pannu, Rahul Dua",
        guests: "Ft. Karan Aujla, Tanmay Bhat, Gurleen Pannu & Rahul Dua",
        description:
          "Guests Karan, Tanmay, Gurleen and Rahul join Samay to hilariously critique India's latent talents.",
        duration: "8m 23s",
        thumbnail: s2BonusKaran,
        okcdnId: "6a6f8f217112c4615867f8a8",
      },
      {
        title: "S2 Bonus EP1 ft. Raghav Juyal, Munawar, Niharika NM, Rohan Joshi",
        guests: "Ft. Raghav Juyal, Munawar, Niharika NM & Rohan Joshi",
        description:
          "Guests Raghav, Munawar, Niharika and Rohan join Samay to hilariously critique India's latent talents.",
        duration: "57m",
        thumbnail: s2BonusEp1,
        okcdnId: "6a6771299e17237ef9696702",
      },
    ],
  },
  "Season 1": {
    bonus: [
      {
        title: "Bonus EP 6",
        guests: "Ft. Ashish, Ranveer, Jaspreet & Apoorva",
        description: "Ashish, Ranveer, Jaspreet and Apoorva join Samay to hilariously critique India's latent talents.",
        duration: "1h 3m",
        thumbnail: s1Bonus6,
        okcdnId: "6a49676c23afe77917dc5942",
      },
      {
        title: "Bonus EP 5",
        guests: "Ft. Rohan, Sahil, Vaibhav & Chandni",
        description: "Rohan, Sahil, Vaibhav and Chandni join Samay to hilariously critique India's latent talents.",
        duration: "1h 29m",
        thumbnail: s1Bonus5,
        okcdnId: "6a49676c19429418c7a0165c",
      },
      {
        title: "Bonus EP 4",
        guests: "Ft. Calm, Encore, Madhur & Kaustub",
        description: "Calm, Encore, Madhur and Kaustub join Samay and Balraj to hilariously critique India's latent talents.",
        duration: "1h 12m",
        thumbnail: s1Bonus4,
        okcdnId: "6a49676c8000507d4d256380",
      },
      {
        title: "Bonus EP 3",
        guests: "Ft. Avika, Devesh & Shashwat",
        description: "Avika, Devesh and Shashwat join Samay and Balraj to hilariously critique India's latent talents.",
        duration: "54m",
        thumbnail: s1Bonus3,
        okcdnId: "6a49676c98fe8b6afe50e356",
      },
      {
        title: "Bonus EP 2",
        guests: "Ft. Badshah, Siddhant & Khamba",
        description: "Badshah, Siddhant and Khamba join Samay and Balraj to hilariously critique India's latent talents.",
        duration: "52m",
        thumbnail: s1Bonus2,
        okcdnId: "6a49676c8aaeb63c7a4ef667",
      },
      {
        title: "Bonus EP 1",
        guests: "Ft. Arpit Bala, Bhappa, Sahil & Amin",
        description: "Arpit Bala, Bhappa, Sahil and Amin join Samay and Balraj to hilariously critique India's latent talents.",
        duration: "36m",
        thumbnail: s1Bonus1,
        okcdnId: "6a49676c58c3b629cc87178d",
      },
    ],
    extra: [
      {
        title: "Discarded EP 1",
        guests: "Ft. Aakash, Mallika, Pratyush, Anubhav, Gurleen & Yashraj",
        description: "Aakash, Mallika, Pratyush, Anubhav, Gurleen and Yashraj join Samay and Balraj to hilariously critique India's latent talents.",
        duration: "27m",
        thumbnail: s1DiscardedEp1,
        okcdnId: "6a49676c5e72ba3125ce81a6",
      },
      {
        title: "Raghu Ram Episode Deleted Moments",
        guests: "Ft. Tanmay, Raghu & Sid",
        description: "Episode 10 deleted moments featuring Tanmay, Raghu and Sid alongside Samay and Balraj.",
        duration: "34m",
        thumbnail: s1RaghuDeleted,
        okcdnId: "6a49676b4274763d6c87135a",
      },
      {
        title: "Deepak Kalal Episode Deleted Moments",
        guests: "Ft. Deepak, Manan & Agu",
        description: "Episode 9 deleted moments featuring Deepak, Manan and Agu alongside Samay and Balraj.",
        duration: "36m",
        thumbnail: s1DeepakDeleted,
        okcdnId: "6a49676cfb0e2d59c3fe99e8",
      },
      {
        title: "Ep 1-3 Deleted Moments",
        guests: "Episodes 1, 2 & 3",
        description: "Deleted moments collected from the first three episodes of India's Got Latent.",
        duration: "39m",
        thumbnail: s1Ep1To3Deleted,
        okcdnId: "6a49676c63598c4c04197757",
      },
    ],
  },
};


export const SEASON_SLUGS: Record<keyof typeof LATENT_SEASONS, string> = {
  "Season 1": "1",
  "Season 2": "2",
};

export function seasonKeyFromSlug(slug: string): keyof typeof LATENT_SEASONS | null {
  if (slug === "1") return "Season 1";
  if (slug === "2") return "Season 2";
  return null;
}

export function getSectionEpisodes(
  season: keyof typeof LATENT_SEASONS,
  tab: ContentTab,
): LatentEpisode[] {
  return tab === "episodes" ? LATENT_SEASONS[season] : (LATENT_EXTRAS[season][tab] ?? []);
}

export function episodeSlug(rank: number) {
  return String(rank).padStart(2, "0");
}

export function formatEpisodeTitle(episode: LatentEpisode): string {
  if (!episode) return "";
  let title = (episode.title || "").trim();
  let guests = (episode.guests || "").trim();

  if (!guests) return title;

  const cleanGuests = guests.replace(/^ft\.?\s*/i, "").trim();
  const lowerTitle = title.toLowerCase();
  const lowerCleanGuests = cleanGuests.toLowerCase();

  if (lowerCleanGuests && (lowerTitle.includes(lowerCleanGuests) || lowerTitle.includes("ft.") || lowerTitle.includes("featuring"))) {
    return title;
  }

  return `${title}: ${guests}`;
}
