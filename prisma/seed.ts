import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create default user (Philip)
  const hashedPassword = await bcrypt.hash('hawco2026', 10)
  const philip = await prisma.user.upsert({
    where: { email: 'philip@hawcoproductions.com' },
    update: {},
    create: {
      email: 'philip@hawcoproductions.com',
      name: 'Philip Riccio',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })
  console.log('✅ Created user:', philip.email)

  // Create Companies
  const companies = await Promise.all([
    // Agencies
    prisma.company.upsert({
      where: { id: 'vanguarde' },
      update: {},
      create: { id: 'vanguarde', name: 'Vanguarde', type: 'AGENCY' },
    }),
    prisma.company.upsert({
      where: { id: 'meridian' },
      update: {},
      create: { id: 'meridian', name: 'Meridian Artists', type: 'AGENCY' },
    }),
    prisma.company.upsert({
      where: { id: 'characters' },
      update: {},
      create: { id: 'characters', name: 'The Characters', type: 'AGENCY' },
    }),
    prisma.company.upsert({
      where: { id: 'hollyer' },
      update: {},
      create: { id: 'hollyer', name: 'Jennifer Hollyer Agency', type: 'AGENCY' },
    }),
    prisma.company.upsert({
      where: { id: 'harrison' },
      update: {},
      create: { id: 'harrison', name: 'Harrison Artist', type: 'AGENCY' },
    }),
    prisma.company.upsert({
      where: { id: 'greatnorth' },
      update: {},
      create: { id: 'greatnorth', name: 'Great North Artists', type: 'AGENCY' },
    }),
    // Networks
    prisma.company.upsert({
      where: { id: 'bellmedia' },
      update: {},
      create: { id: 'bellmedia', name: 'Bell Media', type: 'NETWORK' },
    }),
    prisma.company.upsert({
      where: { id: 'cbc' },
      update: {},
      create: { id: 'cbc', name: 'CBC', type: 'NETWORK' },
    }),
    // Production Companies
    prisma.company.upsert({
      where: { id: 'kungfu' },
      update: {},
      create: { id: 'kungfu', name: 'Kung Fu Monkey Productions', type: 'PRODUCTION_COMPANY' },
    }),
    prisma.company.upsert({
      where: { id: 'markgordon' },
      update: {},
      create: { id: 'markgordon', name: 'Mark Gordon Pictures', type: 'PRODUCTION_COMPANY' },
    }),
    prisma.company.upsert({
      where: { id: 'wavewalker' },
      update: {},
      create: { id: 'wavewalker', name: 'Wavewalker Films', type: 'PRODUCTION_COMPANY' },
    }),
    prisma.company.upsert({
      where: { id: 'insight' },
      update: {},
      create: { id: 'insight', name: 'Insight Productions / Matthew Lesher', type: 'PRODUCTION_COMPANY' },
    }),
  ])
  console.log('✅ Created', companies.length, 'companies')

  // Create Agents
  const agents = [
    { name: 'Tina Horwitz', company: 'vanguarde', email: 'tina@vanguardeartists.com', vibe: 'Owner/President' },
    { name: 'Jay Horwitz', company: 'vanguarde', vibe: 'Agent/Managing Director' },
    { name: 'Amy Stulberg', company: 'vanguarde', vibe: 'Agent' },
    { name: 'Glenn Cockburn', company: 'meridian', vibe: 'Owner' },
    { name: 'Kerry Ball', company: 'meridian', vibe: 'Agent' },
    { name: 'Brent Jordan Sherman', company: 'characters', email: 'bjs@thecharacters.com', vibe: 'Agent' },
    { name: 'Cary Liberman', company: 'characters', vibe: 'Agent' },
    { name: 'Sohrab Merchant', company: 'characters', vibe: 'Agent' },
    { name: 'Jennifer Hollyer', company: 'hollyer', email: 'jennifer@jenniferhollyeragency.com', vibe: 'Owner' },
    { name: 'Ilana Miller', company: 'hollyer', vibe: 'Agent' },
    { name: 'Elina Levina', company: 'harrison', vibe: 'Agent' },
    { name: 'Leslie Harrison', company: 'harrison', vibe: 'Agent' },
    { name: 'Rena Zimmerman', company: 'greatnorth', vibe: 'Agent' },
  ]

  for (const agent of agents) {
    await prisma.contact.upsert({
      where: { id: agent.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: agent.name.toLowerCase().replace(/\s+/g, '-'),
        type: 'AGENT',
        name: agent.name,
        email: agent.email || null,
        agentVibe: agent.vibe,
        companyId: agent.company,
      },
    })
  }
  console.log('✅ Created', agents.length, 'agents')

  // Create Network Executives
  const networkExecs = [
    { name: 'Justin Stockman', company: 'bellmedia', title: 'VP, Content Development & Programming', role: 'Senior Executive. Oversees strategy for all brands.' },
    { name: 'Sarah Fowlie', company: 'bellmedia', title: 'Head of Production, Original Programming', role: 'Senior Executive. Bridges development and production.' },
    { name: 'Rachel Goldstein-Couto', company: 'bellmedia', title: 'Head of Development, Original Programming', role: 'Primary Target. Key architect of the scripted slate.', email: 'Rachel.goldstein-couto@bellmedia.ca' },
    { name: 'Adam Feigen', company: 'bellmedia', title: 'Development Executive, Scripted', role: 'Primary Target. Day-to-day reader. First point of contact.', email: 'Adam.feigen@bellmedia.ca' },
    { name: 'Trish Williams', company: 'cbc', title: 'Executive Director, Scripted Content', role: 'Senior Executive. Decision maker for all scripted.', email: 'Trish.williams@cbc.ca' },
    { name: 'Lea Marin', company: 'cbc', title: 'Director of Development, Drama', role: 'Primary Target. Gatekeeper for 1-hour drama pitches.' },
    { name: 'Micah Kernan', company: 'cbc', title: 'Manager, Scripted Development', role: 'Primary Target. First reader; coordinates tracking.', email: 'Micah.kernan@cbc.ca' },
    { name: 'Sarah Adams', company: 'cbc', title: 'Executive in Charge of Production', role: 'Manages specific drama files. Our current Exec for SP.', email: 'Sarah.adams@cbc.ca' },
    { name: 'Samantha Morris Mastai', company: 'cbc', title: 'Director of Development, Comedy', role: 'Primary Target. Gatekeeper for ½ hour comedy pitches. Newly Promoted.', email: 'samantha.morris.mastai@cbc.ca' },
  ]

  for (const exec of networkExecs) {
    await prisma.contact.upsert({
      where: { id: exec.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: exec.name.toLowerCase().replace(/\s+/g, '-'),
        type: 'NETWORK_EXEC',
        name: exec.name,
        email: exec.email || null,
        execTitle: exec.title,
        execRole: exec.role,
        companyId: exec.company,
      },
    })
  }
  console.log('✅ Created', networkExecs.length, 'network executives')

  // Create Writers (Talent Bank)
  const writers = [
    { name: 'Alex Pugsley', imdb: 'https://pro.imdb.com/name/nm0700128/', level: 'MID_LEVEL', citizenship: 'Canadian (Toronto)', isCanadian: true, notes: 'Recommended by Richard Clarkin' },
    { name: 'Jonathan Mallen', imdb: 'https://pro.imdb.com/name/nm0539347/', level: 'EMERGING', citizenship: 'Canadian (Toronto)', isCanadian: true, email: 'jondmalen@gmail.com', voice: 'Entertaining, Cliche but fun, Raw talent', notes: 'Also an actor, had meeting 2025/11/10, sent me pitch materials' },
    { name: 'Craig Brown', imdb: 'https://pro.imdb.com/name/nm1792608', level: 'EMERGING', citizenship: 'Canadian (Toronto)', isCanadian: true, genres: 'Comedy and Horror', voice: 'Funny, Quirky, Oddball' },
    { name: 'Fab Filippo', imdb: 'https://pro.imdb.com/name/nm0277116', level: 'EXPERIENCED', citizenship: 'Canadian (Toronto)', isCanadian: true, email: 'fabreetz@gmail.com', genres: 'Comedy, Drama' },
    { name: 'Tabia Lau', imdb: 'https://pro.imdb.com/name/nm13062701', level: 'MID_LEVEL', isCanadian: false, email: 'tabialau@gmail.com', genres: 'Comedy, Young Adult' },
    { name: 'William Jehu Garroutte', level: 'MID_LEVEL', citizenship: 'US', isCanadian: false },
    { name: 'John Rogers', level: 'SHOWRUNNER', citizenship: 'US', isCanadian: false, notes: 'Kung Fu Monkey Productions partner' },
    { name: 'Nick Thiel', level: 'MID_LEVEL', citizenship: 'US', isCanadian: false },
    { name: 'George Olson', level: 'MID_LEVEL', citizenship: 'Canada', isCanadian: true },
    { name: 'Penny Eizenga', level: 'MID_LEVEL', citizenship: 'Canada', isCanadian: true },
    { name: 'Allan Hawco', level: 'SHOWRUNNER', citizenship: 'Canadian', isCanadian: true, notes: 'Hawco Productions partner' },
    { name: 'Tyrone Finch', level: 'MID_LEVEL', citizenship: 'Canada', isCanadian: true },
  ]

  for (const writer of writers) {
    await prisma.contact.upsert({
      where: { id: writer.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: writer.name.toLowerCase().replace(/\s+/g, '-'),
        type: 'WRITER',
        name: writer.name,
        email: writer.email || null,
        imdbUrl: writer.imdb || null,
        writerLevel: writer.level as 'EMERGING' | 'MID_LEVEL' | 'EXPERIENCED' | 'SHOWRUNNER',
        writerGenres: writer.genres || null,
        writerVoice: writer.voice || null,
        citizenship: writer.citizenship || null,
        isCanadian: writer.isCanadian,
        notes: writer.notes || null,
      },
    })
  }
  console.log('✅ Created', writers.length, 'writers')

  // Create Projects (Submissions)
  const submissions = [
    { title: 'Indian Country', writer: 'william-jehu-garroutte', source: 'kungfu', logline: 'An Indigenous mother searches for her missing daughter on a reservation where tribal law and federal jurisdiction collide.', format: '1 Hour', genre: 'Crime/Mystery', materials: 'Pilot', comps: 'The Killing, Alaska Daily' },
    { title: 'Haunt', writer: 'john-rogers', source: 'kungfu', format: '1 Hour', materials: 'Pilot' },
    { title: 'Foul Play', writer: null, source: 'kungfu' },
    { title: 'Creek', writer: 'john-rogers', source: 'kungfu' },
    { title: 'Double Cross', writer: 'john-rogers', source: 'kungfu' },
    { title: 'Hobart Memorial', writer: 'nick-thiel', source: 'markgordon', logline: 'Follows newly widowed Olivia Hobart as she works to save her late husband\'s struggling hospital in rural Maine.', format: '1 Hour', genre: 'Medical Drama', materials: 'Pilot', comps: 'VIRGIN RIVER meets ER' },
    { title: 'Endlings', writer: null, source: 'wavewalker', format: '1 Hour', genre: 'Murder Mystery, Supernatural, Dark Comedy', materials: 'Pitch Deck', comps: 'Twin Peaks, Mare of Eastown, Yellowjackets', notes: 'Potential Co-Pro with Ireland' },
    { title: 'The Motor Holmes Mysteries', writer: null, source: 'insight', genre: 'Mystery', materials: 'Pitch Deck', verdict: 'Pass' },
    { title: 'Psychic Spies', writer: null, source: 'insight', logline: 'Procedural in the world of paranormal, sort of a new X-Files.', genre: 'Procedural', materials: 'Pitch Deck', verdict: 'Pass' },
    { title: 'Bullies', writer: null, source: 'insight', logline: 'Underdog Story; Slapshot meets Major League', genre: 'Sports Comedy', materials: 'Pitch Deck', verdict: 'Pass' },
    { title: 'CTRL+Z', writer: null, source: 'insight', logline: 'A social outcast who discovers a device that allows them to undo moments in time.', genre: 'Psychological Thriller', materials: 'Pitch Deck', comps: 'MR AND MRS SMITH meets ETERNAL SUNSHINE' },
    { title: 'Dr. Frost', writer: null, source: 'insight', logline: 'After a traumatic brain injury, Dr Frost uses his unique perspective to solve medical mysteries.', genre: 'Crime/Medical Procedural', materials: 'Pitch Deck', comps: 'HOUSE or THE GOOD DOCTOR' },
    { title: 'The Black Dog', writer: 'george-olson', source: null, logline: 'SurrealEstate meets The Old Man', format: '1 Hour', genre: 'Supernatural Hitman', materials: 'Pilot, Pitch Deck', comps: 'SurrealEstate meets The Old Man' },
    { title: 'A Far Cry', writer: 'penny-eizenga', source: null, format: 'Feature Film', genre: 'Drama', materials: 'Pitch Deck, Film Script', comps: 'Manchester by the Sea' },
  ]

  for (const sub of submissions) {
    const project = await prisma.project.upsert({
      where: { id: sub.title.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: sub.title.toLowerCase().replace(/\s+/g, '-'),
        title: sub.title,
        logline: sub.logline || null,
        format: sub.format || null,
        genre: sub.genre || null,
        comps: sub.comps || null,
        status: sub.verdict === 'Pass' ? 'PASSED' : 'SUBMITTED',
        origin: 'EXTERNAL',
        verdict: sub.verdict || null,
        notes: sub.notes || null,
      },
    })

    // Link writer
    if (sub.writer) {
      await prisma.projectContact.upsert({
        where: { 
          projectId_contactId_role: {
            projectId: project.id,
            contactId: sub.writer,
            role: 'WRITER'
          }
        },
        update: {},
        create: {
          projectId: project.id,
          contactId: sub.writer,
          role: 'WRITER',
        },
      })
    }
  }
  console.log('✅ Created', submissions.length, 'submissions')

  // Create Hawco Originals
  const originals = [
    { title: 'Halfyard', writer: 'allan-hawco', genre: 'Crime', status: 'DEVELOPING', notes: 'One Pager stage' },
    { title: 'Worst Breakup Ever', writer: 'allan-hawco', genre: 'Comedy', status: 'DEVELOPING', notes: 'Pitch Deck, needs revisions. Target: Crave/Bell, 2nd choice Netflix Canada' },
    { title: 'The Vig', writer: 'tyrone-finch', genre: 'Crime', format: '1 Hour', status: 'PITCHED', notes: 'New Montreal version sent to Crave. Crave/CTV Passed on it.' },
  ]

  for (const orig of originals) {
    const project = await prisma.project.upsert({
      where: { id: orig.title.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: orig.title.toLowerCase().replace(/\s+/g, '-'),
        title: orig.title,
        format: orig.format || null,
        genre: orig.genre || null,
        status: orig.status as 'DEVELOPING' | 'PITCHED',
        origin: 'HAWCO_ORIGINAL',
        notes: orig.notes || null,
      },
    })

    if (orig.writer) {
      await prisma.projectContact.upsert({
        where: {
          projectId_contactId_role: {
            projectId: project.id,
            contactId: orig.writer,
            role: 'WRITER'
          }
        },
        update: {},
        create: {
          projectId: project.id,
          contactId: orig.writer,
          role: 'WRITER',
        },
      })
    }
  }
  console.log('✅ Created', originals.length, 'Hawco originals')

  // Create Current Shows (Market Intel)
  const shows = [
    { network: 'Crave', title: 'Heated Rivalry', genre: 'Romance/Drama', prodCompany: 'Accent Aigu', distributor: 'Sphere Abacus/HBO Max', status: 'Renewed S2', notes: 'The "BookTok" Hit. Proves Romance IP works.' },
    { network: 'Crave', title: 'Slo Pitch', genre: 'Comedy', prodCompany: 'Shaftesbury/Boss & Co', status: 'Greenlit', notes: 'Web-to-TV model. Queer ensemble comedy.' },
    { network: 'Crave', title: 'The Trades', genre: 'Comedy', prodCompany: 'Trailer Park Boys', status: 'Renewed S3', notes: 'Blue collar comedy. Strong male demo.' },
    { network: 'CBC', title: 'Saint-Pierre', genre: 'International Procedural', prodCompany: 'Hawco Productions', distributor: 'Fifth Season', status: 'Airing S2', notes: 'The "Hawco Model". Global Co-Pro.' },
    { network: 'CBC', title: 'Wild Cards', genre: 'Light Procedural', prodCompany: 'Blink49', distributor: 'Fifth Season', status: 'Airing S2', notes: 'The "Blue Sky" hit. CW Co-pro.' },
    { network: 'CBC', title: 'Son of a Critch', genre: 'Comedy', prodCompany: 'Hawco/Project 10', distributor: 'Lionsgate', status: 'Renewed', notes: 'Family slot locked.' },
    { network: 'CTV', title: 'The Borderline', genre: 'Crime Drama', prodCompany: 'Blink49/Front St', status: 'Greenlit', notes: 'Starring Stephen Amell. Star Power is key.' },
    { network: 'CTV', title: 'Sight Unseen', genre: 'Crime', prodCompany: 'Blink49/Sisters', distributor: 'Federation', status: 'Renewed', notes: 'High-concept procedural.' },
    { network: 'Global', title: 'Murder in a Small Town', genre: 'Mystery', prodCompany: 'Sepia Films', distributor: 'Fox (US)', status: 'Airing', notes: 'US Co-Commission model.' },
  ]

  for (const show of shows) {
    await prisma.currentShow.upsert({
      where: { id: show.title.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: show.title.toLowerCase().replace(/\s+/g, '-'),
        network: show.network,
        title: show.title,
        genre: show.genre,
        prodCompany: show.prodCompany,
        distributor: show.distributor || null,
        status: show.status,
        notes: show.notes || null,
      },
    })
  }
  console.log('✅ Created', shows.length, 'current shows')

  console.log('✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
