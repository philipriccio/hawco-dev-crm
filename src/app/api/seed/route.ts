import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  // Simple auth check
  const authHeader = request.headers.get('authorization')
  if (authHeader !== 'Bearer hawco-seed-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
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

    // Create Companies
    const companiesData = [
      { id: 'vanguarde', name: 'Vanguarde', type: 'AGENCY' as const },
      { id: 'meridian', name: 'Meridian Artists', type: 'AGENCY' as const },
      { id: 'characters', name: 'The Characters', type: 'AGENCY' as const },
      { id: 'hollyer', name: 'Jennifer Hollyer Agency', type: 'AGENCY' as const },
      { id: 'harrison', name: 'Harrison Artist', type: 'AGENCY' as const },
      { id: 'greatnorth', name: 'Great North Artists', type: 'AGENCY' as const },
      { id: 'bellmedia', name: 'Bell Media', type: 'NETWORK' as const },
      { id: 'cbc', name: 'CBC', type: 'NETWORK' as const },
      { id: 'kungfu', name: 'Kung Fu Monkey Productions', type: 'PRODUCTION_COMPANY' as const },
      { id: 'markgordon', name: 'Mark Gordon Pictures', type: 'PRODUCTION_COMPANY' as const },
      { id: 'wavewalker', name: 'Wavewalker Films', type: 'PRODUCTION_COMPANY' as const },
      { id: 'insight', name: 'Insight Productions / Matthew Lesher', type: 'PRODUCTION_COMPANY' as const },
    ]

    for (const company of companiesData) {
      await prisma.company.upsert({
        where: { id: company.id },
        update: {},
        create: company,
      })
    }

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
      const id = agent.name.toLowerCase().replace(/\s+/g, '-')
      await prisma.contact.upsert({
        where: { id },
        update: {},
        create: {
          id,
          type: 'AGENT',
          name: agent.name,
          email: agent.email || null,
          agentVibe: agent.vibe,
          companyId: agent.company,
        },
      })
    }

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
      { name: 'Samantha Morris Mastai', company: 'cbc', title: 'Director of Development, Comedy', role: 'Primary Target. Gatekeeper for ½ hour comedy pitches.', email: 'samantha.morris.mastai@cbc.ca' },
    ]

    for (const exec of networkExecs) {
      const id = exec.name.toLowerCase().replace(/\s+/g, '-')
      await prisma.contact.upsert({
        where: { id },
        update: {},
        create: {
          id,
          type: 'NETWORK_EXEC',
          name: exec.name,
          email: exec.email || null,
          execTitle: exec.title,
          execRole: exec.role,
          companyId: exec.company,
        },
      })
    }

    // Create Writers
    const writers = [
      { name: 'Alex Pugsley', imdb: 'https://pro.imdb.com/name/nm0700128/', level: 'MID_LEVEL' as const, citizenship: 'Canadian (Toronto)', notes: 'Recommended by Richard Clarkin' },
      { name: 'Jonathan Mallen', imdb: 'https://pro.imdb.com/name/nm0539347/', level: 'EMERGING' as const, citizenship: 'Canadian (Toronto)', email: 'jondmalen@gmail.com', voice: 'Entertaining, Cliche but fun, Raw talent', notes: 'Also an actor, had meeting 2025/11/10' },
      { name: 'Craig Brown', imdb: 'https://pro.imdb.com/name/nm1792608', level: 'EMERGING' as const, citizenship: 'Canadian (Toronto)', genres: 'Comedy and Horror', voice: 'Funny, Quirky, Oddball' },
      { name: 'Fab Filippo', imdb: 'https://pro.imdb.com/name/nm0277116', level: 'EXPERIENCED' as const, citizenship: 'Canadian (Toronto)', email: 'fabreetz@gmail.com', genres: 'Comedy, Drama' },
      { name: 'Tabia Lau', imdb: 'https://pro.imdb.com/name/nm13062701', level: 'MID_LEVEL' as const, email: 'tabialau@gmail.com', genres: 'Comedy, Young Adult' },
      { name: 'William Jehu Garroutte', level: 'MID_LEVEL' as const, citizenship: 'US' },
      { name: 'John Rogers', level: 'SHOWRUNNER' as const, citizenship: 'US', notes: 'Kung Fu Monkey Productions partner' },
      { name: 'Nick Thiel', level: 'MID_LEVEL' as const, citizenship: 'US' },
      { name: 'George Olson', level: 'MID_LEVEL' as const, citizenship: 'Canada' },
      { name: 'Penny Eizenga', level: 'MID_LEVEL' as const, citizenship: 'Canada' },
      { name: 'Allan Hawco', level: 'SHOWRUNNER' as const, citizenship: 'Canadian', notes: 'Hawco Productions partner' },
      { name: 'Tyrone Finch', level: 'MID_LEVEL' as const, citizenship: 'Canada' },
    ]

    for (const writer of writers) {
      const id = writer.name.toLowerCase().replace(/\s+/g, '-')
      await prisma.contact.upsert({
        where: { id },
        update: {},
        create: {
          id,
          type: 'WRITER',
          name: writer.name,
          email: writer.email || null,
          imdbUrl: writer.imdb || null,
          writerLevel: writer.level,
          writerGenres: writer.genres || null,
          writerVoice: writer.voice || null,
          citizenship: writer.citizenship || null,
          notes: writer.notes || null,
        },
      })
    }

    // Create Projects (Submissions)
    const submissions = [
      { title: 'Indian Country', writer: 'william-jehu-garroutte', logline: 'An Indigenous mother searches for her missing daughter on a reservation where tribal law and federal jurisdiction collide.', format: '1 Hour', genre: 'Crime/Mystery', comps: 'The Killing, Alaska Daily' },
      { title: 'Haunt', writer: 'john-rogers', format: '1 Hour' },
      { title: 'Hobart Memorial', writer: 'nick-thiel', logline: 'Follows newly widowed Olivia Hobart as she works to save her late husband\'s struggling hospital in rural Maine.', format: '1 Hour', genre: 'Medical Drama', comps: 'VIRGIN RIVER meets ER' },
      { title: 'Endlings', logline: 'Murder mystery with supernatural elements set in Ireland.', format: '1 Hour', genre: 'Murder Mystery, Supernatural, Dark Comedy', comps: 'Twin Peaks, Mare of Eastown, Yellowjackets', notes: 'Potential Co-Pro with Ireland' },
      { title: 'The Motor Holmes Mysteries', genre: 'Mystery', verdict: 'Pass' },
      { title: 'Psychic Spies', logline: 'Procedural in the world of paranormal, sort of a new X-Files.', genre: 'Procedural', verdict: 'Pass' },
      { title: 'CTRL+Z', logline: 'A social outcast who discovers a device that allows them to undo moments in time.', genre: 'Psychological Thriller', comps: 'MR AND MRS SMITH meets ETERNAL SUNSHINE' },
      { title: 'Dr. Frost', logline: 'After a traumatic brain injury, Dr Frost uses his unique perspective to solve medical mysteries.', genre: 'Crime/Medical Procedural', comps: 'HOUSE or THE GOOD DOCTOR' },
      { title: 'The Black Dog', writer: 'george-olson', logline: 'SurrealEstate meets The Old Man', format: '1 Hour', genre: 'Supernatural Hitman', comps: 'SurrealEstate meets The Old Man' },
      { title: 'A Far Cry', writer: 'penny-eizenga', format: 'Feature Film', genre: 'Drama', comps: 'Manchester by the Sea' },
    ]

    for (const sub of submissions) {
      const id = sub.title.toLowerCase().replace(/\s+/g, '-')
      const project = await prisma.project.upsert({
        where: { id },
        update: {},
        create: {
          id,
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

    // Create Hawco Originals
    const originals = [
      { title: 'Halfyard', writer: 'allan-hawco', genre: 'Crime', status: 'DEVELOPING' as const, notes: 'One Pager stage' },
      { title: 'Worst Breakup Ever', writer: 'allan-hawco', genre: 'Comedy', status: 'DEVELOPING' as const, notes: 'Pitch Deck, needs revisions. Target: Crave/Bell, 2nd choice Netflix Canada' },
      { title: 'The Vig', writer: 'tyrone-finch', genre: 'Crime', format: '1 Hour', status: 'PITCHED' as const, notes: 'New Montreal version sent to Crave. Crave/CTV Passed on it.' },
    ]

    for (const orig of originals) {
      const id = orig.title.toLowerCase().replace(/\s+/g, '-')
      const project = await prisma.project.upsert({
        where: { id },
        update: {},
        create: {
          id,
          title: orig.title,
          format: orig.format || null,
          genre: orig.genre || null,
          status: orig.status,
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

    // Create Current Shows (Market Intel)
    const shows = [
      { network: 'Crave', title: 'Heated Rivalry', genre: 'Romance/Drama', prodCompany: 'Accent Aigu', distributor: 'Sphere Abacus/HBO Max', status: 'Renewed S2', notes: 'The "BookTok" Hit. Proves Romance IP works.' },
      { network: 'Crave', title: 'Slo Pitch', genre: 'Comedy', prodCompany: 'Shaftesbury/Boss & Co', status: 'Greenlit', notes: 'Web-to-TV model. Queer ensemble comedy.' },
      { network: 'CBC', title: 'Saint-Pierre', genre: 'International Procedural', prodCompany: 'Hawco Productions', distributor: 'Fifth Season', status: 'Airing S2', notes: 'The "Hawco Model". Global Co-Pro.' },
      { network: 'CBC', title: 'Wild Cards', genre: 'Light Procedural', prodCompany: 'Blink49', distributor: 'Fifth Season', status: 'Airing S2', notes: 'The "Blue Sky" hit. CW Co-pro.' },
      { network: 'CBC', title: 'Son of a Critch', genre: 'Comedy', prodCompany: 'Hawco/Project 10', distributor: 'Lionsgate', status: 'Renewed', notes: 'Family slot locked.' },
      { network: 'CTV', title: 'The Borderline', genre: 'Crime Drama', prodCompany: 'Blink49/Front St', status: 'Greenlit', notes: 'Starring Stephen Amell. Star Power is key.' },
    ]

    for (const show of shows) {
      const id = show.title.toLowerCase().replace(/\s+/g, '-')
      await prisma.currentShow.upsert({
        where: { id },
        update: {},
        create: {
          id,
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

    return NextResponse.json({ 
      success: true, 
      message: 'Database seeded successfully',
      counts: {
        user: 1,
        companies: companiesData.length,
        agents: agents.length,
        networkExecs: networkExecs.length,
        writers: writers.length,
        submissions: submissions.length,
        originals: originals.length,
        shows: shows.length,
      }
    })

  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Seed failed', details: String(error) }, { status: 500 })
  }
}
