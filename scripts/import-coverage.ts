#!/usr/bin/env node
/**
 * Script to import coverage files from text files into the database
 * Usage: npx tsx scripts/import-coverage.ts
 */

import { PrismaClient, Verdict } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface ParsedCoverage {
  title: string
  writer: string
  format: string | null
  source: string | null
  draftDate: string | null
  logline: string | null
  reader: string
  dateRead: Date
  scoreConcept: number | null
  scoreCharacters: number | null
  scoreStructure: number | null
  scoreDialogue: number | null
  scoreMarketFit: number | null
  scoreTotal: number | null
  notesConcept: string | null
  notesCharacters: string | null
  notesStructure: string | null
  notesDialogue: string | null
  notesMarketFit: string | null
  mandateCanadian: boolean
  mandateStarRole: boolean
  mandateIntlCoPro: boolean
  mandateBudget: boolean
  strengths: string | null
  weaknesses: string | null
  summary: string | null
  verdict: Verdict
}

function parseScore(scoreStr: string): number | null {
  if (!scoreStr || scoreStr.trim() === '') return null
  const num = parseFloat(scoreStr.trim())
  return isNaN(num) ? null : num
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  
  // Try different date formats
  // Format: 12/01/2025 or 12/01/2025
  const usMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (usMatch) {
    const [, month, day, year] = usMatch
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
  }
  
  // Format: Feb 8 2026 or Feb 07, 2026 or Jan 15 2025
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const monthMatch = dateStr.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})[\s,]+(\d{4})/)
  if (monthMatch) {
    const monthIndex = monthNames.indexOf(monthMatch[1])
    const day = monthMatch[2].padStart(2, '0')
    const year = monthMatch[3]
    return new Date(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${day}`)
  }
  
  return new Date()
}

function parseVerdict(verdictStr: string): Verdict {
  const upper = verdictStr.toUpperCase()
  if (upper.includes('RECOMMEND')) return 'RECOMMEND'
  if (upper.includes('CONSIDER')) return 'CONSIDER'
  return 'PASS'
}

function parseCoverageFile(content: string): ParsedCoverage {
  const lines = content.split('\n').map(l => l.trim())
  
  const result: Partial<ParsedCoverage> = {
    reader: 'Phil',
    mandateCanadian: false,
    mandateStarRole: false,
    mandateIntlCoPro: false,
    mandateBudget: false,
  }
  
  let currentSection = ''
  let scoreCategory = ''
  let inStrengths = false
  let inWeaknesses = false
  let inSummary = false
  let skipNextLines = 0
  
  const strengths: string[] = []
  const weaknesses: string[] = []
  const summary: string[] = []
  const scoreNotes: Record<string, string> = {}
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lowerLine = line.toLowerCase()
    
    // Skip empty lines after headers
    if (skipNextLines > 0) {
      skipNextLines--
      continue
    }
    
    // Parse header info
    if (line.includes('HAWCO PRODUCTIONS') && line.includes('SCRIPT ASSESSMENT')) {
      // Extract reader and date from header line
      const readerMatch = line.match(/Reader:\s*(\w+)/i)
      if (readerMatch) result.reader = readerMatch[1]
      
      const dateMatch = line.match(/Date:\s*(.+?)(?:\s*$|\s+\w)/i)
      if (dateMatch) {
        result.dateRead = parseDate(dateMatch[1].trim())
      }
      continue
    }
    
    // Parse project details
    if (line === 'Title' && i + 1 < lines.length) {
      result.title = lines[++i].trim()
      continue
    }
    if (line === 'Writer' && i + 1 < lines.length) {
      result.writer = lines[++i].trim()
      continue
    }
    if (line === 'Format' && i + 1 < lines.length) {
      const format = lines[++i].trim()
      result.format = format || null
      continue
    }
    if (line === 'Source' && i + 1 < lines.length) {
      const source = lines[++i].trim()
      result.source = source || null
      continue
    }
    if (line === 'Draft Date' && i + 1 < lines.length) {
      const draftDate = lines[++i].trim()
      result.draftDate = draftDate && draftDate !== '??' ? draftDate : null
      continue
    }
    
    // Parse logline
    if (lowerLine === 'logline:') {
      currentSection = 'logline'
      continue
    }
    if (currentSection === 'logline' && line && !line.includes('THE SCORECARD')) {
      if (!result.logline) result.logline = line
      else result.logline += ' ' + line
    }
    if (line.includes('THE SCORECARD')) {
      currentSection = 'scorecard'
      continue
    }
    
    // Parse scorecard
    if (currentSection === 'scorecard') {
      if (['Concept', 'Characters', 'Structure', 'Dialogue', 'Market Fit'].includes(line)) {
        scoreCategory = line.toLowerCase().replace(' ', '')
        if (i + 1 < lines.length) {
          const scoreLine = lines[++i].trim()
          const score = parseScore(scoreLine)
          if (score !== null) {
            const key = 'score' + line.replace(' ', '')
            ;(result as Record<string, number | null>)[key] = score
          }
        }
        // Next line should be notes
        if (i + 1 < lines.length) {
          const noteLine = lines[++i].trim()
          if (noteLine && !['Concept', 'Characters', 'Structure', 'Dialogue', 'Market Fit', 'Total'].includes(noteLine)) {
            scoreNotes[scoreCategory] = noteLine
          }
        }
        continue
      }
      if (line.startsWith('Total')) {
        currentSection = ''
        continue
      }
    }
    
    // Parse mandate checklist
    if (line === 'MANDATE CHECKLIST') {
      currentSection = 'mandate'
      continue
    }
    if (currentSection === 'mandate') {
      if (line.includes('Canadian Content')) result.mandateCanadian = true
      if (line.includes('Star Role')) result.mandateStarRole = true
      if (line.includes('Co-Pro') || line.includes('CoPro')) result.mandateIntlCoPro = true
      if (line.includes('Budget')) result.mandateBudget = true
      if (line.includes('ANALYST COMMENTS')) {
        currentSection = 'comments'
      }
      continue
    }
    
    // Parse analyst comments
    if (line === 'ANALYST COMMENTS' || line === 'ANALYST COMMENTS ') {
      currentSection = 'comments'
      continue
    }
    if (lowerLine.includes('strengths:') || lowerLine.includes('strengths')) {
      inStrengths = true
      inWeaknesses = false
      inSummary = false
      // Check if there's text on same line after colon
      const colonIdx = line.indexOf(':')
      if (colonIdx !== -1 && colonIdx < line.length - 1) {
        const afterColon = line.substring(colonIdx + 1).trim()
        if (afterColon && !afterColon.includes('[Bullet')) {
          strengths.push(afterColon)
        }
      }
      continue
    }
    if (lowerLine.includes('weaknesses:') || lowerLine.includes('weaknesses')) {
      inStrengths = false
      inWeaknesses = true
      inSummary = false
      const colonIdx = line.indexOf(':')
      if (colonIdx !== -1 && colonIdx < line.length - 1) {
        const afterColon = line.substring(colonIdx + 1).trim()
        if (afterColon && !afterColon.includes('[Bullet')) {
          weaknesses.push(afterColon)
        }
      }
      continue
    }
    if (lowerLine.includes('summary:') || lowerLine === 'summary') {
      inStrengths = false
      inWeaknesses = false
      inSummary = true
      const colonIdx = line.indexOf(':')
      if (colonIdx !== -1 && colonIdx < line.length - 1) {
        const afterColon = line.substring(colonIdx + 1).trim()
        if (afterColon) {
          summary.push(afterColon)
        }
      }
      continue
    }
    
    // Check for verdict
    if (lowerLine.includes('verdict')) {
      inStrengths = false
      inWeaknesses = false
      inSummary = false
      // Look for verdict in next few lines
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const verdictLine = lines[j].trim()
        if (verdictLine) {
          result.verdict = parseVerdict(verdictLine)
          break
        }
      }
      continue
    }
    
    // Collect content
    if (inStrengths && line && !line.startsWith('-') && !line.startsWith('•')) {
      strengths.push(line)
    } else if (inStrengths && (line.startsWith('-') || line.startsWith('•'))) {
      strengths.push(line.substring(1).trim())
    }
    
    if (inWeaknesses && line && !line.startsWith('-') && !line.startsWith('•')) {
      weaknesses.push(line)
    } else if (inWeaknesses && (line.startsWith('-') || line.startsWith('•'))) {
      weaknesses.push(line.substring(1).trim())
    }
    
    if (inSummary && line && !lowerLine.includes('verdict')) {
      summary.push(line)
    }
  }
  
  // Set collected fields
  if (strengths.length > 0) result.strengths = strengths.filter(s => s.trim()).join('\n')
  if (weaknesses.length > 0) result.weaknesses = weaknesses.filter(s => s.trim()).join('\n')
  if (summary.length > 0) result.summary = summary.filter(s => s.trim()).join('\n')
  
  // Set score notes
  if (scoreNotes.concept) result.notesConcept = scoreNotes.concept
  if (scoreNotes.characters) result.notesCharacters = scoreNotes.characters
  if (scoreNotes.structure) result.notesStructure = scoreNotes.structure
  if (scoreNotes.dialogue) result.notesDialogue = scoreNotes.dialogue
  if (scoreNotes.marketfit) result.notesMarketFit = scoreNotes.marketfit
  
  // Calculate total score
  const scores = [
    result.scoreConcept,
    result.scoreCharacters,
    result.scoreStructure,
    result.scoreDialogue,
    result.scoreMarketFit,
  ].filter((s): s is number => s !== null && s !== undefined)
  
  if (scores.length > 0) {
    result.scoreTotal = scores.reduce((a, b) => a + b, 0)
  }
  
  // Default verdict if not found
  if (!result.verdict) result.verdict = 'PASS'
  
  return result as ParsedCoverage
}

async function importCoverage() {
  const downloadsDir = '/tmp/openclaw/downloads'
  const files = fs.readdirSync(downloadsDir).filter(f => f.endsWith('_Coverage.txt'))
  
  console.log(`Found ${files.length} coverage files to import`)
  
  for (const file of files) {
    const filePath = path.join(downloadsDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    
    console.log(`\nProcessing: ${file}`)
    
    try {
      const parsed = parseCoverageFile(content)
      
      // Check if coverage already exists (by title and writer)
      const existing = await prisma.coverage.findFirst({
        where: {
          title: parsed.title,
          writer: parsed.writer,
        },
      })
      
      if (existing) {
        console.log(`  ⚠️  Coverage already exists: ${parsed.title} by ${parsed.writer}`)
        continue
      }
      
      // Create coverage
      await prisma.coverage.create({
        data: parsed,
      })
      
      console.log(`  ✓ Imported: ${parsed.title} by ${parsed.writer} (${parsed.verdict})`)
    } catch (error) {
      console.error(`  ✗ Error importing ${file}:`, error)
    }
  }
  
  console.log('\nImport complete!')
}

importCoverage()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
