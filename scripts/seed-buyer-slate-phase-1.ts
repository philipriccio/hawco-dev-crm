import { PrismaClient, BuyerSlateStatus, CompanyType } from '@prisma/client'

const prisma = new PrismaClient()

type BuyerSeed = {
  id: string
  name: string
  brands?: string | null
  region?: string | null
  lookingFor?: string | null
}

type SlateSeed = {
  buyerId: string
  title: string
  status: BuyerSlateStatus
  productionCompany?: string | null
  source: string
  sourceUrl: string
  notes: string
}

const buyers: BuyerSeed[] = [
  {
    id: 'rogers-sports-media',
    name: 'Rogers Sports & Media',
    brands: 'Citytv, Citytv+, Discovery Canada, Sportsnet, OMNI, FX, HGTV, Food Network, Bravo',
    region: 'Canada',
    lookingFor: 'Canadian originals across Citytv scripted, Discovery factual/adventure, lifestyle, sports-adjacent and broad commercial entertainment. Track current commissioning under Rogers Sports & Media / Citytv / Discovery Canada.',
  },
]

const staleSeededTitles: Array<{ buyerId: string; title: string; reason: string }> = [
  { buyerId: 'disney-plus-canada', title: 'Vampirina: Teenage Vampire', reason: 'Not useful Canadian buyer intelligence; platform-original availability only.' },
  { buyerId: 'disney-plus-canada', title: 'Percy Jackson and the Olympians S2', reason: 'Older/platform availability; S3 production signal is the useful current item.' },
  { buyerId: 'bellmedia', title: 'Hockey Fanatics', reason: 'Older slate item; replaced by newer May 2026 Bell/Crave originals and launches.' },
]

const slate: SlateSeed[] = [
  {
    buyerId: 'cbc',
    title: 'Committed',
    status: 'GREENLIT',
    productionCompany: 'Cameron Pictures; Fabel Productions',
    source: 'CBC Media Centre',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5690/cbc-and-bbc-northern-ireland-greenlight-new-romantic-comedy-series-committed-starring-dustin-milligan-and-diona-doherty/',
    notes: 'New CBC/BBC Northern Ireland original romantic comedy, 10x30, filming in County Down with Hamilton, Ontario scenes; slated for CBC/CBC Gem winter 2027. Global distribution by FOX.',
  },
  {
    buyerId: 'cbc',
    title: 'Son of a Critch S5 / Final Season',
    status: 'GREENLIT',
    productionCompany: 'Project 10 Productions; Hawco Productions; Lionsgate Television',
    source: 'CBC Media Centre',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5693/son-of-a-critch-gets-ready-to-graduate-as-cameras-roll-on-the-final-season-of-the-coming-of-age-comedy/',
    notes: 'Season 5 is now confirmed as the fifth and final season; production underway in St. John’s until June 18; premieres fall 2026 on CBC/CBC Gem.',
  },
  {
    buyerId: 'cbc',
    title: 'North of North S2',
    status: 'GREENLIT',
    productionCompany: 'Red Marrow Media; Northwood Entertainment',
    source: 'CBC Media Centre',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5642/production-underway-on-season-2-of-acclaimed-arctic-comedy-north-of-north-for-aptn-cbc-and-netflix/',
    notes: 'APTN/CBC/Netflix Arctic-set comedy; season 2 in production for later 2026. Keep as co-commission signal for CBC and Netflix Canada.',
  },
  {
    buyerId: 'cbc',
    title: 'Saint-Pierre S2',
    status: 'GREENLIT',
    productionCompany: 'Hawco Productions',
    source: 'CBC 2025-26 Slate',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5551/cbc-announces-2025-26-programming-slate-offering-canada-s-most-extensive-lineup-of-original-canadian-storytelling/',
    notes: 'Returning Hawco Productions crime procedural set in Saint-Pierre et Miquelon; winter 2026.',
  },
  {
    buyerId: 'cbc',
    title: 'Small Achievable Goals S2',
    status: 'GREENLIT',
    productionCompany: 'Sphere Media',
    source: 'CBC 2025-26 Slate',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5551/cbc-announces-2025-26-programming-slate-offering-canada-s-most-extensive-lineup-of-original-canadian-storytelling/',
    notes: 'Returning comedy; winter 2026.',
  },
  {
    buyerId: 'cbc',
    title: 'Wild Cards S3',
    status: 'GREENLIT',
    productionCompany: 'Blink49 Studios; Front Street Pictures; Piller/Segan',
    source: 'CBC 2025-26 Slate',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5551/cbc-announces-2025-26-programming-slate-offering-canada-s-most-extensive-lineup-of-original-canadian-storytelling/',
    notes: 'Returning blue-sky procedural; season 3 winter 2026, with broader renewal through S4 previously announced.',
  },
  {
    buyerId: 'cbc',
    title: 'Allegiance S3',
    status: 'GREENLIT',
    productionCompany: 'Lark Productions; Universal International Studios',
    source: 'CBC 2025-26 Slate',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5551/cbc-announces-2025-26-programming-slate-offering-canada-s-most-extensive-lineup-of-original-canadian-storytelling/',
    notes: 'Surrey-set police/family drama; winter 2026.',
  },
  {
    buyerId: 'cbc',
    title: 'Heartland S19',
    status: 'ON_AIR',
    productionCompany: 'Dynamo Films; SEVEN24 Films',
    source: 'CBC 2025-26 Slate',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5551/cbc-announces-2025-26-programming-slate-offering-canada-s-most-extensive-lineup-of-original-canadian-storytelling/',
    notes: 'Long-running family drama; fall 2025 / current returning-franchise signal.',
  },
  {
    buyerId: 'bellmedia',
    title: 'I’m Not Here to Hurt You',
    status: 'ANNOUNCED',
    productionCompany: 'Blink49 Studios; Sony Pictures Television',
    source: 'Bell Media / The Lede',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/sony-pictures-television-and-bell-media-announce-im-not-here-to-hurt-you-a-new-crave-original-drama-series-starring-freddie-highmore/',
    notes: 'May 17 2026 announcement: new Crave Original drama created by David Shore and Freddie Highmore; first Sony Pictures Television/Bell Media co-commission; presented to global buyers at L.A. Screenings.',
  },
  {
    buyerId: 'bellmedia',
    title: 'The Tom Green Farm',
    status: 'ON_AIR',
    productionCompany: 'Tom Green Productions Canada Inc.',
    source: 'Bell Media / The Lede',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/crave-original-the-tom-green-farm-delivers-big-stars-rural-charm-in-new-talk-show-may-29/',
    notes: 'Crave Original 10x60 talk/unscripted series launching May 29 2026; first title from Bell/Tom Green co-development deal.',
  },
  {
    buyerId: 'bellmedia',
    title: 'Queen of the Castle S2',
    status: 'ON_AIR',
    productionCompany: 'Blink49 Studios; Nest Productions',
    source: 'Bell Media / The Lede',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/season-2-of-queen-of-the-castle-reclaims-its-throne-on-crave-beginning-may-29/',
    notes: 'CTV Original docuseries/lifestyle series; all 10 episodes drop on Crave May 29 2026, then weekly on CTV Life from June 3.',
  },
  {
    buyerId: 'bellmedia',
    title: 'Bon Cop Bad Cop',
    status: 'ON_AIR',
    productionCompany: 'Jessie Films; PaNik Fiction',
    source: 'Bell Media / The Lede',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/may-7-13-crave-weekly-streaming-overview/',
    notes: 'Six-episode Crave Original series premiered May 7 2026; useful current Canadian original / franchise-extension signal.',
  },
  {
    buyerId: 'bellmedia',
    title: 'Heated Rivalry',
    status: 'GREENLIT',
    productionCompany: 'Accent Aigu Entertainment',
    source: 'Bell Media 2025/26 Slate',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/new-bell-media-announces-2025-26-original-content-slate/',
    notes: 'Six-part hockey romance based on Rachel Reid novel; in production for Crave.',
  },
  {
    buyerId: 'bellmedia',
    title: 'Yaga',
    status: 'GREENLIT',
    productionCompany: 'Front Street Pictures; Blink49 Studios',
    source: 'Bell Media / The Lede',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/crave-original-series-yaga-from-blink49-studios-acquired-for-u-s-market-by-amc-global-media/',
    notes: 'Crave mystery thriller from Kat Sandler; produced by Blink49/Front Street, with U.S. rights acquired by AMC+ and UK/Ireland by Sky.',
  },
  {
    buyerId: 'bellmedia',
    title: 'I Kill the Bear',
    status: 'GREENLIT',
    productionCompany: 'New Metric Media; Play Fun Games',
    source: 'Bell Media',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/casting-announced-for-new-crave-original-comedy-series-from-jared-keeso-i-kill-the-bear/',
    notes: 'Six-part Jared Keeso comedy; production underway in Sudbury, premieres 2026.',
  },
  {
    buyerId: 'netflix-canada',
    title: 'This Summer Will Be Different',
    status: 'GREENLIT',
    productionCompany: 'Sphere Media',
    source: 'Netflix Canada / Tudum reporting',
    sourceUrl: 'https://curiocity.com/this-summer-will-be-different-filming-toronto/',
    notes: 'Netflix Canada 10-episode Carley Fortune adaptation; filming planned in Toronto and PEI. Created/showrun by Dane Clark and Linsey Stewart; EPs include Carley Fortune, Jennifer Kawaja and Elise Cousineau for Sphere Media.',
  },
  {
    buyerId: 'netflix-canada',
    title: 'The Granville Girls',
    status: 'GREENLIT',
    productionCompany: 'Shaftesbury',
    source: 'Netflix Canada / industry reporting',
    sourceUrl: 'https://www.whats-on-netflix.com/news/the-granville-girls-netflix-everything-we-know-so-far/',
    notes: 'Netflix Canada 8-episode period romance from showrunner Adriana Maggs; Shaftesbury/Christina Jennings; latest production reporting says Canada filming scheduled in 2026.',
  },
  {
    buyerId: 'netflix-canada',
    title: 'North of North S2',
    status: 'GREENLIT',
    productionCompany: 'Red Marrow Media; Northwood Entertainment',
    source: 'CBC/APTN/Netflix announcement via The Futon Critic',
    sourceUrl: 'http://www.thefutoncritic.com/news/2026/01/20/production-underway-on-season-2-of-acclaimed-arctic-comedy-north-of-north-for-netflix-aptn-and-cbc-342212/20260120netflix06/',
    notes: 'Netflix/APTN/CBC co-commission; season 2 filming in Iqaluit and Toronto through April 2026 for launch later in 2026.',
  },
  {
    buyerId: 'netflix-canada',
    title: 'Wayward',
    status: 'ON_AIR',
    productionCompany: 'Sphere Media; Objective Fiction',
    source: 'About Netflix',
    sourceUrl: 'https://about.netflix.com/en/news/wayward-netflixs-latest-canadian-limited-series-showcases-canadian-talent',
    notes: 'Ontario-shot limited series from Mae Martin; useful current Canadian production/producer relationship signal.',
  },
  {
    buyerId: 'netflix-canada',
    title: 'Netflix Upfront 2026 slate / Canada ad expansion',
    status: 'ANNOUNCED',
    productionCompany: null,
    source: 'About Netflix',
    sourceUrl: 'https://about.netflix.com/en/news/netflix-upfront-2026-get-closer',
    notes: 'May 2026 upfront announced broad 2026+ programming and that programmatic live/pause ads become available in Canada in summer 2026; useful buyer strategy signal but not a Canadian original commission.',
  },
  {
    buyerId: 'disney-plus-canada',
    title: 'Percy Jackson and the Olympians S3',
    status: 'GREENLIT',
    productionCompany: '20th Television; The Gotham Group',
    source: 'Disney+ Press',
    sourceUrl: 'https://press.disneyplus.com/news/disney-plus-percy-jackson-and-the-olympians-season-three-first-look-binge-season-two',
    notes: 'Disney+ series in production in Vancouver; keep as Canadian production footprint signal, not a Disney+ Canada original commissioning signal.',
  },
  {
    buyerId: 'disney-plus-canada',
    title: 'Disney+ June 2026 programming slate',
    status: 'ANNOUNCED',
    productionCompany: null,
    source: 'Disney+ Press',
    sourceUrl: 'https://press.disneyplus.com/news/next-on-disney-plus-june-2026',
    notes: 'Current Disney+ press slate is mostly U.S./global platform scheduling rather than Canadian-original buyer activity. Track cautiously; avoid treating platform availability as Canadian commissioning.',
  },
  {
    buyerId: 'rogers-sports-media',
    title: 'Law & Order Toronto: Criminal Intent S4',
    status: 'GREENLIT',
    productionCompany: 'Lark Productions; Cameron Pictures; Universal International Studios',
    source: 'Rogers Sports & Media',
    sourceUrl: 'https://about.rogers.com/news-ideas/citytv-orders-fourth-season-of-hit-canadian-drama-law-order-toronto-criminal-intent-and-announces-luke-kirby-as-new-detective/',
    notes: 'Citytv ordered season 4; production underway in Toronto; Luke Kirby joins as new detective; fall 2026 premiere.',
  },
  {
    buyerId: 'rogers-sports-media',
    title: 'Deadliest Catch: Northern Edge',
    status: 'GREENLIT',
    productionCompany: 'Attraction; Fremantle Original Productions',
    source: 'Rogers Sports & Media',
    sourceUrl: 'https://about.rogers.com/news-ideas/rogers-sports-media-greenlights-new-canadian-series-deadliest-catch-northern-edge-for-discovery-in-canada/',
    notes: 'New Canadian Discovery series greenlit May 2026; 8x60; production underway in Newfoundland, Nova Scotia and the North Atlantic; winter 2027 premiere.',
  },
]

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
    })
  }

  let removed = 0
  for (const stale of staleSeededTitles) {
    const item = await prisma.buyerSlateItem.findFirst({
      where: { buyerId: stale.buyerId, title: stale.title },
      include: { contacts: true },
    })
    if (item && item.contacts.length === 0) {
      await prisma.buyerSlateItem.delete({ where: { id: item.id } })
      removed += 1
      console.log(`Removed stale seeded slate item: ${stale.buyerId} / ${stale.title} — ${stale.reason}`)
    }
  }

  for (const item of slate) {
    const buyer = await prisma.company.findUnique({ where: { id: item.buyerId }, select: { id: true } })
    if (!buyer) {
      console.warn(`Skipping ${item.title}: buyer ${item.buyerId} not found`)
      continue
    }
    const existing = await prisma.buyerSlateItem.findFirst({ where: { buyerId: item.buyerId, title: item.title } })
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
      })
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
      })
    }
  }
  console.log(`Seeded/updated ${slate.length} buyer slate items; removed ${removed} stale seeded items`)
}

main().finally(async () => prisma.$disconnect())
