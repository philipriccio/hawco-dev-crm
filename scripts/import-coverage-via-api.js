#!/usr/bin/env node
/**
 * Import coverage data via API
 * Usage: API_URL=https://your-app.vercel.app node scripts/import-coverage-via-api.js
 */

const fs = require('fs')
const path = require('path')

const API_URL = process.env.API_URL || 'https://hawco-dev-crm.vercel.app'

// Parse a coverage text file
function parseCoverageFile(content, filename) {
  const lines = content.split('\n').map(l => l.trim())
  
  const result = {
    reader: 'Phil',
    dateRead: new Date().toISOString().split('T')[0],
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
  let collectingLogline = false
  
  const strengths = []
  const weaknesses = []
  const summary = []
  const scoreNotes = {}
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lowerLine = line.toLowerCase()
    
    // Parse header info
    if (line.includes('HAWCO PRODUCTIONS') && line.includes('SCRIPT ASSESSMENT')) {
      const readerMatch = line.match(/Reader:\s*(\w+)/i)
      if (readerMatch) result.reader = readerMatch[1]
      
      const dateMatch = line.match(/Date:\s*(.+?)(?:\s*$|\s+\w)/i)
      if (dateMatch) {
        const dateStr = dateMatch[1].trim()
        // Try to parse date
        const parsed = new Date(dateStr)
        if (!isNaN(parsed.getTime())) {
          result.dateRead = parsed.toISOString().split('T')[0]
        }
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
      if (format) result.format = format
      continue
    }
    if (line === 'Source' && i + 1 < lines.length) {
      const source = lines[++i].trim()
      if (source) result.source = source
      continue
    }
    if (line === 'Draft Date' && i + 1 < lines.length) {
      const draftDate = lines[++i].trim()
      if (draftDate && draftDate !== '??') result.draftDate = draftDate
      continue
    }
    
    // Parse logline
    if (lowerLine === 'logline:') {
      collectingLogline = true
      continue
    }
    if (collectingLogline && line && !line.includes('THE SCORECARD')) {
      if (!result.logline) result.logline = line
      else result.logline += ' ' + line
    }
    if (line.includes('THE SCORECARD')) {
      collectingLogline = false
      currentSection = 'scorecard'
      continue
    }
    
    // Parse scorecard
    if (currentSection === 'scorecard') {
      const categories = ['Concept', 'Characters', 'Structure', 'Dialogue', 'Market Fit']
      if (categories.includes(line)) {
        scoreCategory = line.toLowerCase().replace(' ', '')
        // Next line should be score
        if (i + 1 < lines.length) {
          const scoreLine = lines[++i].trim()
          const score = parseFloat(scoreLine)
          if (!isNaN(score)) {
            const key = 'score' + line.replace(' ', '')
            result[key] = score
          }
        }
        // Next line should be notes
        if (i + 1 < lines.length) {
          const noteLine = lines[++i].trim()
          if (noteLine && !categories.includes(noteLine) && noteLine !== 'Total') {
            const noteKey = 'notes' + line.replace(' ', '')
            result[noteKey] = noteLine
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
    if (lowerLine.includes('strengths')) {
      inStrengths = true
      inWeaknesses = false
      inSummary = false
      continue
    }
    if (lowerLine.includes('weaknesses')) {
      inStrengths = false
      inWeaknesses = true
      inSummary = false
      continue
    }
    if (lowerLine === 'summary' || lowerLine.includes('summary:')) {
      inStrengths = false
      inWeaknesses = false
      inSummary = true
      continue
    }
    
    // Check for verdict
    if (lowerLine.includes('verdict')) {
      inStrengths = false
      inWeaknesses = false
      inSummary = false
      // Look for verdict in next few lines
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const verdictLine = lines[j].trim().toUpperCase()
        if (verdictLine.includes('RECOMMEND')) {
          result.verdict = 'RECOMMEND'
          break
        } else if (verdictLine.includes('CONSIDER')) {
          result.verdict = 'CONSIDER'
          break
        } else if (verdictLine.includes('PASS')) {
          result.verdict = 'PASS'
          break
        }
      }
      continue
    }
    
    // Collect content
    if (inStrengths && line && !line.startsWith('-') && !line.startsWith('•') && !line.startsWith('[')) {
      if (line) strengths.push(line)
    } else if (inStrengths && (line.startsWith('-') || line.startsWith('•'))) {
      strengths.push(line.substring(1).trim())
    }
    
    if (inWeaknesses && line && !line.startsWith('-') && !line.startsWith('•') && !line.startsWith('[')) {
      if (line) weaknesses.push(line)
    } else if (inWeaknesses && (line.startsWith('-') || line.startsWith('•'))) {
      weaknesses.push(line.substring(1).trim())
    }
    
    if (inSummary && line && !lowerLine.includes('verdict')) {
      if (line) summary.push(line)
    }
  }
  
  // Set collected fields
  if (strengths.length > 0) result.strengths = strengths.filter(s => s.trim()).join('\n')
  if (weaknesses.length > 0) result.weaknesses = weaknesses.filter(s => s.trim()).join('\n')
  if (summary.length > 0) result.summary = summary.filter(s => s.trim()).join('\n')
  
  // Calculate total score
  const scores = [
    result.scoreConcept,
    result.scoreCharacters,
    result.scoreStructure,
    result.scoreDialogue,
    result.scoreMarketFit,
  ].filter(s => typeof s === 'number')
  
  if (scores.length > 0) {
    result.scoreTotal = scores.reduce((a, b) => a + b, 0)
  }
  
  // Default verdict if not found
  if (!result.verdict) result.verdict = 'PASS'
  
  return result
}

async function importCoverage() {
  const downloadsDir = '/tmp/openclaw/downloads'
  const files = fs.readdirSync(downloadsDir).filter(f => f.endsWith('_Coverage.txt'))
  
  console.log(`Found ${files.length} coverage files to import`)
  console.log(`Using API: ${API_URL}`)
  
  for (const file of files) {
    const filePath = path.join(downloadsDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    
    console.log(`\nProcessing: ${file}`)
    
    try {
      const parsed = parseCoverageFile(content, file)
      
      console.log(`  Title: ${parsed.title}`)
      console.log(`  Writer: ${parsed.writer}`)
      console.log(`  Verdict: ${parsed.verdict}`)
      
      // Send to API
      const response = await fetch(`${API_URL}/api/coverage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`  ✓ Imported successfully (ID: ${data.id})`)
      } else {
        const error = await response.text()
        console.log(`  ✗ Failed: ${error}`)
      }
    } catch (error) {
      console.error(`  ✗ Error:`, error.message)
    }
  }
  
  console.log('\nImport complete!')
}

importCoverage().catch(console.error)
