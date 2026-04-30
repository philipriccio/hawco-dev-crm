import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

// Parse CSV with support for quoted fields
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  // Parse header
  const headers = parseCSVLine(lines[0])
  
  // Parse data rows
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || ''
    })
    rows.push(row)
  }
  
  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  
  return result
}

// Map Google Contacts CSV columns to our schema
function mapGoogleContact(row: Record<string, string>): {
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  company: string | null
} | null {
  // Google Contacts export has these columns:
  // Name, Given Name, Additional Name, Family Name, Yomi Name, Given Name Yomi, etc.
  // E-mail 1 - Type, E-mail 1 - Value, E-mail 2 - Type, E-mail 2 - Value
  // Phone 1 - Type, Phone 1 - Value
  // Organization 1 - Name, Organization 1 - Title
  // Notes

  const name = row['Name'] || 
               `${row['Given Name'] || ''} ${row['Family Name'] || ''}`.trim()
  
  if (!name) return null

  const email = row['E-mail 1 - Value'] || row['Email'] || row['email'] || null
  const phone = row['Phone 1 - Value'] || row['Phone'] || row['phone'] || null
  const notes = row['Notes'] || row['notes'] || null
  const company = row['Organization 1 - Name'] || row['Organization'] || row['Company'] || null

  return { name, email, phone, notes, company }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const { csv } = await request.json()
    
    if (!csv) {
      return NextResponse.json(
        { imported: 0, errors: ['No CSV data provided'] },
        { status: 400 }
      )
    }

    const rows = parseCSV(csv)
    
    if (rows.length === 0) {
      return NextResponse.json(
        { imported: 0, errors: ['No data rows found in CSV'] },
        { status: 400 }
      )
    }

    const errors: string[] = []
    let imported = 0

    for (const row of rows) {
      const mapped = mapGoogleContact(row)
      
      if (!mapped) {
        errors.push(`Skipped row with no name`)
        continue
      }

      try {
        // Check if contact with same email already exists
        if (mapped.email) {
          const existing = await prisma.contact.findFirst({
            where: { email: mapped.email }
          })
          if (existing) {
            errors.push(`Skipped ${mapped.name}: email ${mapped.email} already exists`)
            continue
          }
        }

        // Create the contact
        await prisma.contact.create({
          data: {
            type: 'OTHER', // Default type, can be updated later
            name: mapped.name,
            email: mapped.email,
            phone: mapped.phone,
            notes: mapped.notes,
          }
        })
        imported++
      } catch (err) {
        errors.push(`Failed to import ${mapped.name}: ${err}`)
      }
    }

    return NextResponse.json({ imported, errors: errors.slice(0, 10) }) // Limit errors shown
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { imported: 0, errors: ['Failed to process CSV file'] },
      { status: 500 }
    )
  }
}
