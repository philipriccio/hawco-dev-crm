import { PrismaClient, BuyerSlateStatus, CompanyType } from "@prisma/client";

const prisma = new PrismaClient();

type BuyerSeed = {
  id: string;
  name: string;
  brands?: string | null;
  region?: string | null;
  lookingFor?: string | null;
};

type SlateSeed = {
  buyerId: string;
  title: string;
  status: BuyerSlateStatus;
  productionCompany?: string | null;
  source: string;
  sourceUrl: string;
  notes: string;
};

const buyers: BuyerSeed[] = [
  {
    id: "rogers-sports-media",
    name: "Rogers Sports & Media",
    brands:
      "Citytv, Citytv+, Discovery Canada, Sportsnet, OMNI, FX, HGTV, Food Network, Bravo",
    region: "Canada",
    lookingFor:
      "Canadian originals across Citytv scripted, Discovery factual/adventure, lifestyle, sports-adjacent and broad commercial entertainment. Track current commissioning under Rogers Sports & Media / Citytv / Discovery Canada.",
  },
];

const staleSeededTitles: Array<{
  buyerId: string;
  title: string;
  reason: string;
}> = [
  // First-pass platform-only / weak entries.
  {
    buyerId: "disney-plus-canada",
    title: "Vampirina: Teenage Vampire",
    reason:
      "Platform-original availability only; not useful Canada buyer intelligence.",
  },
  {
    buyerId: "disney-plus-canada",
    title: "Percy Jackson and the Olympians S2",
    reason:
      "Older/platform availability; replaced by S3 Vancouver production footprint.",
  },
  {
    buyerId: "disney-plus-canada",
    title: "Disney+ June 2026 programming slate",
    reason:
      "Platform scheduling, not Canadian buyer/commissioning intelligence.",
  },
  {
    buyerId: "bellmedia",
    title: "Hockey Fanatics",
    reason: "Older/slate item; not fresh enough for buyer intelligence.",
  },

  // CBC returning-season entries Philip correctly flagged as old news / not useful buyer intel.
  {
    buyerId: "cbc",
    title: "Son of a Critch S5 / Final Season",
    reason:
      "Known returning Hawco/Project 10 production; old news to Hawco and not useful buyer intelligence.",
  },
  {
    buyerId: "cbc",
    title: "Son of a Critch S5",
    reason:
      "Known returning Hawco/Project 10 production from older seed title; old news to Hawco and not useful buyer intelligence.",
  },
  {
    buyerId: "cbc",
    title: "North of North S2",
    reason:
      "Returning-season entry; keep off current buyer intel unless tied to new commissioning insight.",
  },
  {
    buyerId: "cbc",
    title: "Saint-Pierre S2",
    reason:
      "Known Hawco returning production; old news to Hawco and not useful buyer intelligence.",
  },
  {
    buyerId: "cbc",
    title: "Small Achievable Goals S2",
    reason: "Returning-season entry from older slate.",
  },
  {
    buyerId: "cbc",
    title: "Wild Cards S3",
    reason: "Returning-season entry from older slate.",
  },
  {
    buyerId: "cbc",
    title: "Allegiance S3",
    reason: "Returning-season entry from older slate.",
  },
  {
    buyerId: "cbc",
    title: "Heartland S19",
    reason:
      "Long-running returning-franchise entry; not fresh buyer intelligence.",
  },
  {
    buyerId: "cbc",
    title: "Murdoch Mysteries S19",
    reason:
      "Long-running returning-franchise entry; not fresh buyer intelligence.",
  },
  {
    buyerId: "cbc",
    title: "Plan B S3",
    reason: "Returning-season entry from older slate.",
  },

  // Older retained Bell/Netflix items from the first pass that should not masquerade as fresh news.
  {
    buyerId: "bellmedia",
    title: "Slo Pitch",
    reason:
      "Older slate/development item; remove unless there is fresh production/launch news.",
  },
  {
    buyerId: "bellmedia",
    title: "The Borderline",
    reason:
      "Older slate/development item; remove unless there is fresh production/launch news.",
  },
  {
    buyerId: "bellmedia",
    title: "Anna Pigeon",
    reason:
      "Older co-commission slate item; remove unless there is fresh production/launch news.",
  },
  {
    buyerId: "bellmedia",
    title: "Heated Rivalry",
    reason:
      "2025 slate item; remove from the fresh-news slate unless there is a new 2026 update.",
  },
  {
    buyerId: "bellmedia",
    title: "Yaga",
    reason:
      "Earlier slate/sales item; not fresh enough for the current-news buyer view.",
  },
  {
    buyerId: "bellmedia",
    title: "I Kill the Bear",
    reason:
      "Earlier production item; keep off fresh-news view unless new launch/production update emerges.",
  },
  {
    buyerId: "netflix-canada",
    title: "North of North S2",
    reason:
      "Returning co-commission entry; remove from fresh-news view unless there is new Netflix-specific commissioning insight.",
  },
  {
    buyerId: "netflix-canada",
    title: "Wayward",
    reason:
      "Released 2025 production-success signal; useful context but old news for a current buyer slate.",
  },
  {
    buyerId: "netflix-canada",
    title: "Netflix Upfront 2026 slate / Canada ad expansion",
    reason:
      "Ad/platform strategy, not Canadian scripted/unscripted buyer slate intelligence.",
  },
];

const slate: SlateSeed[] = [
  {
    buyerId: "cbc",
    title: "Committed",
    status: "GREENLIT",
    productionCompany: "Cameron Pictures; Fabel Productions",
    source: "CBC Media Centre",
    sourceUrl:
      "https://mediacentre.cbc.ca/announcement/5690/cbc-and-bbc-northern-ireland-greenlight-new-romantic-comedy-series-committed-starring-dustin-milligan-and-diona-doherty/",
    notes:
      "Fresh CBC scripted commissioning signal: CBC/BBC Northern Ireland original romantic comedy, 10x30, filming in County Down with Hamilton scenes; winter 2027 CBC/CBC Gem; FOX global distribution.",
  },
  {
    buyerId: "cbc",
    title: "CBC documentary investment + FAST channel",
    status: "ANNOUNCED",
    productionCompany: null,
    source: "CBC Media Centre",
    sourceUrl:
      "https://mediacentre.cbc.ca/announcement/5696/cbc-to-increase-investment-in-documentary-storytelling-and-launch-new-fast-channel-this-fall/",
    notes:
      "Fresh buyer/mandate intelligence, not a show listing: CBC announced $7M increased documentary investment and a documentary FAST channel launching fall 2026; more details expected at Banff.",
  },
  {
    buyerId: "bellmedia",
    title: "I’m Not Here to Hurt You",
    status: "ANNOUNCED",
    productionCompany: "Blink49 Studios; Sony Pictures Television",
    source: "Bell Media / The Lede",
    sourceUrl:
      "https://www.bellmedia.ca/the-lede/press/sony-pictures-television-and-bell-media-announce-im-not-here-to-hurt-you-a-new-crave-original-drama-series-starring-freddie-highmore/",
    notes:
      "Fresh May 2026 premium scripted signal: new Crave Original drama created by David Shore and Freddie Highmore; first SPT/Bell Media co-commission; SPT handles U.S./international distribution.",
  },
  {
    buyerId: "bellmedia",
    title: "The Tom Green Farm",
    status: "ON_AIR",
    productionCompany: "Tom Green Productions Canada Inc.",
    source: "Bell Media / The Lede",
    sourceUrl:
      "https://www.bellmedia.ca/the-lede/press/crave-original-the-tom-green-farm-delivers-big-stars-rural-charm-in-new-talk-show-may-29/",
    notes:
      "Fresh May 2026 Crave Original unscripted/talk launch; first title from Bell/Tom Green co-development relationship.",
  },
  {
    buyerId: "bellmedia",
    title: "Queen of the Castle S2",
    status: "ON_AIR",
    productionCompany: "Blink49 Studios; Nest Productions",
    source: "Bell Media / The Lede",
    sourceUrl:
      "https://www.bellmedia.ca/the-lede/press/season-2-of-queen-of-the-castle-reclaims-its-throne-on-crave-beginning-may-29/",
    notes:
      "Fresh May 2026 CTV Original/Crave lifestyle-doc launch signal; produced by Blink49/Nest.",
  },
  {
    buyerId: "bellmedia",
    title: "Bon Cop Bad Cop",
    status: "ON_AIR",
    productionCompany: "Jessie Films; PaNik Fiction",
    source: "Bell Media / The Lede",
    sourceUrl:
      "https://www.bellmedia.ca/the-lede/press/may-7-13-crave-weekly-streaming-overview/",
    notes:
      "Fresh May 2026 Crave Original launch/franchise-extension signal; six-episode French-language series adaptation.",
  },
  {
    buyerId: "bellmedia",
    title: "Bell Media / Random Order Studios first-look deal",
    status: "ANNOUNCED",
    productionCompany: "Random Order Studios; Sphere Abacus",
    source: "Bell Media / The Lede",
    sourceUrl:
      "https://www.bellmedia.ca/the-lede/press/bell-media-and-random-order-studios-announce-development-and-first-look-agreement/",
    notes:
      "Fresh development/business signal: Bell Media and Random Order Studios expanded relationship with development/first-look arrangement for globally minded, culture-driven originals; Sphere Abacus first-look distribution.",
  },
  {
    buyerId: "netflix-canada",
    title: "This Summer Will Be Different",
    status: "GREENLIT",
    productionCompany: "Sphere Media",
    source: "Netflix Canada / industry reporting",
    sourceUrl:
      "https://www.whats-on-netflix.com/news/netflix-announces-series-this-summer-will-be-different-based-on-carley-fortunes-best-selling-novel/",
    notes:
      "Fresh 2026 Netflix Canada order: 10-episode Carley Fortune adaptation from Dane Clark and Linsey Stewart; Sphere Media; filming planned for PEI and Toronto. Treat as credible industry-reported until Netflix press page is available.",
  },
  {
    buyerId: "netflix-canada",
    title: "The Granville Girls",
    status: "GREENLIT",
    productionCompany: "Shaftesbury",
    source: "Netflix Canada / industry reporting",
    sourceUrl:
      "https://www.whats-on-netflix.com/news/the-granville-girls-netflix-everything-we-know-so-far/",
    notes:
      "Fresh/current production signal: Canadian Netflix Original period romance, showrunner Adriana Maggs, Shaftesbury/Christina Jennings; latest reporting says Canada filming begins May 2026 and runs into September.",
  },
  {
    buyerId: "netflix-canada",
    title: "Untitled Newfoundland project",
    status: "ANNOUNCED",
    productionCompany: null,
    source: "Netflix Canada slate reporting",
    sourceUrl:
      "https://fangirlish.com/2026/03/19/netflix-announces-the-summer-will-be-different/",
    notes:
      "Netflix Canada slate signal referenced alongside This Summer Will Be Different, North of North, Wayward, Who Killed the Montreal Expos?, and The Granville Girls. Needs primary-source follow-up before being treated as a production target.",
  },
  {
    buyerId: "disney-plus-canada",
    title: "Percy Jackson and the Olympians S3",
    status: "GREENLIT",
    productionCompany: "20th Television; The Gotham Group",
    source: "Disney+ Press",
    sourceUrl:
      "https://press.disneyplus.com/news/disney-plus-percy-jackson-and-the-olympians-season-three-first-look-binge-season-two",
    notes:
      "Only kept Disney item because it is a concrete Canadian production-footprint signal: Season 3 currently in production in Vancouver. Not a Disney+ Canada original-commissioning signal.",
  },
  {
    buyerId: "rogers-sports-media",
    title: "Law & Order Toronto: Criminal Intent S4",
    status: "GREENLIT",
    productionCompany:
      "Lark Productions; Cameron Pictures; Universal International Studios",
    source: "Rogers Sports & Media",
    sourceUrl:
      "https://about.rogers.com/news-ideas/citytv-orders-fourth-season-of-hit-canadian-drama-law-order-toronto-criminal-intent-and-announces-luke-kirby-as-new-detective/",
    notes:
      "Fresh May 19 2026 Citytv scripted order: season 4 in production in Toronto, Luke Kirby joins, fall 2026 premiere; current Rogers scripted commissioning signal.",
  },
  {
    buyerId: "rogers-sports-media",
    title: "Deadliest Catch: Northern Edge",
    status: "GREENLIT",
    productionCompany: "Attraction; Fremantle Original Productions",
    source: "Rogers Sports & Media",
    sourceUrl:
      "https://about.rogers.com/news-ideas/rogers-sports-media-greenlights-new-canadian-series-deadliest-catch-northern-edge-for-discovery-in-canada/",
    notes:
      "Fresh May 7 2026 Discovery Canada greenlight: 8x60 Canadian Deadliest Catch iteration, production underway in Newfoundland, Nova Scotia, and the North Atlantic; winter 2027 premiere.",
  },
  {
    buyerId: "rogers-sports-media",
    title: "Home Town Takeover Canada",
    status: "GREENLIT",
    productionCompany: "RTR Media",
    source: "Rogers Sports & Media",
    sourceUrl:
      "https://about.rogers.com/news-ideas/hgtv-seeks-extraordinary-canadian-small-town-to-star-in-new-series-home-town-takeover-canada/",
    notes:
      "Current Rogers/HGTV Canadian unscripted production signal: national small-town casting/search announced for Canadian format expansion; production in 2026 and fall 2026/winter 2027 window.",
  },
];

async function main() {
  for (const buyer of buyers) {
    await prisma.company.upsert({
      where: { id: buyer.id },
      create: {
        id: buyer.id,
        type: CompanyType.NETWORK,
        name: buyer.name,
        brands: buyer.brands ?? null,
        region: buyer.region ?? null,
        lookingFor: buyer.lookingFor ?? null,
        isBuyer: true,
      },
      update: {
        name: buyer.name,
        brands: buyer.brands ?? null,
        region: buyer.region ?? null,
        lookingFor: buyer.lookingFor ?? undefined,
        isBuyer: true,
      },
    });
  }

  let removed = 0;
  for (const stale of staleSeededTitles) {
    const item = await prisma.buyerSlateItem.findFirst({
      where: { buyerId: stale.buyerId, title: stale.title },
      include: { contacts: true },
    });
    if (item && item.contacts.length === 0) {
      await prisma.buyerSlateItem.delete({ where: { id: item.id } });
      removed += 1;
      console.log(
        `Removed stale seeded slate item: ${stale.buyerId} / ${stale.title} — ${stale.reason}`,
      );
    }
  }

  for (const item of slate) {
    const buyer = await prisma.company.findUnique({
      where: { id: item.buyerId },
      select: { id: true },
    });
    if (!buyer) {
      console.warn(`Skipping ${item.title}: buyer ${item.buyerId} not found`);
      continue;
    }
    const existing = await prisma.buyerSlateItem.findFirst({
      where: { buyerId: item.buyerId, title: item.title },
    });
    if (existing) {
      await prisma.buyerSlateItem.update({
        where: { id: existing.id },
        data: {
          status: item.status,
          productionCompany: item.productionCompany ?? null,
          source: item.source,
          sourceUrl: item.sourceUrl,
          notes: item.notes,
          confirmed: true,
        },
      });
    } else {
      await prisma.buyerSlateItem.create({
        data: {
          buyerId: item.buyerId,
          title: item.title,
          status: item.status,
          productionCompany: item.productionCompany ?? null,
          source: item.source,
          sourceUrl: item.sourceUrl,
          notes: item.notes,
          confirmed: true,
        },
      });
    }
  }
  console.log(
    `Seeded/updated ${slate.length} buyer slate items; removed ${removed} stale seeded items`,
  );
}

main().finally(async () => prisma.$disconnect());
