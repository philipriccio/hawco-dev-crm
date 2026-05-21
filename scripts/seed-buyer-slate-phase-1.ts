import { PrismaClient, BuyerSlateStatus } from '@prisma/client'

const prisma = new PrismaClient()

type SlateSeed = {
  buyerId: string
  title: string
  status: BuyerSlateStatus
  productionCompany?: string | null
  source: string
  sourceUrl: string
  notes: string
}

const slate: SlateSeed[] = [
  {
    buyerId: 'cbc',
    title: 'North of North S2',
    status: 'GREENLIT',
    productionCompany: 'Red Marrow Media; Northwood Entertainment',
    source: 'CBC Media Centre',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5642/production-underway-on-season-2-of-acclaimed-arctic-comedy-north-of-north-for-aptn-cbc-and-netflix/',
    notes: 'APTN/CBC/Netflix Arctic-set comedy; season 2 in production for 2026.',
  },
  {
    buyerId: 'cbc',
    title: 'Saint-Pierre S2',
    status: 'GREENLIT',
    productionCompany: 'Hawco Productions',
    source: 'CBC 2025-26 Slate',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5551/cbc-announces-2025-26-programming-slate-offering-canada-s-most-extensive-lineup-of-original-canadian-storytelling/',
    notes: 'Returning crime procedural set in Saint-Pierre et Miquelon; winter 2026.',
  },
  {
    buyerId: 'cbc',
    title: 'Son of a Critch S5',
    status: 'GREENLIT',
    productionCompany: 'Project 10 Productions; Hawco Productions; Lionsgate Television',
    source: 'CBC 2025-26 Slate',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5551/cbc-announces-2025-26-programming-slate-offering-canada-s-most-extensive-lineup-of-original-canadian-storytelling/',
    notes: 'Returning Canadian sitcom; winter 2026.',
  },
  {
    buyerId: 'cbc',
    title: 'Small Achievable Goals S2',
    status: 'GREENLIT',
    productionCompany: 'Sphere Media',
    source: 'CBC 2025-26 Slate',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5551/cbc-announces-2025-26-programming-slate-offering-canada-s-most-extensive-lineup-of-original-canadian-storytelling/',
    notes: 'Returning comedy about menopause and middle age; winter 2026.',
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
    title: 'Wild Cards S3',
    status: 'GREENLIT',
    productionCompany: 'Blink49 Studios; Front Street Pictures; Piller/Segan',
    source: 'CBC 2025-26 Slate',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5551/cbc-announces-2025-26-programming-slate-offering-canada-s-most-extensive-lineup-of-original-canadian-storytelling/',
    notes: 'Returning blue-sky procedural; season 3 winter 2026.',
  },
  {
    buyerId: 'cbc',
    title: 'Heartland S19',
    status: 'ON_AIR',
    productionCompany: 'Dynamo Films; SEVEN24 Films',
    source: 'CBC 2025-26 Slate',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5551/cbc-announces-2025-26-programming-slate-offering-canada-s-most-extensive-lineup-of-original-canadian-storytelling/',
    notes: 'Long-running family drama; fall 2025.',
  },
  {
    buyerId: 'cbc',
    title: 'Murdoch Mysteries S19',
    status: 'ON_AIR',
    productionCompany: 'Shaftesbury; ITV Studios; UKTV',
    source: 'CBC 2025-26 Slate',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5551/cbc-announces-2025-26-programming-slate-offering-canada-s-most-extensive-lineup-of-original-canadian-storytelling/',
    notes: 'Returning period procedural; fall 2025.',
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
    title: 'Slo Pitch',
    status: 'IN_DEVELOPMENT',
    productionCompany: 'Shaftesbury; PAGEBOY Productions',
    source: 'Bell Media 2025/26 Slate',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/new-bell-media-announces-2025-26-original-content-slate/',
    notes: 'Comedy series for CTV/Crave; first project from Bell/PAGEBOY co-development deal.',
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
    buyerId: 'bellmedia',
    title: 'Yaga',
    status: 'GREENLIT',
    productionCompany: 'Front Street Pictures; Blink49 Studios',
    source: 'Bell Media',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/carrie-anne-moss-leads-an-all-star-cast-for-the-crave-original-series-yaga-including-noah-reid-clark-backo-and-hudson-williams/',
    notes: 'Crave half-hour mystery thriller from Kat Sandler; production underway.',
  },
  {
    buyerId: 'bellmedia',
    title: 'The Borderline',
    status: 'GREENLIT',
    productionCompany: 'Shaftesbury',
    source: 'Bell Media',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/crave-original-the-borderline-lands-post-superbowl-premiere-event-on-ctv/',
    notes: 'Crave/CTV crime drama formerly Underbelly; post-Super Bowl launch.',
  },
  {
    buyerId: 'bellmedia',
    title: "I’m Not Here to Hurt You",
    status: 'ANNOUNCED',
    productionCompany: 'Blink49 Studios',
    source: 'Bell Media',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/sony-pictures-television-and-bell-media-announce-im-not-here-to-hurt-you-a-new-crave-original-drama-series-starring-freddie-highmore/',
    notes: 'Crave Original drama co-commissioned with Sony Pictures Television; created by David Shore and Freddie Highmore.',
  },
  {
    buyerId: 'bellmedia',
    title: 'Anna Pigeon',
    status: 'GREENLIT',
    productionCompany: 'Cineflix Studios; December Films; Seven24 Films',
    source: 'Bell Media 2025/26 Slate',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/new-bell-media-announces-2025-26-original-content-slate/',
    notes: 'Bell co-commission with Versant’s USA Network; Morwyn Brebner showrunner.',
  },
  {
    buyerId: 'bellmedia',
    title: 'Hockey Fanatics',
    status: 'ANNOUNCED',
    productionCompany: 'Shadow Pine Studios; Scrimmy Media',
    source: 'Bell Media 2025/26 Slate',
    sourceUrl: 'https://www.bellmedia.ca/the-lede/press/new-bell-media-announces-2025-26-original-content-slate/',
    notes: 'Dave Foley-hosted celebrity hockey fandom series for Crave.',
  },
  {
    buyerId: 'netflix-canada',
    title: 'Wayward',
    status: 'ON_AIR',
    productionCompany: 'Sphere Media; Objective Fiction',
    source: 'About Netflix',
    sourceUrl: 'https://about.netflix.com/en/news/wayward-netflixs-latest-canadian-limited-series-showcases-canadian-talent',
    notes: 'Ontario-shot limited series from Mae Martin; streaming on Netflix.',
  },
  {
    buyerId: 'netflix-canada',
    title: 'North of North S2',
    status: 'GREENLIT',
    productionCompany: 'Red Marrow Media; Northwood Entertainment',
    source: 'CBC Media Centre',
    sourceUrl: 'https://mediacentre.cbc.ca/announcement/5642/production-underway-on-season-2-of-acclaimed-arctic-comedy-north-of-north-for-aptn-cbc-and-netflix/',
    notes: 'APTN/CBC/Netflix Arctic-set comedy; season 2 in production for 2026.',
  },
  {
    buyerId: 'netflix-canada',
    title: 'This Summer Will Be Different',
    status: 'ANNOUNCED',
    productionCompany: 'Sphere Media',
    source: 'Netflix Canada slate reporting',
    sourceUrl: 'https://fangirlish.com/2026/03/19/netflix-announces-the-summer-will-be-different/',
    notes: 'Carley Fortune adaptation from Dane Clark and Linsey Stewart; PEI/Toronto-set romance.',
  },
  {
    buyerId: 'netflix-canada',
    title: 'The Granville Girls',
    status: 'IN_DEVELOPMENT',
    productionCompany: 'Shaftesbury',
    source: 'What’s on Netflix',
    sourceUrl: 'https://www.whats-on-netflix.com/news/the-granville-girls-netflix-everything-we-know-so-far/',
    notes: 'Canadian Netflix romantic drama series led by Adriana Maggs; filming planned in Canada.',
  },
  {
    buyerId: 'disney-plus-canada',
    title: 'Percy Jackson and the Olympians S3',
    status: 'GREENLIT',
    productionCompany: '20th Television; The Gotham Group',
    source: 'Disney+ Press',
    sourceUrl: 'https://press.disneyplus.com/news/disney-plus-percy-jackson-and-the-olympians-season-three-first-look-binge-season-two',
    notes: 'Disney+ series currently in production in Vancouver; based on The Titan’s Curse.',
  },
  {
    buyerId: 'disney-plus-canada',
    title: 'Percy Jackson and the Olympians S2',
    status: 'ON_AIR',
    productionCompany: '20th Television; The Gotham Group',
    source: 'Disney+ Press',
    sourceUrl: 'https://press.disneyplus.com/news/disney-plus-percy-jackson-and-the-olympians-trailer-and-key-art-announcement',
    notes: 'Season 2 launched on Disney+; season 3 in production in Vancouver.',
  },
  {
    buyerId: 'disney-plus-canada',
    title: 'Vampirina: Teenage Vampire',
    status: 'ON_AIR',
    productionCompany: 'Disney Branded Television',
    source: 'Disney+ Press',
    sourceUrl: 'https://press.disneyplus.com/news/disney-plus-vampirina-teenage-vampire-key-art-trailer-announcement',
    notes: 'Disney Branded Television music-driven original series streaming on Disney+.',
  },
]

async function main() {
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
  console.log(`Seeded/updated ${slate.length} buyer slate items`)
}

main().finally(async () => prisma.$disconnect())
